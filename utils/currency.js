// Currency conversion utilities
export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  HRK: 'kn',
  RSD: 'дин',
  MKD: 'ден',
  ALL: 'L',
  BAM: 'КМ',
  MNT: '₮',
  UAH: '₴',
  RUB: '₽',
  KZT: '₸',
  UZS: 'сўм',
  KGS: 'сом',
  TJS: 'сом',
  TMT: 'T',
  AZN: '₼',
  GEL: '₾',
  AMD: '֏',
  BYN: 'Br',
  MDL: 'L',
  KZT: '₸'
};

export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    // Fallback formatting
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
};

export const getExchangeRate = async (fromCurrency, toCurrency) => {
  // In a real application, you would call an external API like:
  // - Fixer.io
  // - CurrencyLayer
  // - ExchangeRate-API
  
  // For now, return a mock exchange rate
  // In production, implement actual API calls
  const mockRates = {
    'USD': { 'EUR': 0.85, 'GBP': 0.73, 'INR': 83.0, 'JPY': 110.0 },
    'EUR': { 'USD': 1.18, 'GBP': 0.86, 'INR': 98.0, 'JPY': 129.0 },
    'GBP': { 'USD': 1.37, 'EUR': 1.16, 'INR': 114.0, 'JPY': 150.0 },
    'INR': { 'USD': 0.012, 'EUR': 0.010, 'GBP': 0.009, 'JPY': 1.33 },
    'JPY': { 'USD': 0.009, 'EUR': 0.008, 'GBP': 0.007, 'INR': 0.75 }
  };

  if (fromCurrency === toCurrency) return 1.0;
  
  const rate = mockRates[fromCurrency]?.[toCurrency];
  if (rate) return rate;
  
  // If direct rate not available, try reverse rate
  const reverseRate = mockRates[toCurrency]?.[fromCurrency];
  if (reverseRate) return 1 / reverseRate;
  
  // Default fallback
  return 1.0;
};

export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return { amount, exchangeRate: 1.0 };
  }
  
  const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
  const convertedAmount = amount * exchangeRate;
  
  return {
    amount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
    exchangeRate
  };
};

export const validateCurrency = (currency) => {
  const validCurrencies = Object.keys(CURRENCY_SYMBOLS);
  return validCurrencies.includes(currency.toUpperCase());
};
