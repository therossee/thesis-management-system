const { z } = require('zod');
const thesisApplicationStatusSchema = require('./ThesisApplicationStatus');
const thesisStatusSchema = require('./ThesisStatus');

const thesisApplicationStatusHistorySchema = z
  .object({
    id: z.coerce.number(),
    old_status: z.union([thesisApplicationStatusSchema, thesisStatusSchema]).nullable(),
    new_status: z.union([thesisApplicationStatusSchema, thesisStatusSchema]),
    change_date: z.coerce.date(),
  })
  .transform(statusHistory => ({
    id: statusHistory.id,
    oldStatus: statusHistory.old_status,
    newStatus: statusHistory.new_status,
    changeDate: statusHistory.change_date,
  }));

module.exports = thesisApplicationStatusHistorySchema;
