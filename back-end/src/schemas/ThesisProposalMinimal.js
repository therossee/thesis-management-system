const { z } = require('zod');

const thesisProposalMinimalSchema = z.object({
  id: z.number(),
  topic: z.string(),
});

module.exports = thesisProposalMinimalSchema;
