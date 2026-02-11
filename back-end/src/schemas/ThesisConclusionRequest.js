const { z } = require('zod');

const coSupervisorSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const sdgSchema = z.object({
  id: z.coerce.number().int().positive(),
  level: z.enum(['primary', 'secondary']).nullable().optional(),
});

const embargoMotivationSchema = z.object({
  id: z.coerce.number().int().positive(),
  other: z.string().trim().nullable().optional(),
});

const uploadedFileSchema = z.object({
  path: z.string().min(1),
  mimetype: z.string().min(1),
  originalname: z.string().min(1),
});

const keywordSchema = z.union([z.coerce.number().int().positive(), z.string().trim().min(1)]);

const thesisConclusionRequestSchema = z.object({
  title: z.string().trim().min(1).max(255),
  titleEng: z.string().trim().min(1).max(255).nullable().optional(),
  abstract: z.string().trim().min(1).max(3550),
  abstractEng: z.string().trim().min(1).max(3550).nullable().optional(),
  language: z.enum(['it', 'en']).default('it'),
  coSupervisors: z.array(coSupervisorSchema).nullable().optional(),
  keywords: z.array(keywordSchema).nullable().optional(),
  licenseId: z.number().int().positive(),
  sdgs: z.array(sdgSchema).nullable().optional(),
  embargo: z
    .object({
      duration: z.string().trim().min(1),
      motivations: z.array(embargoMotivationSchema).min(1),
    })
    .nullable()
    .optional(),
  thesisResume: uploadedFileSchema.refine(file => file.mimetype === 'application/pdf', {
    message: 'thesisResume must be a PDF file',
  }),
  thesisFile: uploadedFileSchema.refine(file => file.mimetype === 'application/pdf', {
    message: 'thesisFile must be a PDF file',
  }),
  additionalZip: uploadedFileSchema
    .refine(file => file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed', {
      message: 'additionalZip must be a ZIP file',
    })
    .nullable()
    .optional(),
});

module.exports = thesisConclusionRequestSchema;
