const parseJsonField = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (err) {
      console.warn('Failed to parse JSON field:', err?.message || err);
      return fallback;
    }
  }
  return value;
};

module.exports = {
  parseJsonField,
};
