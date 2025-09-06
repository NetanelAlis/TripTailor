import json
import os
from typing import List, Dict, Any
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.conditions import Key, Attr
from openai import OpenAI

openAIKey = os.environ.get("OPENAI_API_KEY")
dynamodb = boto3.resource("dynamodb")
chat_history_table = dynamodb.Table("chat-history")
trips_table = dynamodb.Table("trip")
flights_table = dynamodb.Table("Flights")
hotels_table = dynamodb.Table("Hotels")


def _cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Content-Type",
    }


def _bad_request(msg: str):
    return {
        "statusCode": 400,
        "headers": _cors_headers(),
        "body": json.dumps({"error": msg}),
    }


def _server_error(msg: str):
    return {
        "statusCode": 500,
        "headers": _cors_headers(),
        "body": json.dumps({"error": msg}),
    }


def _query_chat_history(user_id: str, chat_id: str) -> List[Dict[str, Any]]:
    """Return full conversation history for a user/chat ordered by timestamp asc."""
    resp = chat_history_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id),
        FilterExpression=Attr("chat_id").eq(str(chat_id)),
        ScanIndexForward=True,
    )
    return resp.get("Items", [])


# Combined analysis: extract trip metadata AND decide relevance based on full history and compact items
def _analyze_history_and_decide(
    history_items: List[Dict[str, Any]],
    compact_flights: List[Dict[str, Any]],
    compact_hotels: List[Dict[str, Any]],
) -> Dict[str, Any]:
    lines = []
    for item in history_items[-60:]:
        role = item.get("role", "assistant")
        content = (item.get("content") or "")[:2000]
        lines.append(f"{role}: {content}")
    transcript = "\n".join(lines)

    system = (
        "You are a helpful assistant for trip planning.\n"
        "Your task is to manage a 'trip card' - a database record that represents the user's evolving trip plan.\n"
        "This trip card contains destinations, dates, a summary, and lists of flights/hotels the user has seen.\n"
        "Based on the chat transcript and existing flight/hotel data, you need to update this trip card record.\n\n"
        "return a single JSON with:\n"
        "- destinations: array of destination cities/countries visited during the trip.\n"
        "  Rules: Do NOT include origin or layovers; only true end-destinations. Append new ones; ignore return origins.\n"
        "- dates: a single concise string if known, else ''. always write dates in this format: Mar 15, 2024 - Mar 25, 2024(example)\n"
        "- summary: 2-3 sentence human summary. Address the user as 'you'.\n"
        "- flight_decisions: [{id, decision}] where decision is 'keep' or 'remove' for each EXISTING flight.\n"
        "- hotel_decisions: [{id, decision}] where decision is 'keep' or 'remove' for each EXISTING hotel.\n"
        "  Decision rules for existing flights/hotels:\n"
        "  - Default to 'keep' unless you have clear evidence the user dislikes the item.\n"
        "  - Only 'remove' if the user explicitly expressed dissatisfaction, dislike, or rejection.\n"
        "  - Look for phrases like 'I don't like', 'too expensive', 'bad timing', 'prefer something else', etc.\n"
        "  - Keep items the user showed interest in or didn't comment on negatively.\n"
        "  - When in doubt, keep the item - removal should be based on clear user feedback only.\n"
        "Note: You are managing the user's trip card record - filtering existing items based on user feedback\n"
        "and updating trip metadata (destinations, dates, summary) to reflect the current conversation.\n"
        "Do not include any text outside JSON.\n"
    )

    user_payload = {
        "transcript": transcript,
        "existing_items": {
            "flights": compact_flights,
            "hotels": compact_hotels,
        },
        "instructions": {
            "destinations_rules": [
                "Exclude origin and layovers",
                "Include only end-destinations",
                "Append new destinations without removing past ones",
                "Ignore return origins",
                "If destination is uncertain, omit for now",
                "Cities preferred; countries allowed if touring",
            ],
            "dates_rules": [
                "If multiple dates mentioned, distinguish between changes in dates, add/remove dates, don't combine them",
                "For example: don't say 'Traveling from Dec 7th to Dec 10th and 12th', if the user planned for Dec 7th-10th and then Dec 7th to Dec 10th is a change, and then decides to extend his trip until Dec 12th, dec 10th-12th are the new dates",
                "Similarly, if the user originally planned for Dec 7th-10th, then says he needs to change his dates to Jan 12th-14th, jan 12th-14th are the new dates",
                "Always make sure to include the most updated trip dates as your overall date span",
                "Always include full date range, don't use 'around', 'sometime', etc. If the date is uncertain, omit for now.",
            ],
        },
    }

    client = OpenAI(api_key=openAIKey)
    completion = client.chat.completions.create(
        model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
        ],
        max_tokens=900,
        temperature=0.2,
    )
    raw = completion.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except Exception:
        try:
            start = raw.find("{"); end = raw.rfind("}")
            data = json.loads(raw[start:end+1]) if start != -1 and end != -1 else {}
        except Exception:
            data = {}

    # Normalize output
    destinations = data.get("destinations") or []
    if not isinstance(destinations, list):
        destinations = [str(destinations)]
    dates = data.get("dates") or ""
    summary = data.get("summary") or ""
    flight_decisions = data.get("flight_decisions") or []
    hotel_decisions = data.get("hotel_decisions") or []

    return {
        "destinations": destinations,
        "dates": str(dates),
        "summary": str(summary),
        "flight_decisions": flight_decisions,
        "hotel_decisions": hotel_decisions,
        "_raw": raw,
    }

