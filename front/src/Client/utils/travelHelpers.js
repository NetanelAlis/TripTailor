/**
 * Travel Data Helper Functions
 * Converts encoded travel industry codes to user-friendly names
 */

// Airport codes to full names
export const getAirportName = (iataCode) => {
    const airports = {
        // North America
        JFK: 'John F. Kennedy Intl. Airport',
        LAX: 'Los Angeles Intl. Airport',
        ONT: 'Ontario Intl. Airport',
        ORD: "O'Hare International Airport",
        ATL: 'Hartsfield-Jackson Atlanta',
        DFW: 'Dallas/Fort Worth Intl. Airport',
        DEN: 'Denver International Airport',
        BOS: 'Logan International Airport',
        MIA: 'Miami International Airport',
        SFO: 'San Francisco Intl. Airport',
        SEA: 'Seattle-Tacoma Intl. Airport',
        EWR: 'Newark Liberty Intl. Airport',
        CLT: 'Charlotte Douglas Intl. Airport',
        PHX: 'Phoenix Sky Harbor Intl. Airport',
        MCO: 'Orlando International Airport',
        LAS: 'Harry Reid International Airport',
        IAD: 'Washington Dulles Intl. Airport',
        BWI: 'Baltimore/Washington Intl. Airport',
        MSP: 'Minneapolis-St. Paul Intl. Airport',
        DTW: 'Detroit Metropolitan Wayne County Airport',
        PHL: 'Philadelphia International Airport',
        LGA: 'LaGuardia Airport',
        YYZ: 'Toronto Pearson Intl. Airport',
        YVR: 'Vancouver International Airport',
        MEX: 'Mexico City International Airport',

        // Europe
        LHR: 'London Heathrow Airport',
        LGW: 'London Gatwick Airport',
        STN: 'London Stansted Airport',
        CDG: 'Charles de Gaulle Airport',
        ORY: 'Paris Orly Airport',
        FRA: 'Frankfurt Airport',
        MUC: 'Munich Airport',
        AMS: 'Amsterdam Schiphol Airport',
        MAD: 'Madrid-Barajas Airport',
        BCN: 'Barcelona-El Prat Airport',
        FCO: 'Rome Fiumicino Airport',
        MXP: 'Milan Malpensa Airport',
        ZUR: 'Zurich Airport',
        VIE: 'Vienna International Airport',
        CPH: 'Copenhagen Airport',
        ARN: 'Stockholm Arlanda Airport',
        OSL: 'Oslo Airport',
        HEL: 'Helsinki Airport',
        WAW: 'Warsaw Chopin Airport',
        PRG: 'Prague Airport',
        BUD: 'Budapest Airport',
        ATH: 'Athens International Airport',
        IST: 'Istanbul Airport',

        // Asia Pacific
        DXB: 'Dubai International Airport',
        DOH: 'Hamad International Airport',
        AUH: 'Abu Dhabi International Airport',
        NRT: 'Tokyo Narita International Airport',
        HND: 'Tokyo Haneda Airport',
        KIX: 'Kansai International Airport',
        ICN: 'Seoul Incheon International Airport',
        PVG: 'Shanghai Pudong International Airport',
        PEK: 'Beijing Capital International Airport',
        HKG: 'Hong Kong International Airport',
        SIN: 'Singapore Changi Airport',
        KUL: 'Kuala Lumpur International Airport',
        BKK: 'Bangkok Suvarnabhumi Airport',
        SYD: 'Sydney Kingsford Smith Airport',
        MEL: 'Melbourne Airport',
        AKL: 'Auckland Airport',
        DEL: 'Indira Gandhi International Airport',
        BOM: 'Chhatrapati Shivaji International Airport',

        // Middle East & Africa
        CAI: 'Cairo International Airport',
        JNB: 'O.R. Tambo International Airport',
        CPT: 'Cape Town International Airport',
        TLV: 'Ben Gurion Airport',
        RUH: 'King Khalid International Airport',
        JED: 'King Abdulaziz International Airport',

        // South America
        GRU: 'São Paulo–Guarulhos International Airport',
        GIG: 'Rio de Janeiro–Galeão International Airport',
        EZE: 'Ezeiza International Airport',
        BOG: 'El Dorado International Airport',
        LIM: 'Jorge Chávez International Airport',
        SCL: 'Arturo Merino Benítez International Airport',
    };
    return airports[iataCode] || `${iataCode} Airport`;
};

