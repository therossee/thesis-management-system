const { z } = require('zod');

const graduationSessionSchema = require('./GraduationSession');
const deadlineSchema = require('./Deadline');

const sessionDeadlineResponseSchema = z
  .object({
    graduationSession: graduationSessionSchema,
    deadlines: z.array(deadlineSchema),
  })
  .transform(response => ({
    graduationSession: response.graduationSession,
    deadlines: response.deadlines,
  }));

module.exports = sessionDeadlineResponseSchema;