def _upsert_trip(user_id: str, chat_id: str, trip_data: Dict[str, Any], flights: List[str], hotels: List[str], last_modified: str):
    item = {
        "UserAndChatID": f"{user_id}:{chat_id}",
        "last modified": last_modified,
        "destinations": trip_data.get("destinations", []),
        "dates": trip_data.get("dates", ""),
        "summary": trip_data.get("summary", ""),
        "flight_tuples": trip_data.get("flight_tuples", []),
        "hotel_tuples": trip_data.get("hotel_tuples", []),
    }
    trips_table.put_item(Item=item)


def _fetch_compact_flight(f_id: str) -> Dict[str, Any]:
    try:
        # Query by flightId since table has composite key (flightId + timestamp)
        res = flights_table.query(
            KeyConditionExpression=Key("flightId").eq(f_id),
            ScanIndexForward=False,  # Get most recent
            Limit=1
        )
        items = res.get("Items", [])
        root = items[0] if items else {}
        item = root.get("flightDetails", {})
        if not item:
            return {"id": f_id, "airline": "", "flight_number": "", "route": "", "departure": "", "arrival": "", "duration": "", "price": ""}

        itinerary = (item.get("itineraries") or [{}])[0]
        segments = itinerary.get("segments", [])
        price_info = item.get("price", {})
        total_price = price_info.get("total", "")
        currency = price_info.get("currency", "")

        airline = (item.get("validatingAirlineCodes") or [None])
        airline_code = airline[0] if airline else None
        if not airline_code and segments:
            airline_code = segments[0].get("carrierCode")

        # Flight number from first segment
        flight_number = ""
        if segments:
            first_seg = segments[0]
            flight_number = f"{first_seg.get('carrierCode','')}{first_seg.get('number','')}".strip()

        # Route string: origin -> layovers -> destination
        route_points = []
        if segments:
            route_points.append(segments[0].get("departure", {}).get("iataCode", ""))
            for seg in segments:
                arr = seg.get("arrival", {}).get("iataCode", "")
                if arr:
                    route_points.append(arr)
        route = " -> ".join([p for p in route_points if p])

        # Departure/arrival timestamps
        departure_iso = segments[0].get("departure", {}).get("at", "") if segments else ""
        arrival_iso = segments[-1].get("arrival", {}).get("at", "") if segments else ""

        # Duration humanized
        dur = itinerary.get("duration", "")
        if dur:
            dur = dur.replace("PT", "").replace("H", "h ").replace("M", "m").strip()

        price = f"{total_price} {currency}".strip()

        return {
            "id": f_id,
            "airline": airline_code or "",
            "flight_number": flight_number,
            "route": route,
            "departure": departure_iso,
            "arrival": arrival_iso,
            "duration": dur,
            "price": price,
        }
    except Exception:
        return {"id": f_id, "airline": "", "flight_number": "", "route": "", "departure": "", "arrival": "", "duration": "", "price": ""}