// Airline codes to full names
export const getAirlineName = (carrierCode) => {
    const airlines = {
        // US Airlines
        AA: 'American Airlines',
        UA: 'United Airlines',
        DL: 'Delta Airlines',
        WN: 'Southwest Airlines',
        B6: 'JetBlue Airways',
        AS: 'Alaska Airlines',
        F9: 'Frontier Airlines',
        NK: 'Spirit Airlines',
        G4: 'Allegiant Air',
        SY: 'Sun Country Airlines',

        // International Airlines
        BA: 'British Airways',
        VS: 'Virgin Atlantic',
        AF: 'Air France',
        KL: 'KLM Royal Dutch Airlines',
        LH: 'Lufthansa',
        OS: 'Austrian Airlines',
        LX: 'Swiss International Air Lines',
        IB: 'Iberia',
        VY: 'Vueling',
        FR: 'Ryanair',
        U2: 'easyJet',
        AZ: 'ITA Airways',
        LO: 'LOT Polish Airlines',
        OK: 'Czech Airlines',
        RO: 'Tarom',
        SN: 'Brussels Airlines',
        SK: 'SAS Scandinavian Airlines',
        AY: 'Finnair',
        TK: 'Turkish Airlines',

        // Middle East Airlines
        EK: 'Emirates',
        QR: 'Qatar Airways',
        EY: 'Etihad Airways',
        WY: 'Oman Air',
        SV: 'Saudia',
        MS: 'EgyptAir',
        LY: 'El Al',

        // Asian Airlines
        SQ: 'Singapore Airlines',
        CX: 'Cathay Pacific',
        JL: 'Japan Airlines',
        NH: 'All Nippon Airways',
        KE: 'Korean Air',
        OZ: 'Asiana Airlines',
        CA: 'Air China',
        MU: 'China Eastern Airlines',
        CZ: 'China Southern Airlines',
        TG: 'Thai Airways',
        MH: 'Malaysia Airlines',
        AI: 'Air India',
        '6E': 'IndiGo',
        QF: 'Qantas',
        JQ: 'Jetstar',
        NZ: 'Air New Zealand',

        // Canadian Airlines
        AC: 'Air Canada',
        WS: 'WestJet',

        // Latin American Airlines
        AM: 'Aeroméxico',
        CM: 'Copa Airlines',
        AV: 'Avianca',
        LA: 'LATAM Airlines',
        G3: 'Gol Linhas Aéreas',
        JJ: 'TAM Airlines',
        AR: 'Aerolíneas Argentinas',

        // African Airlines
        SA: 'South African Airways',
        ET: 'Ethiopian Airlines',
        KQ: 'Kenya Airways',
        AT: 'Royal Air Maroc',
    };
    return airlines[carrierCode] || carrierCode;
};

