const { z } = require('zod');

const thesisSdgSchema = z
  .object({
    goal_id: z.coerce.number().int().positive(),
    level: z.enum(['primary', 'secondary']).nullable().optional(),
  })
  .transform(thesisSdg => {
    return {
      goalId: thesisSdg.goal_id,
      level: thesisSdg.level,
    };
  });

module.exports = thesisSdgSchema;
