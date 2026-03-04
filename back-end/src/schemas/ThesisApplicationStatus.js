const { z } = require('zod');

const thesisApplicationStatusSchema = z.enum(['pending', 'rejected', 'approved', 'cancelled']);

module.exports = thesisApplicationStatusSchema;
