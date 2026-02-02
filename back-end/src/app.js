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

app.use(bodyParser.json());
app.use(cors());

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
