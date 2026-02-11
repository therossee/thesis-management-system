const { z } = require('zod');

const thesisConclusionResponseSchema = z
  .object({
    id: z.number(),
    topic: z.string(),
    title: z.string().nullable(),
    title_eng: z.string().nullable(),
    language: z.enum(['it', 'en']).nullable(),
    abstract: z.string().nullable(),
    abstract_eng: z.string().nullable(),
    thesis_file_path: z.string().nullable(),
    thesis_resume_path: z.string().nullable(),
    additional_zip_path: z.string().nullable(),
    license_id: z.number().nullable(),
    company_id: z.number().nullable(),
    student_id: z.string(),
    thesis_application_id: z.number(),
    thesis_status: z.string(),
    thesis_start_date: z.string().datetime(),
    thesis_conclusion_request_date: z.string().datetime().nullable(),
    thesis_conclusion_confirmation_date: z.string().datetime().nullable(),
    thesis_supervisor_cosupervisor: z.array(
      z.object({
        teacher_id: z.number(),
        is_supervisor: z.boolean(),
      }),
    ),
    thesis_sustainable_development_goal: z.array(
      z.object({
        goal_id: z.number(),
        sdg_level: z.enum(['primary', 'secondary']),
      }),
    ),
    thesis_keyword: z.array(
      z.object({
        keyword_id: z.number().nullable(),
        keyword_other: z.string().nullable(),
      }),
    ),
    thesis_embargo: z
      .object({
        id: z.number(),
        duration: z.enum(['12_months', '18_months', '36_months', 'after_explicit_consent']),
        thesis_embargo_motivation: z.array(
          z.object({
            motivation_id: z.number(),
            other_motivation: z.string().nullable(),
          }),
        ),
      })
      .nullable(),
  })
  .transform(thesis => ({
    id: thesis.id,
    topic: thesis.topic,
    title: thesis.title,
    titleEng: thesis.title_eng,
    abstract: thesis.abstract,
    abstractEng: thesis.abstract_eng,
    thesisFilePath: thesis.thesis_file_path,
    thesisResumePath: thesis.thesis_resume_path,
    additionalZipPath: thesis.additional_zip_path,
    licenseId: thesis.license_id,
    companyId: thesis.company_id,
    studentId: thesis.student_id,
    thesisApplicationId: thesis.thesis_application_id,
    thesisStatus: thesis.thesis_status,
    thesisStartDate: thesis.thesis_start_date,
    thesisConclusionRequestDate: thesis.thesis_conclusion_request_date,
    thesisConclusionConfirmationDate: thesis.thesis_conclusion_confirmation_date,
    supervisorsAndCoSupervisors: thesis.thesis_supervisor_cosupervisor.map(link => ({
      teacherId: link.teacher_id,
      isSupervisor: link.is_supervisor,
    })),
    sustainableDevelopmentGoals: thesis.thesis_sustainable_development_goal.map(link => ({
      goalId: link.goal_id,
      sdgLevel: link.sdg_level,
    })),
    keywords: thesis.thesis_keyword.map(link => ({
      keywordId: link.keyword_id,
      keywordOther: link.keyword_other,
    })),
    embargo: thesis.thesis_embargo
      ? {
          id: thesis.thesis_embargo.id,
          duration: thesis.thesis_embargo.duration,
          motivations: thesis.thesis_embargo.thesis_embargo_motivation.map(motivation => ({
            motivationId: motivation.motivation_id,
            otherMotivation: motivation.other_motivation,
          })),
        }
      : null,
  }));

module.exports = thesisConclusionResponseSchema;
