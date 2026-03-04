const { z } = require('zod');

const thesisStatusSchema = z.enum([
  'ongoing',
  'cancel_requested',
  'cancel_approved',
  'conclusion_requested',
  'conclusion_approved',
  'almalaurea',
  'compiled_questionnaire',
  'final_exam',
  'final_thesis',
  'done',
]);

module.exports = thesisStatusSchema;
