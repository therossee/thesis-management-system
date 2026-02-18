const { z } = require('zod');

const studentSchema = require('./Student');
const companySchema = require('./Company');
const teacherSchema = require('./Teacher');
const thesisApplicationStatusHistorySchema = require('./ThesisApplicationStatusHistory');
const thesisStatusSchema = require('./ThesisStatus');

const thesisSchema = z
  .object({
    id: z.number(),
    topic: z.string(),
    title: z.string().nullable().optional(),
    title_eng: z.string().nullable().optional(),
    language: z.enum(['it', 'en']).nullable().optional(),
    abstract: z.string().nullable().optional(),
    abstract_eng: z.string().nullable().optional(),
    thesis_file_path: z.string().nullable().optional(),
    thesis_resume_path: z.string().nullable().optional(),
    additional_zip_path: z.string().nullable().optional(),
    license_id: z.number().nullable().optional(),
    student: studentSchema,
    supervisor: teacherSchema,
    co_supervisors: z.array(teacherSchema).default([]).nullable().optional(),
    company: companySchema.nullable().optional(),
    application_status_history: z.array(thesisApplicationStatusHistorySchema).optional(),
    status: thesisStatusSchema,
    thesis_start_date: z.string().datetime(),
    thesis_conclusion_request_date: z.string().datetime().nullable().optional(),
    thesis_conclusion_confirmation_date: z.string().datetime().nullable().optional(),
    thesis_draft_date: z.string().datetime().nullable().optional(),
  })
  .transform(thesis => ({
    id: thesis.id,
    topic: thesis.topic,
    title: thesis.title,
    titleEng: thesis.title_eng,
    language: thesis.language,
    abstract: thesis.abstract,
    abstractEng: thesis.abstract_eng,
    thesisFilePath: thesis.thesis_file_path,
    thesisResumePath: thesis.thesis_resume_path,
    additionalZipPath: thesis.additional_zip_path,
    licenseId: thesis.license_id,
    student: thesis.student,
    supervisor: thesis.supervisor,
    coSupervisors: thesis.co_supervisors,
    company: thesis.company,
    applicationStatusHistory: thesis.application_status_history,
    status: thesis.status,
    thesisStartDate: thesis.thesis_start_date,
    thesisConclusionRequestDate: thesis.thesis_conclusion_request_date,
    thesisConclusionConfirmationDate: thesis.thesis_conclusion_confirmation_date,
    thesisDraftDate: thesis.thesis_draft_date,
  }));

module.exports = thesisSchema;