// Aircraft codes to full names
export const getAircraftName = (code) => {
    const aircraft = {
        // Airbus Family
        319: 'Airbus A319',
        320: 'Airbus A320',
        321: 'Airbus A321',
        '32S': 'Airbus A321-200',
        '32Q': 'Airbus A321neo',
        '32N': 'Airbus A321neo',
        330: 'Airbus A330',
        332: 'Airbus A330-200',
        333: 'Airbus A330-300',
        339: 'Airbus A330-900neo',
        340: 'Airbus A340',
        346: 'Airbus A340-600',
        350: 'Airbus A350',
        359: 'Airbus A350-900',
        '35K': 'Airbus A350-1000',
        380: 'Airbus A380',

        // Boeing Family
        737: 'Boeing 737',
        '73G': 'Boeing 737-700',
        738: 'Boeing 737-800',
        739: 'Boeing 737-900',
        '73H': 'Boeing 737-800',
        '73J': 'Boeing 737-900',
        '73W': 'Boeing 737-700',
        '7M8': 'Boeing 737 MAX 8',
        '7M9': 'Boeing 737 MAX 9',
        '7MJ': 'Boeing 737 MAX 10',
        757: 'Boeing 757',
        '75F': 'Boeing 757-200F',
        '75W': 'Boeing 757-200',
        767: 'Boeing 767',
        '76W': 'Boeing 767-300ER',
        777: 'Boeing 777',
        '77W': 'Boeing 777-300ER',
        '77L': 'Boeing 777-200LR',
        772: 'Boeing 777-200',
        773: 'Boeing 777-300',
        787: 'Boeing 787 Dreamliner',
        788: 'Boeing 787-8',
        789: 'Boeing 787-9',
        '78J': 'Boeing 787-10',
        747: 'Boeing 747',
        744: 'Boeing 747-400',
        748: 'Boeing 747-8',

        // Regional Aircraft
        CR9: 'Bombardier CRJ-900',
        CRJ: 'Bombardier CRJ',
        CR7: 'Bombardier CRJ-700',
        CR2: 'Bombardier CRJ-200',
        DH4: 'De Havilland Dash 8-400',
        DH8: 'De Havilland Dash 8',
        E70: 'Embraer E-170',
        E75: 'Embraer E-175',
        E90: 'Embraer E-190',
        ER4: 'Embraer ERJ-145',
        ERJ: 'Embraer ERJ',

        // Other Manufacturers
        AT7: 'ATR 72',
        AT5: 'ATR 42',
        SF3: 'Saab 340',
        BEC: 'Beechcraft 1900',
    };
    return aircraft[code] || code;
};

// Hotel chain codes to full names
export const getHotelChainName = (chainCode) => {
    const chains = {
        MC: 'Marriott',
        HI: 'Hilton',
        IH: 'InterContinental Hotels Group',
        AC: 'Accor',
        WY: 'Wyndham Hotels',
        HY: 'Hyatt',
        RT: 'Radisson Hotel Group',
        BW: 'Best Western',
        SH: 'Starwood',
        CH: 'Choice Hotels',
        LQ: 'La Quinta',
        EL: 'Extended Stay America',
        RH: 'Red Roof Inn',
        MT: 'Motel 6',
        OY: 'OYO Hotels',
        MG: 'MGM Resorts',
        CZ: 'Caesars Entertainment',
        FS: 'Four Seasons',
        RC: 'Ritz-Carlton',
        W: 'W Hotels',
        LX: 'The Luxury Collection',
        AL: 'Autograph Collection',
        PE: 'Edition Hotels',
        BU: 'Bulgari Hotels',
    };
    return chains[chainCode] || chainCode;
};