def _fetch_compact_hotel(h_id: str) -> Dict[str, Any]:
    try:
        # Query by hotelOfferId since table has composite key (hotelOfferId + timestamp)
        res = hotels_table.query(
            KeyConditionExpression=Key("hotelOfferId").eq(h_id),
            ScanIndexForward=False,  # Get most recent
            Limit=1
        )
        items = res.get("Items", [])
        root = items[0] if items else {}
        item = root.get("hotelOffersDetails", {})
        if not item:
            return {"id": h_id, "name": "", "location": "", "check_in": "", "check_out": "", "nights": "", "price_per_night": "", "overall_price": ""}

        hotel_info = item.get("hotel", {})
        offers = item.get("offers", [])
        first_offer = offers[0] if offers else {}
        price_info = first_offer.get("price", {})
        total_price = price_info.get("total", "")
        currency = price_info.get("currency", "")
        check_in = first_offer.get("checkInDate", "")
        check_out = first_offer.get("checkOutDate", "")

        name = hotel_info.get("name", "")
        address = hotel_info.get("address", {}) or {}
        city = address.get("cityName") or hotel_info.get("cityCode", "")
        country = address.get("countryCode", "")
        location = ", ".join([p for p in [city, country] if p])

        # Nights and per-night price
        nights = ""
        price_per_night = ""
        try:
            if check_in and check_out:
                from datetime import date
                d_in = date.fromisoformat(check_in)
                d_out = date.fromisoformat(check_out)
                delta = (d_out - d_in).days
                if delta > 0:
                    nights = str(delta)
                    try:
                        total_float = float(total_price)
                        price_per_night = f"{round(total_float / delta, 2)} {currency}".strip()
                    except Exception:
                        price_per_night = ""
        except Exception:
            nights = ""

        overall_price = f"{total_price} {currency}".strip()

        return {
            "id": h_id,
            "name": name,
            "location": location,
            "check_in": check_in,
            "check_out": check_out,
            "nights": nights,
            "price_per_night": price_per_night,
            "overall_price": overall_price,
        }
    except Exception:
        return {"id": h_id, "name": "", "location": "", "check_in": "", "check_out": "", "nights": "", "price_per_night": "", "overall_price": ""}


def _apply_llm_decisions_to_ids(initial_flight_ids: List[str], initial_hotel_ids: List[str], decisions: Dict[str, Any]):
    # Start from the provided baseline sets (should already include candidates + existing)
    flight_ids = {str(x) for x in (initial_flight_ids or [])}
    hotel_ids = {str(x) for x in (initial_hotel_ids or [])}

    for ent in decisions.get("flight_decisions", []):
        _id = str(ent.get("id")); action = (ent.get("decision") or "").lower()
        if not _id:
            continue
        if action == "remove":
            flight_ids.discard(_id)
        else:  # add or keep
            flight_ids.add(_id)

    for ent in decisions.get("hotel_decisions", []):
        _id = str(ent.get("id")); action = (ent.get("decision") or "").lower()
        if not _id:
            continue
        if action == "remove":
            hotel_ids.discard(_id)
        else:
            hotel_ids.add(_id)

    return list(flight_ids), list(hotel_ids)


def _coerce_num(v, default=0):
    try:
        if isinstance(v, (int, float)):
            return v
        if isinstance(v, str):
            return float(v) if "." in v else int(v)
        return default
    except Exception:
        return default


def _coerce_str(v, default=""):
    try:
        if isinstance(v, str):
            return v
        return json.dumps(v) if v is not None else default
    except Exception:
        return default


def _infer_flight_status_from_item(item: Dict[str, Any], existing_status: str = None) -> str:
    # If we already have a status from the trip table, respect it (especially "booked")
    if existing_status and existing_status.lower() == "booked":
        return "booked"
    
    # booked if an explicit flag exists
    for key in ("booked", "isBooked", "reservationId"):
        if str(item.get(key, "")).lower() in ("1", "true") or item.get(key):
            return "booked"

    # Check for bookable seats (more reliable than lastTicketingDate)
    seats = _coerce_num(item.get("numberOfBookableSeats"), 0)
    
    # Check if flight has pricing information (indicates it's bookable)
    has_pricing = bool(item.get("price") or item.get("travelerPricings"))
    
    # Check if flight has valid itineraries and segments
    has_valid_routing = bool(
        item.get("itineraries") and 
        any(len(it.get("segments", [])) > 0 for it in item.get("itineraries", []))
    )
    
    # Determine status based on available information
    if seats > 0:
        return "available"
    elif has_pricing and has_valid_routing:
        return "available"  # Likely available even without seat count
    else:
        return "unavailable"


