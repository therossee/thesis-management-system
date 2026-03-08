const { z } = require('zod');

const deadlineSchema = z
  .object({
    id: z.coerce.number(),
    graduation_session_id: z.coerce.number(),
    deadline_type: z.enum([
      'thesis_request',
      'exams',
      'internship_report',
      'conclusion_request',
      'final_exam_registration',
      'ielts',
    ]),
    deadline_date: z.coerce.date(),
  })
  .transform(deadline => ({
    id: deadline.id,
    graduationSessionId: deadline.graduation_session_id,
    deadlineType: deadline.deadline_type,
    deadlineDate: deadline.deadline_date,
  }));

module.exports = deadlineSchema;
