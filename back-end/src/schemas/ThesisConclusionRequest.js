const { z } = require('zod');

const teacherOverviewSchema = require('./TeacherOverview');
const thesisKeywordInputSchema = require('./ThesisKeywordInput');
const thesisSdgSchema = require('./ThesisSdg');
const thesisEmbargoMotivationSchema = require('./ThesisEmbargoMotivation');

const uploadedFileSchema = z.object({
  path: z.string().min(1),
  mimetype: z.string().min(1),
  originalname: z.string().min(1),
});

const thesisConclusionRequestSchema = z.object({
  title: z.string().trim().min(1).max(255),
  titleEng: z.string().trim().min(1).max(255).nullable().optional(),
  abstract: z.string().trim().min(1).max(3550),
  abstractEng: z.string().trim().min(1).max(3550).nullable().optional(),
  language: z.enum(['it', 'en']).default('it'),
  coSupervisors: z.array(teacherOverviewSchema).nullable().optional(),
  keywords: z.array(thesisKeywordInputSchema).nullable().optional(),
  licenseId: z.preprocess(value => {
    if (value === undefined || value === null || value === '') return null;
    return value;
  }, z.coerce.number().int().positive().nullable().optional()),
  sdgs: z.array(thesisSdgSchema).nullable().optional(),
  embargo: z
    .object({
      duration: z.string().trim().min(1),
      motivations: z.array(thesisEmbargoMotivationSchema).min(1),
    })
    .nullable()
    .optional(),
  thesisResume: uploadedFileSchema
    .refine(file => file.mimetype === 'application/pdf', {
      message: 'thesisResume must be a PDF file',
    })
    .nullable()
    .optional(),
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
