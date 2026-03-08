const { z } = require('zod');

const eligibilityResponseSchema = z
  .object({
    student_id: z.string(),
    eligible: z.boolean(),
  })
  .transform(response => ({
    studentId: response.student_id,
    eligible: response.eligible,
  }));

module.exports = eligibilityResponseSchema;
