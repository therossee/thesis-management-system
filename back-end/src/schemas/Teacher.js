const { z } = require('zod');

const teacherSchema = z
  .object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string().nullable(),
    email: z.string().nullable(),
    profile_url: z.string().nullable(),
    profile_picture_url: z.string().nullable(),
    facility_short_name: z.string().nullable(),
    'thesis-proposal-supervisor-cosupervisor': z.object({ is_supervisor: z.boolean() }).optional(),
    'thesis-application-supervisor-cosupervisor': z.object({ is_supervisor: z.boolean() }).optional(),
  })
  .transform(teacher => {
    const isSupervisor =
      teacher['thesis-proposal-supervisor-cosupervisor']?.is_supervisor ??
      teacher['thesis-application-supervisor-cosupervisor']?.is_supervisor ??
      null;

    return {
      id: teacher.id,
      firstName: teacher.first_name,
      lastName: teacher.last_name,
      role: teacher.role,
      email: teacher.email,
      profileUrl: teacher.profile_url,
      profilePictureUrl: teacher.profile_picture_url,
      facilityShortName: teacher.facility_short_name,
      isSupervisor,
    };
  });

module.exports = teacherSchema;
