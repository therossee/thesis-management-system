const { z } = require('zod');

const teacherOverviewSchema = z
  .object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string().nullable(),
    'thesis-proposal-supervisor-cosupervisor': z
      .object({
        is_supervisor: z.boolean().optional(),
      })
      .optional(),
      'thesis-application-supervisor-cosupervisor': z
      .object({
        is_supervisor: z.boolean().optional(),
      })
      .optional(),
      'thesis-supervisor-cosupervisor': z
      .object({
        is_supervisor: z.boolean().optional(),
      })
      .optional(),
  })
  .transform(teacher => ({
    id: teacher.id,
    firstName: teacher.first_name,
    lastName: teacher.last_name,
    email: teacher.email,
    isSupervisor: teacher['thesis-proposal-supervisor-cosupervisor']?.is_supervisor ?? undefined,
    isApplicationSupervisor: teacher['thesis-application-supervisor-cosupervisor']?.is_supervisor ?? undefined,
    isThesisSupervisor: teacher['thesis-supervisor-cosupervisor']?.is_supervisor ?? undefined,
  }));

module.exports = teacherOverviewSchema;
