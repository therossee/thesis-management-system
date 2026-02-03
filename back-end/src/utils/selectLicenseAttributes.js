const selectLicenseAttributes = lang => {
  return ['id', lang === 'it' ? 'name' : 'name_en', lang === 'it' ? 'description' : 'description_en'];
};

module.exports = selectLicenseAttributes;
