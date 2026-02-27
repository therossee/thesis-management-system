const { z } = require('zod');

const teacherSchema = require('./Teacher');
const companySchema = require('./Company');
const studentSchema = require('./Student');
const thesisApplicationStatusSchema = require('./ThesisApplicationStatus');
const thesisProposalOverviewSchema = require('./ThesisProposalOverview');

const thesisApplicationSchema = z
  .object({
    id: z.number(),
    topic: z.string(),
    student: studentSchema,
    supervisor: teacherSchema,
    co_supervisors: z.array(teacherSchema).default([]).nullable(),
    company: companySchema.nullable(),
    thesis_proposal: thesisProposalOverviewSchema.nullable(),
    submission_date: z.string().datetime(),
    status: thesisApplicationStatusSchema,
  })
  .transform(application => ({
    id: application.id,
    topic: application.topic,
    student: application.student,
    supervisor: application.supervisor,
    coSupervisors: application.co_supervisors,
    company: application.company,
    thesisProposal: application.thesis_proposal,
    submissionDate: application.submission_date,
    status: application.status,
  }));

module.exports = thesisApplicationSchema;
