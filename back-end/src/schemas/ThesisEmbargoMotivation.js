const { z } = require('zod');

const thesisEmbargoMotivationSchema = z
  .object({
    motivation_id: z.coerce.number().int().positive(),
    other_motivation: z.string().trim().nullable().optional(),
  })
  .transform(embargoMotivation => ({
    motivationId: embargoMotivation.motivation_id,
    otherMotivation: embargoMotivation.other_motivation,
  }));

module.exports = thesisEmbargoMotivationSchema;
