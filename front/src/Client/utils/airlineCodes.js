// Common IATA airline codes to airline names mapping
const AIRLINE_CODES = {
    // Major US Airlines
    AA: 'American Airlines',
    DL: 'Delta Air Lines',
    UA: 'United Airlines',
    WN: 'Southwest Airlines',
    B6: 'JetBlue Airways',
    AS: 'Alaska Airlines',
    NK: 'Spirit Airlines',
    F9: 'Frontier Airlines',
    HA: 'Hawaiian Airlines',
    G4: 'Allegiant Air',

    // Major International Airlines
    BA: 'British Airways',
    LH: 'Lufthansa',
    AF: 'Air France',
    KL: 'KLM Royal Dutch Airlines',
    IB: 'Iberia',
    AZ: 'ITA Airways',
    TP: 'TAP Air Portugal',
    SN: 'Brussels Airlines',
    OS: 'Austrian Airlines',
    LX: 'Swiss International Air Lines',
    SK: 'SAS Scandinavian Airlines',
    FI: 'Icelandair',
    AY: 'Finnair',
    LO: 'LOT Polish Airlines',
    OK: 'Czech Airlines',
    RO: 'TAROM',
    SU: 'Aeroflot',
    TK: 'Turkish Airlines',
    QR: 'Qatar Airways',
    EK: 'Emirates',
    EY: 'Etihad Airways',
    SV: 'Saudia',
    KU: 'Kuwait Airways',
    GF: 'Gulf Air',
    MS: 'EgyptAir',
    ET: 'Ethiopian Airlines',
    KQ: 'Kenya Airways',
    SA: 'South African Airways',
    AI: 'Air India',

    // Israeli Airlines
    LY: 'El Al Israel Airlines',
    '6H': 'Israir Airlines',
    IZ: 'Arkia Israeli Airlines',

    // Asian Airlines
    '8Z': 'Wings of Lebanon',
    '9W': 'Jet Airways',
    '6E': 'IndiGo',
    SG: 'SpiceJet',
    CA: 'Air China',
    MU: 'China Eastern Airlines',
    CZ: 'China Southern Airlines',
    HU: 'Hainan Airlines',
    '3U': 'Sichuan Airlines',
    MF: 'Xiamen Airlines',
    FM: 'Shanghai Airlines',
    NH: 'All Nippon Airways',
    JL: 'Japan Airlines',
    KE: 'Korean Air',
    OZ: 'Asiana Airlines',
    TG: 'Thai Airways',
    VN: 'Vietnam Airlines',
    PR: 'Philippine Airlines',
    MH: 'Malaysia Airlines',
    SQ: 'Singapore Airlines',
    GA: 'Garuda Indonesia',
    CX: 'Cathay Pacific',
    BR: 'EVA Air',
    CI: 'China Airlines',

    // Australian & Pacific Airlines
    QF: 'Qantas',
    NZ: 'Air New Zealand',
    VA: 'Virgin Australia',
    JQ: 'Jetstar Airways',
    TT: 'Tiger Airways Australia',
    TZ: 'Scoot',
    TR: 'Tigerair',

    // Canadian Airlines
    AC: 'Air Canada',
    WS: 'WestJet',
    PD: 'Porter Airlines',
    F8: 'Flair Airlines',
    TS: 'Air Transat',
    RV: 'Air Canada Rouge',
    WG: 'Sunwing Airlines',
    WO: 'Swoop',

    // Middle East & South Asian Airlines
    Y9: 'Kish Air',
    IR: 'Iran Air',
    PK: 'Pakistan International Airlines',
    BG: 'Biman Bangladesh Airlines',
    UL: 'SriLankan Airlines',

    // AirAsia Group
    AK: 'AirAsia',
    FD: 'Thai AirAsia',
    QZ: 'Indonesia AirAsia',
    D7: 'AirAsia X',
    Z2: 'AirAsia Zest',
    I5: 'AirAsia India',
    QJ: 'AirAsia Japan',
    XJ: 'Thai AirAsia X',
    XT: 'Indonesia AirAsia X',
    XZ: 'AirAsia X Thailand',

    // European Low-Cost Carriers
    XQ: 'SunExpress',
    PC: 'Pegasus Airlines',
    VY: 'Vueling',
    FR: 'Ryanair',
    U2: 'easyJet',
    DY: 'Norwegian Air Shuttle',
    H4: 'HiSky',

    // Russian Airlines
    S7: 'S7 Airlines',
    U6: 'Ural Airlines',
    UT: 'UTair Aviation',
    FV: 'Rossiya Airlines',
    DP: 'Pobeda',
    N4: 'Nordwind Airlines',
    I4: 'I-Fly',
    EO: 'Pegas Fly',
    Y7: 'NordStar',
    '5N': 'Smartavia',
    D2: 'Severstal Air Company',
    R3: 'Yakutia Airlines',
    ZF: 'Azur Air',
};

/**
 * Convert IATA airline code to airline name
 * @param {string} code - IATA airline code (e.g., 'B6', 'AA')
 * @returns {string} - Airline name or the original code if not found
 */
export function getAirlineName(code) {
    if (!code) return 'Unknown Airline';

    const airlineName = AIRLINE_CODES[code.toUpperCase()];
    return airlineName || code; // Return the code if no mapping found
}

/**
 * Get airline name with fallback to code
 * @param {string} code - IATA airline code
 * @returns {string} - Airline name or code
 */
export function formatAirline(code) {
    const name = getAirlineName(code);
    return name === code ? `${code} Airlines` : name;
}

export default AIRLINE_CODES;
