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

const nullableText = max =>
  z.preprocess(value => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value;
  }, z.string().max(max).nullable());

const nullablePositiveInt = z.preprocess(value => {
  if (value === undefined || value === null || value === '') return null;
  return value;
}, z.coerce.number().int().positive().nullable());

const optionalPdfFileSchema = uploadedFileSchema
  .refine(file => file.mimetype === 'application/pdf', {
    message: 'File must be a PDF file',
  })
  .nullable()
  .optional();

const optionalZipFileSchema = uploadedFileSchema
  .refine(file => file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed', {
    message: 'additionalZip must be a ZIP file',
  })
  .nullable()
  .optional();

const optionalBooleanSchema = z.preprocess(value => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1'].includes(normalized)) return true;
    if (['false', '0'].includes(normalized)) return false;
  }
  return value;
}, z.boolean().optional());

const thesisConclusionDraftSchema = z.object({
  title: nullableText(255).optional(),
  titleEng: nullableText(255).optional(),
  abstract: nullableText(3550).optional(),
  abstractEng: nullableText(3550).optional(),
  language: z.enum(['it', 'en']).nullable().optional(),
  coSupervisors: z.array(teacherOverviewSchema).nullable().optional(),
  keywords: z.array(thesisKeywordInputSchema).nullable().optional(),
  licenseId: nullablePositiveInt.optional(),
  sdgs: z.array(thesisSdgSchema).nullable().optional(),
  embargo: z
    .object({
      duration: z.string().trim().min(1).nullable().optional(),
      motivations: z.array(thesisEmbargoMotivationSchema).nullable().optional(),
    })
    .nullable()
    .optional(),
  thesisSummary: optionalPdfFileSchema,
  thesisFile: optionalPdfFileSchema,
  additionalZip: optionalZipFileSchema,
  removeThesisSummary: optionalBooleanSchema,
  removeThesisFile: optionalBooleanSchema,
  removeAdditionalZip: optionalBooleanSchema,
});

module.exports = thesisConclusionDraftSchema;
