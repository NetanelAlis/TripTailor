// Major currency codes and their symbols
const CURRENCY_CODES = {
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    GBP: { symbol: '£', name: 'British Pound' },
    JPY: { symbol: '¥', name: 'Japanese Yen' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar' },
    AUD: { symbol: 'A$', name: 'Australian Dollar' },
    CHF: { symbol: 'CHF', name: 'Swiss Franc' },
    CNY: { symbol: '¥', name: 'Chinese Yuan' },
    ILS: { symbol: '₪', name: 'Israeli Shekel' },
};

// Exchange rates (as of 2024 - these would typically come from an API)
// For now, using approximate rates. In production, these should be fetched from a currency API
const EXCHANGE_RATES = {
    USD: {
        EUR: 0.92,
        GBP: 0.79,
        JPY: 150.0,
        CAD: 1.35,
        AUD: 1.52,
        CHF: 0.88,
        CNY: 7.23,
        ILS: 3.65,
    },
    EUR: {
        USD: 1.09,
        GBP: 0.86,
        JPY: 163.0,
        CAD: 1.47,
        AUD: 1.65,
        CHF: 0.96,
        CNY: 7.86,
        ILS: 3.97,
    },
    GBP: {
        USD: 1.27,
        EUR: 1.16,
        JPY: 190.0,
        CAD: 1.71,
        AUD: 1.92,
        CHF: 1.11,
        CNY: 9.15,
        ILS: 4.62,
    },
    JPY: {
        USD: 0.0067,
        EUR: 0.0061,
        GBP: 0.0053,
        CAD: 0.009,
        AUD: 0.0101,
        CHF: 0.0059,
        CNY: 0.0482,
        ILS: 0.0243,
    },
    CAD: {
        USD: 0.74,
        EUR: 0.68,
        GBP: 0.58,
        JPY: 111.0,
        AUD: 1.13,
        CHF: 0.65,
        CNY: 5.36,
        ILS: 2.7,
    },
    AUD: {
        USD: 0.66,
        EUR: 0.61,
        GBP: 0.52,
        JPY: 98.7,
        CAD: 0.88,
        CHF: 0.58,
        CNY: 4.76,
        ILS: 2.4,
    },
    CHF: {
        USD: 1.14,
        EUR: 1.04,
        GBP: 0.9,
        JPY: 170.0,
        CAD: 1.53,
        AUD: 1.73,
        CNY: 8.22,
        ILS: 4.15,
    },
    CNY: {
        USD: 0.14,
        EUR: 0.13,
        GBP: 0.11,
        JPY: 20.7,
        CAD: 0.19,
        AUD: 0.21,
        CHF: 0.12,
        ILS: 0.5,
    },
    ILS: {
        USD: 0.27,
        EUR: 0.25,
        GBP: 0.22,
        JPY: 41.1,
        CAD: 0.37,
        AUD: 0.42,
        CHF: 0.24,
        CNY: 1.98,
    },
};

/**
 * Get user's preferred currency from localStorage
 * @returns {string} - Currency code (defaults to USD)
 */
export function getUserPreferredCurrency() {
    try {
        const userDetails = localStorage.getItem('userDetails');
        if (userDetails) {
            const userData = JSON.parse(userDetails);
            return userData.preferred_currency || 'USD';
        }
    } catch (error) {
        console.warn(
            'Error reading preferred currency from localStorage:',
            error
        );
    }
    return 'USD';
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {number} - Converted amount
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
    if (!amount || isNaN(amount)) return 0;
    if (fromCurrency === toCurrency) return amount;

    const rates = EXCHANGE_RATES[fromCurrency];
    if (!rates || !rates[toCurrency]) {
        console.warn(
            `Exchange rate not available for ${fromCurrency} to ${toCurrency}`
        );
        return amount; // Return original amount if conversion not possible
    }

    return amount * rates[toCurrency];
}

/**
 * Convert amount to user's preferred currency with fallback
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @returns {object} - Object with converted amount and actual currency used
 */
export function convertToUserCurrency(amount, fromCurrency) {
    const userCurrency = getUserPreferredCurrency();

    // Check if conversion is possible
    if (fromCurrency === userCurrency) {
        return { amount, currency: userCurrency };
    }

    const rates = EXCHANGE_RATES[fromCurrency];
    if (!rates || !rates[userCurrency]) {
        // Fallback: keep original currency and amount
        return { amount, currency: fromCurrency };
    }

    const convertedAmount = convertCurrency(amount, fromCurrency, userCurrency);
    return { amount: convertedAmount, currency: userCurrency };
}

/**
 * Format currency amount with proper symbol and formatting
 * @param {number} amount - Amount to format
 * @param {string} currencyCode - Currency code
 * @param {string} locale - Locale for formatting (defaults to 'en-US')
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount, currencyCode = 'USD', locale = 'en-US') {
    if (!amount || isNaN(amount)) return '0';

    const currency = CURRENCY_CODES[currencyCode];
    if (!currency) {
        // Fallback for unknown currencies
        return `${currencyCode} ${amount.toFixed(2)}`;
    }

    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch (error) {
        // Fallback formatting
        return `${currency.symbol}${amount.toFixed(2)}`;
    }
}

/**
 * Convert amount to user's preferred currency (backward compatibility)
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @returns {number} - Converted amount in user's preferred currency (or original amount if conversion fails)
 */
export function convertToUserCurrencyAmount(amount, fromCurrency) {
    const result = convertToUserCurrency(amount, fromCurrency);
    return result.amount;
}

/**
 * Format amount in user's preferred currency with fallback
 * @param {number} amount - Amount to format
 * @param {string} fromCurrency - Source currency code
 * @returns {string} - Formatted amount in user's preferred currency or original currency if conversion fails
 */
export function formatInUserCurrency(amount, fromCurrency) {
    const result = convertToUserCurrency(amount, fromCurrency);
    return formatCurrency(result.amount, result.currency);
}

/**
 * Check if currency conversion is supported
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {boolean} - True if conversion is supported
 */
export function isConversionSupported(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return true;
    const rates = EXCHANGE_RATES[fromCurrency];
    return !!(rates && rates[toCurrency]);
}

/**
 * Check if conversion to user's preferred currency is supported
 * @param {string} fromCurrency - Source currency code
 * @returns {boolean} - True if conversion to user's preferred currency is supported
 */
export function isUserCurrencyConversionSupported(fromCurrency) {
    const userCurrency = getUserPreferredCurrency();
    return isConversionSupported(fromCurrency, userCurrency);
}

/**
 * Get currency symbol for a given currency code
 * @param {string} currencyCode - Currency code
 * @returns {string} - Currency symbol
 */
export function getCurrencySymbol(currencyCode) {
    const currency = CURRENCY_CODES[currencyCode];
    return currency ? currency.symbol : currencyCode;
}

/**
 * Get user's preferred currency symbol
 * @returns {string} - User's preferred currency symbol
 */
export function getUserCurrencySymbol() {
    const userCurrency = getUserPreferredCurrency();
    return getCurrencySymbol(userCurrency);
}

/**
 * Get all available currencies
 * @returns {Object} - Object with currency codes as keys and currency info as values
 */
export function getAvailableCurrencies() {
    return CURRENCY_CODES;
}

/**
 * Check if a currency code is supported
 * @param {string} currencyCode - Currency code to check
 * @returns {boolean} - True if supported
 */
export function isCurrencySupported(currencyCode) {
    return currencyCode in CURRENCY_CODES;
}

export default {
    convertCurrency,
    convertToUserCurrency,
    convertToUserCurrencyAmount,
    formatCurrency,
    formatInUserCurrency,
    getCurrencySymbol,
    getUserCurrencySymbol,
    getUserPreferredCurrency,
    getAvailableCurrencies,
    isCurrencySupported,
    isConversionSupported,
    isUserCurrencyConversionSupported,
};
