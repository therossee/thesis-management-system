const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const thesisProposalsRouter = require('./routers/thesis-proposals');
const studentsRouter = require('./routers/students');
const thesisApplicationsRouter = require('./routers/thesis-applications');
const thesisRouter = require('./routers/thesis');
const companiesRouter = require('./routers/companies');
const testRouter = require('./routers/test-router');
const thesisConclusionRouter = require('./routers/thesis-conclusion');

require('dotenv').config();

const app = express();
app.disable('x-powered-by');
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000'];

const parseAllowedOrigins = () => {
  const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return new Set(configuredOrigins);
  }

  if (process.env.NODE_ENV === 'production') {
    return new Set();
  }

  return new Set(DEFAULT_ALLOWED_ORIGINS);
};

const allowedOrigins = parseAllowedOrigins();
const corsOptions = {
  origin: (origin, callback) => {
    // Requests without Origin (same-origin/server-to-server) are allowed.
    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, allowedOrigins.has(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use('/api/thesis-proposals', thesisProposalsRouter);
app.use('/api/thesis-proposals/targeted', thesisProposalsRouter);
app.use('/api/thesis-proposals/types', thesisProposalsRouter);
app.use('/api/thesis-proposals/keywords', thesisProposalsRouter);
app.use('/api/thesis-proposals/teachers', thesisProposalsRouter);
app.use('/api/thesis-proposals/{:thesisProposalId}', thesisProposalsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/students/logged-student', studentsRouter);
app.use('/api/thesis-applications', thesisApplicationsRouter);
app.use('/api/thesis', thesisRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/test', testRouter);
app.use('/api/thesis-conclusion', thesisConclusionRouter);

module.exports = { app };
