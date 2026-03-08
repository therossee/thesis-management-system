const { z } = require('zod');

const graduationSessionSchema = z
  .object({
    id: z.coerce.number(),
    session_name: z.string(),
    session_name_en: z.string(),
  })
  .transform(session => ({
    id: session.id,
    sessionName: session.session_name,
    sessionNameEn: session.session_name_en,
  }));

module.exports = graduationSessionSchema;