// City codes to full names
export const getCityName = (cityCode) => {
    const cities = {
        // North America
        NYC: 'New York City',
        LAX: 'Los Angeles',
        CHI: 'Chicago',
        MIA: 'Miami',
        LAS: 'Las Vegas',
        SFO: 'San Francisco',
        SEA: 'Seattle',
        BOS: 'Boston',
        WAS: 'Washington D.C.',
        PHI: 'Philadelphia',
        ATL: 'Atlanta',
        DEN: 'Denver',
        PHX: 'Phoenix',
        DFW: 'Dallas',
        HOU: 'Houston',
        MSP: 'Minneapolis',
        DTT: 'Detroit',
        CLT: 'Charlotte',
        MCO: 'Orlando',
        TOR: 'Toronto',
        YVR: 'Vancouver',
        YUL: 'Montreal',
        MEX: 'Mexico City',

        // Europe
        LON: 'London',
        PAR: 'Paris',
        FRA: 'Frankfurt',
        AMS: 'Amsterdam',
        MAD: 'Madrid',
        BCN: 'Barcelona',
        ROM: 'Rome',
        MIL: 'Milan',
        ZUR: 'Zurich',
        VIE: 'Vienna',
        CPH: 'Copenhagen',
        STO: 'Stockholm',
        OSL: 'Oslo',
        HEL: 'Helsinki',
        WAW: 'Warsaw',
        PRG: 'Prague',
        BUD: 'Budapest',
        ATH: 'Athens',
        IST: 'Istanbul',
        MOS: 'Moscow',
        LED: 'St. Petersburg',

        // Asia Pacific
        TOK: 'Tokyo',
        OSA: 'Osaka',
        SEL: 'Seoul',
        SHA: 'Shanghai',
        PEK: 'Beijing',
        HKG: 'Hong Kong',
        SIN: 'Singapore',
        KUL: 'Kuala Lumpur',
        BKK: 'Bangkok',
        SYD: 'Sydney',
        MEL: 'Melbourne',
        AKL: 'Auckland',
        DEL: 'New Delhi',
        BOM: 'Mumbai',
        CCU: 'Kolkata',
        BLR: 'Bangalore',
        MAA: 'Chennai',

        // Middle East & Africa
        DXB: 'Dubai',
        DOH: 'Doha',
        AUH: 'Abu Dhabi',
        CAI: 'Cairo',
        JNB: 'Johannesburg',
        CPT: 'Cape Town',
        TLV: 'Tel Aviv',
        RUH: 'Riyadh',
        JED: 'Jeddah',
        AMM: 'Amman',
        BEY: 'Beirut',

        // South America
        SAO: 'São Paulo',
        RIO: 'Rio de Janeiro',
        BUE: 'Buenos Aires',
        BOG: 'Bogotá',
        LIM: 'Lima',
        SCL: 'Santiago',
        CCS: 'Caracas',
        UIO: 'Quito',
        LPB: 'La Paz',
        ASU: 'Asunción',
        MVD: 'Montevideo',
    };

    // If cityCode is already a full city name, return it directly
    if (Object.values(cities).includes(cityCode)) {
        return cityCode;
    }
    return cities[cityCode] || cityCode;
};

// Country codes to full names
export const getCountryName = (countryCode) => {
    const countries = {
        US: 'United States',
        CA: 'Canada',
        MX: 'Mexico',
        GB: 'United Kingdom',
        IE: 'Ireland',
        FR: 'France',
        DE: 'Germany',
        IT: 'Italy',
        ES: 'Spain',
        PT: 'Portugal',
        NL: 'Netherlands',
        BE: 'Belgium',
        CH: 'Switzerland',
        AT: 'Austria',
        DK: 'Denmark',
        SE: 'Sweden',
        NO: 'Norway',
        FI: 'Finland',
        PL: 'Poland',
        CZ: 'Czech Republic',
        HU: 'Hungary',
        GR: 'Greece',
        TR: 'Turkey',
        RU: 'Russia',
        JP: 'Japan',
        KR: 'South Korea',
        CN: 'China',
        HK: 'Hong Kong',
        SG: 'Singapore',
        MY: 'Malaysia',
        TH: 'Thailand',
        AU: 'Australia',
        NZ: 'New Zealand',
        IN: 'India',
        AE: 'United Arab Emirates',
        QA: 'Qatar',
        SA: 'Saudi Arabia',
        EG: 'Egypt',
        ZA: 'South Africa',
        IL: 'Israel',
        BR: 'Brazil',
        AR: 'Argentina',
        CL: 'Chile',
        CO: 'Colombia',
        PE: 'Peru',
        VE: 'Venezuela',
        UY: 'Uruguay',
        PY: 'Paraguay',
        BO: 'Bolivia',
        EC: 'Ecuador',
    };
    return countries[countryCode] || countryCode;
};