def _infer_hotel_status_from_item(item: Dict[str, Any], existing_status: str = None) -> str:
    # If we already have a status from the trip table, respect it (especially "booked")
    if existing_status and existing_status.lower() == "booked":
        return "booked"
    
    # booked if explicit flag exists
    for key in ("booked", "isBooked", "reservationId"):
        if str(item.get(key, "")).lower() in ("1", "true") or item.get(key):
            return "booked"
    avail = item.get("available")
    if isinstance(avail, bool):
        return "available" if avail else "unavailable"
    # Fallback: presence of offers
    has_offers = bool(item.get("offers") or item.get("offer"))
    return "available" if has_offers else "unavailable"


def lambda_handler(event, context):
    headers = _cors_headers()

    # Pre-flight CORS
    if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    # Accept both API Gateway/Function URL proxy events (body as JSON string)
    # and direct Lambda console tests (top-level JSON object)
    body = {}
    raw_body = event.get("body") if isinstance(event, dict) else None
    if isinstance(raw_body, (str, bytes)):
        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return _bad_request("Invalid JSON body")
    elif isinstance(event, dict):
        # Fallback: allow direct invocation with fields at the top level
        # Only adopt this if it looks like a direct test event
        candidate_keys = {"user_id", "chat_id", "flight_ids", "hotel_ids"}
        if any(k in event for k in candidate_keys):
            body = {k: event.get(k) for k in candidate_keys if k in event}
        else:
            body = {}

    user_id = (body.get("user_id") or "").strip()
    chat_id = (body.get("chat_id") or "").strip()
    if not user_id or not chat_id:
        return _bad_request("user_id and chat_id are required")

    flights = body.get("flight_ids")  # optional list
    hotels = body.get("hotel_ids")    # optional list
    
    # New: Support for status information
    flight_statuses = body.get("flight_statuses", {})  # {flight_id: status} mapping
    hotel_statuses = body.get("hotel_statuses", {})    # {hotel_id: status} mapping
    
    # New: Support for ID mapping (originalId -> newId) for replacement
    flight_id_mapping = body.get("flight_id_mapping", {})  # {original_id: new_id} mapping
    hotel_id_mapping = body.get("hotel_id_mapping", {})    # {original_id: new_id} mapping
    
    if flights is not None and not isinstance(flights, list):
        return _bad_request("flight_ids must be a list if provided")
    if hotels is not None and not isinstance(hotels, list):
        return _bad_request("hotel_ids must be a list if provided")
    if not isinstance(flight_statuses, dict):
        return _bad_request("flight_statuses must be a dict if provided")
    if not isinstance(hotel_statuses, dict):
        return _bad_request("hotel_statuses must be a dict if provided")
    if not isinstance(flight_id_mapping, dict):
        return _bad_request("flight_id_mapping must be a dict if provided")
    if not isinstance(hotel_id_mapping, dict):
        return _bad_request("hotel_id_mapping must be a dict if provided")

    try:
        history_items = _query_chat_history(user_id, chat_id)
    except Exception as e:
        return _server_error(f"Failed to read history: {str(e)}")

    # Log inputs
    print("[update_trip_card] INPUT user_id:", user_id, "chat_id:", chat_id)
    print("[update_trip_card] INPUT candidate flight_ids:", flights, "hotel_ids:", hotels)
    print("[update_trip_card] INPUT flight_statuses:", flight_statuses, "hotel_statuses:", hotel_statuses)
    print("[update_trip_card] INPUT flight_id_mapping:", flight_id_mapping, "hotel_id_mapping:", hotel_id_mapping)
    print("[update_trip_card] history_items count:", len(history_items))

    # Read current trip record to support add/keep/remove decisions
    try:
        trip_key = {"UserAndChatID": f"{user_id}:{chat_id}"}
        current_item = trips_table.get_item(Key=trip_key).get("Item", {})
        existing_flights_raw = current_item.get("flight_tuples") or current_item.get("flights") or []
        existing_hotels_raw = current_item.get("hotel_tuples") or current_item.get("hotels") or []
    except Exception:
        existing_flights_raw, existing_hotels_raw = [], []

    # Normalize stored tuples which may be list-of-lists [[id,status],...] or list of dicts
    def _normalize_tuples_to_dicts(items):
        out = []
        if not isinstance(items, list):
            return out
        for it in items:
            try:
                if isinstance(it, dict) and it.get("id") is not None:
                    out.append({"id": str(it.get("id")), "status": str(it.get("status", "available"))})
                elif isinstance(it, (list, tuple)) and len(it) >= 1:
                    _id = str(it[0])
                    _status = str(it[1]) if len(it) > 1 and it[1] is not None else "available"
                    out.append({"id": _id, "status": _status})
            except Exception:
                continue
        return out

    existing_flights = _normalize_tuples_to_dicts(existing_flights_raw)
    existing_hotels = _normalize_tuples_to_dicts(existing_hotels_raw)

    # Separate existing vs new items for different handling
    existing_f_ids = [str(x.get("id")) for x in existing_flights if isinstance(x, dict) and x.get("id")]
    existing_h_ids = [str(x.get("id")) for x in existing_hotels if isinstance(x, dict) and x.get("id")]
    candidate_f_ids = [str(fid) for fid in (flights or [])]
    candidate_h_ids = [str(hid) for hid in (hotels or [])]
    
    print("[update_trip_card] existing_f_ids:", existing_f_ids)
    print("[update_trip_card] existing_h_ids:", existing_h_ids) 
    print("[update_trip_card] new candidate flight_ids:", candidate_f_ids)
    print("[update_trip_card] new candidate hotel_ids:", candidate_h_ids)
    
    # Compact fetch ONLY existing items for LLM decisions (user has seen these)
    existing_compact_flights = [_fetch_compact_flight(fid) for fid in existing_f_ids]
    existing_compact_hotels = [_fetch_compact_hotel(hid) for hid in existing_h_ids]

    # LLM decides only on existing items (user has had time to give feedback)
    combined = _analyze_history_and_decide(history_items, existing_compact_flights, existing_compact_hotels)
    print("[update_trip_card] combined raw:", combined.get("_raw", ""))
    trip_data = {k: combined.get(k) for k in ("destinations", "dates", "summary")}
    decisions = {
        "flight_decisions": combined.get("flight_decisions", []),
        "hotel_decisions": combined.get("hotel_decisions", []),
    }
    print("[update_trip_card] extracted trip_data:", json.dumps(trip_data))
    print("[update_trip_card] raw decisions:", json.dumps(decisions))

    # Apply LLM decisions only to existing items
    kept_existing_f_ids, kept_existing_h_ids = _apply_llm_decisions_to_ids(existing_f_ids, existing_h_ids, decisions)
    
    # Auto-add new candidate items (user hasn't seen them yet, so add them for user review)
    final_f_ids = list({*kept_existing_f_ids, *candidate_f_ids})
    final_h_ids = list({*kept_existing_h_ids, *candidate_h_ids})
    
    # Apply ID mapping: replace original IDs with new IDs
    if flight_id_mapping:
        print(f"[update_trip_card] Applying flight ID mapping: {flight_id_mapping}")
        final_f_ids = [flight_id_mapping.get(fid, fid) for fid in final_f_ids]
        # Also update existing flights list for status preservation
        for existing_flight in existing_flights:
            if isinstance(existing_flight, dict) and existing_flight.get("id") in flight_id_mapping:
                old_id = existing_flight["id"]
                new_id = flight_id_mapping[old_id]
                existing_flight["id"] = new_id
                print(f"[update_trip_card] Mapped existing flight {old_id} -> {new_id}")
    
    if hotel_id_mapping:
        print(f"[update_trip_card] Applying hotel ID mapping: {hotel_id_mapping}")
        final_h_ids = [hotel_id_mapping.get(hid, hid) for hid in final_h_ids]
        # Also update existing hotels list for status preservation
        for existing_hotel in existing_hotels:
            if isinstance(existing_hotel, dict) and existing_hotel.get("id") in hotel_id_mapping:
                old_id = existing_hotel["id"]
                new_id = hotel_id_mapping[old_id]
                existing_hotel["id"] = new_id
                print(f"[update_trip_card] Mapped existing hotel {old_id} -> {new_id}")
    
    print("[update_trip_card] LLM decisions on existing:", json.dumps({
        "flight_decisions": decisions.get("flight_decisions", []),
        "hotel_decisions": decisions.get("hotel_decisions", []),
    }))
    print("[update_trip_card] kept_existing_f_ids:", kept_existing_f_ids)
    print("[update_trip_card] kept_existing_h_ids:", kept_existing_h_ids)
    print("[update_trip_card] final_f_ids (after mapping):", final_f_ids)
    print("[update_trip_card] final_h_ids (after mapping):", final_h_ids)

    # Infer statuses from DB items (LLM does not decide statuses)
    # Upgrade/override status for any item we keep, but preserve existing statuses from trip table
    f_idx = {fid: {"id": fid, "status": "available"} for fid in final_f_ids}
    h_idx = {hid: {"id": hid, "status": "available"} for hid in final_h_ids}
    
    # First, preserve existing statuses from trip table (especially "booked")
    for existing_flight in existing_flights:
        if isinstance(existing_flight, dict) and existing_flight.get("id") in f_idx:
            existing_status = existing_flight.get("status", "available")
            if existing_status.lower() == "booked":
                f_idx[existing_flight["id"]]["status"] = "booked"
                print(f"[update_trip_card] Preserving existing 'booked' status for flight {existing_flight['id']}")
    
    for existing_hotel in existing_hotels:
        if isinstance(existing_hotel, dict) and existing_hotel.get("id") in h_idx:
            existing_status = existing_hotel.get("status", "available")
            if existing_status.lower() == "booked":
                h_idx[existing_hotel["id"]]["status"] = "booked"
                print(f"[update_trip_card] Preserving existing 'booked' status for hotel {existing_hotel['id']}")
    
    # Second, apply provided statuses from the request (these override existing statuses)
    for fid, provided_status in flight_statuses.items():
        if fid in f_idx and provided_status:
            f_idx[fid]["status"] = str(provided_status)
            print(f"[update_trip_card] Applied provided status '{provided_status}' for flight {fid}")
    
    for hid, provided_status in hotel_statuses.items():
        if hid in h_idx and provided_status:
            h_idx[hid]["status"] = str(provided_status)
            print(f"[update_trip_card] Applied provided status '{provided_status}' for hotel {hid}")
    
    # Now infer statuses for items that don't have a status yet (using "available" as default)
    for fid in list(f_idx.keys()):
        # Skip if we already have a meaningful status
        if f_idx[fid]["status"] not in ["available", "unavailable"]:
            continue
            
        try:
            res = flights_table.query(
                KeyConditionExpression=Key("flightId").eq(fid),
                ScanIndexForward=False,
                Limit=1
            )
            items = res.get("Items", [])
            db_root = items[0] if items else {}
            db = db_root.get("flightDetails", {})
            f_idx[fid]["status"] = _infer_flight_status_from_item(db, f_idx[fid]["status"])
        except Exception:
            pass
    
    for hid in list(h_idx.keys()):
        # Skip if we already have a meaningful status
        if h_idx[hid]["status"] not in ["available", "unavailable"]:
            continue
            
        try:
            res = hotels_table.query(
                KeyConditionExpression=Key("hotelOfferId").eq(hid),
                ScanIndexForward=False,
                Limit=1
            )
            items = res.get("Items", [])
            db_root = items[0] if items else {}
            db = db_root.get("hotelOffersDetails", {})
            h_idx[hid]["status"] = _infer_hotel_status_from_item(db, h_idx[hid]["status"])
        except Exception:
            pass
    updated_flights = list(f_idx.values())
    updated_hotels = list(h_idx.values())
    print("[update_trip_card] updated_flights (dicts):", updated_flights)
    print("[update_trip_card] updated_hotels (dicts):", updated_hotels)

    # Upsert into trips table
    try:
        # Store tuple lists under canonical keys
        trip_data_to_write = dict(trip_data)
        # Convert to list-of-lists [[id,status], ...] for DynamoDB compatibility
        def _dicts_to_list_of_lists(items):
            out = []
            for it in items:
                _id = it.get("id") if isinstance(it, dict) else None
                if _id is None:
                    continue
                _status = it.get("status", "available") if isinstance(it, dict) else "available"
                out.append([str(_id), str(_status)])
            return out

        trip_data_to_write["flight_tuples"] = _dicts_to_list_of_lists(updated_flights)
        trip_data_to_write["hotel_tuples"] = _dicts_to_list_of_lists(updated_hotels)
        last_modified = datetime.now(timezone.utc).isoformat()
        print("[update_trip_card] writing item:", json.dumps({
            "UserAndChatID": f"{user_id}:{chat_id}",
            "last modified": last_modified,
            "destinations": trip_data_to_write.get("destinations", []),
            "dates": trip_data_to_write.get("dates", ""),
            "summary": trip_data_to_write.get("summary", ""),
            "flight_tuples": trip_data_to_write.get("flight_tuples", []),
            "hotel_tuples": trip_data_to_write.get("hotel_tuples", []),
        }))
        _upsert_trip(user_id, chat_id, trip_data_to_write, flights, hotels, last_modified)
    except Exception as e:
        return _server_error(f"Failed to upsert trip: {str(e)}")

    return {
        "statusCode": 200,
        "headers": headers,
        "body": json.dumps({
            "success": True,
            "UserAndChatID": f"{user_id}:{chat_id}",
            "last_modified": last_modified,
        }),
    }
