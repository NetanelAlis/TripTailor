import React from 'react';
import { Badge } from '../ui/badge.jsx';
// Note: Base44 used a Checkbox component; we'll use a native input for now
import { Plane, CheckCircle, X } from 'lucide-react';
import { getAirlineName } from '../../utils/airlineCodes.js';
import {
    formatCurrency,
    convertToUserCurrency,
    getUserPreferredCurrency,
} from '../../utils/currencyConverter.js';

export default function FlightTable({
    flights,
    selectedFlights,
    onSelectionChange,
    onRemove,
}) {
    const handleFlightToggle = (flight, checked) => {
        if (checked) onSelectionChange([...selectedFlights, flight]);
        else
            onSelectionChange(
                selectedFlights.filter((f) => f.id !== flight.id)
            );
    };

    const isFlightSelected = (flightId) =>
        selectedFlights.some((f) => f.id === flightId);

    const handleSelectAll = (checked) => {
        if (checked) {
            // Select all non-booked flights
            const selectableFlights = flights.filter(
                (flight) => !flight.isBooked
            );
            onSelectionChange(selectableFlights);
        } else {
            // Deselect all flights
            onSelectionChange([]);
        }
    };

    const areAllFlightsSelected = () => {
        const selectableFlights = flights.filter((flight) => !flight.isBooked);
        return (
            selectableFlights.length > 0 &&
            selectableFlights.every((flight) => isFlightSelected(flight.id))
        );
    };

    const areSomeFlightsSelected = () => {
        const selectableFlights = flights.filter((flight) => !flight.isBooked);
        return (
            selectableFlights.some((flight) => isFlightSelected(flight.id)) &&
            !areAllFlightsSelected()
        );
    };

    return (
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] sm:min-w-0">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <input
                                    type="checkbox"
                                    checked={areAllFlightsSelected()}
                                    ref={(input) => {
                                        if (input) {
                                            input.indeterminate =
                                                areSomeFlightsSelected();
                                        }
                                    }}
                                    onChange={(e) =>
                                        handleSelectAll(e.target.checked)
                                    }
                                    className="h-4 w-4"
                                />
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Flight
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Route
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Time
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Price
                            </th>
                            <th className="text-left p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="text-right p-2 sm:p-4 text-xs font-semibold text-slate-600 uppercase tracking-wider w-12" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {flights.map((flight) => (
                            <tr
                                key={flight.id}
                                className={`hover:bg-slate-50 ${
                                    flight.isBooked ? 'bg-green-50' : ''
                                }`}
                            >
                                <td className="p-2 sm:p-4">
                                    <input
                                        type="checkbox"
                                        checked={isFlightSelected(flight.id)}
                                        onChange={(e) =>
                                            handleFlightToggle(
                                                flight,
                                                e.target.checked
                                            )
                                        }
                                        disabled={flight.isBooked}
                                        className={`h-4 w-4 ${
                                            flight.isBooked ? 'opacity-50' : ''
                                        }`}
                                    />
                                </td>
                                <td className="p-2 sm:p-4">
                                    <div className="flex items-center gap-2">
                                        <Plane className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="font-medium text-slate-800 text-xs sm:text-sm truncate">
                                                {getAirlineName(flight.airline)}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {flight.flightNumber}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                    <div className="min-w-0">
                                        <p className="text-slate-800 text-xs sm:text-sm">
                                            {flight.route ||
                                                'Route not available'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {flight.duration || ''}
                                        </p>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                    <div className="text-xs sm:text-sm">
                                        <p className="text-slate-800 whitespace-nowrap">
                                            {(() => {
                                                if (flight.departure) {
                                                    try {
                                                        const date = new Date(
                                                            flight.departure
                                                        );
                                                        if (
                                                            !isNaN(
                                                                date.getTime()
                                                            )
                                                        ) {
                                                            return date.toLocaleString(
                                                                'en-US',
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                }
                                                            );
                                                        }
                                                    } catch (e) {}
                                                }
                                                return 'Departure TBD';
                                            })()}
                                        </p>
                                        <p className="text-slate-500 whitespace-nowrap">
                                            {(() => {
                                                if (flight.arrival) {
                                                    try {
                                                        const date = new Date(
                                                            flight.arrival
                                                        );
                                                        if (
                                                            !isNaN(
                                                                date.getTime()
                                                            )
                                                        ) {
                                                            return `→ ${date.toLocaleString(
                                                                'en-US',
                                                                {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit',
                                                                }
                                                            )}`;
                                                        }
                                                    } catch (e) {}
                                                }
                                                return '';
                                            })()}
                                        </p>
                                    </div>
                                </td>
                                <td className="p-2 sm:p-4">
                                    <p className="font-semibold text-slate-800 text-sm sm:text-base">
                                        {flight.price &&
                                        flight.price !== 'Price TBD'
                                            ? (() => {
                                                  // Parse price string like "444.94 USD"
                                                  const priceMatch =
                                                      flight.price.match(
                                                          /^([\d,]+\.?\d*)\s+([A-Z]{3})$/
                                                      );
                                                  if (priceMatch) {
                                                      const amount = parseFloat(
                                                          priceMatch[1].replace(
                                                              /,/g,
                                                              ''
                                                          )
                                                      );
                                                      const currency =
                                                          priceMatch[2];
                                                      return formatCurrency(
                                                          convertToUserCurrency(
                                                              amount,
                                                              currency
                                                          ),
                                                          getUserPreferredCurrency()
                                                      );
                                                  }
                                                  return flight.price; // Fallback to original string
                                              })()
                                            : 'Price TBD'}
                                    </p>
                                </td>
                                <td className="p-2 sm:p-4">
                                    {flight.isBooked ? (
                                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs px-2 py-1">
                                            <CheckCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                            <span className="hidden sm:inline">
                                                Booked
                                            </span>
                                            <span className="sm:hidden">✓</span>
                                        </Badge>
                                    ) : (
                                        <Badge
                                            variant="outline"
                                            className="text-slate-600 text-xs px-2 py-1"
                                        >
                                            <span className="hidden sm:inline">
                                                Available
                                            </span>
                                            <span className="sm:hidden">
                                                Open
                                            </span>
                                        </Badge>
                                    )}
                                </td>
                                <td className="p-2 sm:p-4 text-right">
                                    {!flight.isBooked && (
                                        <button
                                            onClick={() => onRemove(flight.id)}
                                            className="p-2 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors touch-manipulation"
                                            title="Remove flight"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
