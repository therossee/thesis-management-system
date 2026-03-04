const { z } = require('zod');

const keywordSchema = require('./Keyword');

const thesisKeywordInputSchema = z.union([keywordSchema, z.string().trim().min(1)]);

module.exports = thesisKeywordInputSchema;
