const { z } = require('zod');

const teacherSchema = require('./Teacher');
const companySchema = require('./Company');
const thesisApplicationStatusSchema = require('./ThesisApplicationStatus');
const thesisProposalMinimalSchema = require('./ThesisProposalMinimal');

const thesisApplicationResponseSchema = z
  .object({
    id: z.number(),
    topic: z.string(),
    supervisor: teacherSchema,
    co_supervisors: z.array(teacherSchema).default([]).nullable(),
    thesis_proposal: thesisProposalMinimalSchema.nullable(),
    company: companySchema.nullable(),
    submission_date: z.string().datetime(),
    status: thesisApplicationStatusSchema,
  })
  .transform(response => ({
    id: response.id,
    topic: response.topic,
    supervisor: response.supervisor,
    coSupervisors: response.co_supervisors,
    company: response.company,
    thesisProposal: response.thesis_proposal,
    submissionDate: response.submission_date,
    status: response.status,
  }));

module.exports = thesisApplicationResponseSchema;
