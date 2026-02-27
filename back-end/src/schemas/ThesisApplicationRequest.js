const { z } = require('zod');

const teacherOverviewSchema = require('./TeacherOverview');
const companySchema = require('./Company');
const thesisProposalMinimalSchema = require('./ThesisProposalMinimal');

const thesisApplicationRequestSchema = z.object({
  topic: z.string(),
  supervisor: teacherOverviewSchema,
  co_supervisors: z.array(teacherOverviewSchema).default([]).nullable(),
  company: companySchema.nullable().optional(),
  thesis_proposal: thesisProposalMinimalSchema.nullable().optional(),
});

module.exports = thesisApplicationRequestSchema;
