const { z } = require('zod');

const companySchema = z
  .object({
    id: z.number(),
    corporate_name: z.string(),
  })
  .transform(company => ({
    id: company.id,
    corporateName: company.corporate_name,
  }));

module.exports = companySchema;
