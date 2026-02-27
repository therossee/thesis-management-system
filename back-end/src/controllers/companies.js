const { Company } = require('../models');
const companySchema = require('../schemas/Company');

const getCompanies = async (req, res) => {
  try {
    const companies = await Company.findAll({
      order: [['corporate_name', 'ASC']],
    });
    res.status(200).json(
      companies.map(company => {
        return companySchema.parse(company);
      }),
    );
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getCompanies,
};