// Room type codes to full names
export const getRoomTypeName = (roomType) => {
    const roomTypes = {
        STD: 'Standard Room',
        SUP: 'Superior Room',
        DLX: 'Deluxe Room',
        ELE: 'Executive Room',
        STE: 'Suite',
        JUN: 'Junior Suite',
        EXE: 'Executive Suite',
        PRE: 'Premium Room',
        LUX: 'Luxury Room',
        ROH: 'Run of House',
        TWN: 'Twin Room',
        DBL: 'Double Room',
        TRP: 'Triple Room',
        QUA: 'Quadruple Room',
        FAM: 'Family Room',
        CON: 'Connecting Rooms',
        ADJ: 'Adjacent Rooms',
        VIL: 'Villa',
        APT: 'Apartment',
        STU: 'Studio',
        PEN: 'Penthouse',
        CAB: 'Cabin',
        CHA: 'Chalet',
        BUN: 'Bungalow',
        COT: 'Cottage',
    };
    return roomTypes[roomType] || 'Room';
};

// Bed type codes to full names
export const getBedTypeName = (bedType) => {
    const bedTypes = {
        SINGLE: 'Single Bed',
        DOUBLE: 'Double Bed',
        TWIN: 'Twin Beds',
        QUEEN: 'Queen Bed',
        KING: 'King Bed',
        SOFA: 'Sofa Bed',
        MURPHY: 'Murphy Bed',
        BUNK: 'Bunk Bed',
        FUTON: 'Futon',
        DAYBED: 'Day Bed',
        ROLLAWAY: 'Rollaway Bed',
        CRIB: 'Crib',
        WATERBED: 'Water Bed',
        TATAMI: 'Tatami Mat',
    };
    return bedTypes[bedType] || bedType;
};

// Cabin class codes to full names
export const getCabinClassName = (cabinClass) => {
    const cabinClasses = {
        ECONOMY: 'Economy',
        PREMIUM_ECONOMY: 'Premium Economy',
        BUSINESS: 'Business Class',
        FIRST: 'First Class',
        Y: 'Economy',
        W: 'Premium Economy',
        C: 'Business Class',
        J: 'Business Class',
        F: 'First Class',
        P: 'First Class',
    };
    return cabinClasses[cabinClass] || cabinClass;
};

// Meal type codes to full names
export const getMealTypeName = (mealCode) => {
    const mealTypes = {
        B: 'Breakfast',
        K: 'Continental Breakfast',
        L: 'Lunch',
        D: 'Dinner',
        S: 'Snack',
        O: 'Cold Meal',
        H: 'Hot Meal',
        M: 'Meal',
        R: 'Refreshment',
        C: 'Alcoholic Beverages Complimentary',
        F: 'Food for Purchase',
        G: 'Food and Beverages for Purchase',
        P: 'Alcoholic Beverages for Purchase',
        Y: 'Duty Free Sales Available',
        N: 'No Meal Service',
        V: 'Refreshment for Purchase',
    };
    return mealTypes[mealCode] || mealCode;
};

// Baggage type codes to descriptions
export const getBaggageDescription = (weight, weightUnit, quantity = 1) => {
    if (!weight || weight === 0) return 'No checked baggage included';

    const unit = weightUnit === 'KG' ? 'kg' : 'lbs';
    const bagText = quantity === 1 ? 'bag' : 'bags';

    return `${quantity} × ${weight}${unit} checked ${bagText}`;
};

// Helper to format duration from ISO 8601 format (PT2H45M)
export const formatFlightDuration = (isoDuration) => {
    if (!isoDuration) return 'N/A';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 'N/A';

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;

    if (hours === 0 && minutes === 0) return 'N/A';
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;

    return `${hours}h ${minutes}m`;
};

// Helper to format layover time
export const formatLayoverTime = (departureTime, arrivalTime) => {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const layoverMs = departure - arrival;

    if (layoverMs <= 0) return 'Invalid layover';

    const hours = Math.floor(layoverMs / (1000 * 60 * 60));
    const minutes = Math.floor((layoverMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;

    return `${hours}h ${minutes}m`;
};
