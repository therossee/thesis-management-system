const selectMotivationAttributes = lang => {
  return ['id', lang === 'it' ? 'motivation' : 'motivation_en'];
};

module.exports = selectMotivationAttributes;
