const { z } = require('zod');

const uploadedFileSchema = z.object({
  path: z.string().min(1),
  mimetype: z.string().min(1),
  originalname: z.string().min(1),
});

const pdfFileSchema = uploadedFileSchema.refine(file => file.mimetype === 'application/pdf', {
  message: 'File must be a PDF file',
});

const optionalPdfFileSchema = pdfFileSchema.nullable().optional();

const optionalZipFileSchema = uploadedFileSchema
  .refine(file => file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed', {
    message: 'additionalZip must be a ZIP file',
  })
  .nullable()
  .optional();

const finalThesisUploadRequestSchema = z
  .object({
    thesisFile: optionalPdfFileSchema,
    thesisSummary: optionalPdfFileSchema,
    additionalZip: optionalZipFileSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.thesisFile) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['thesisFile'],
        message: 'Missing thesis file',
      });
    }
  });

module.exports = finalThesisUploadRequestSchema;
