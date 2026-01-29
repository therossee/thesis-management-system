const { z } = require('zod');

const thesisStatusSchema = z.enum(['ongoing', 'conclusion_requested', 'conclusion_approved', 'conclusion_rejected', 'almalaurea_done', 'enrolled_final_exam', 'confirmed_final_exam']);

module.exports = thesisStatusSchema;
