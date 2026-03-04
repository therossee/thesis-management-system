const express = require('express');
const router = express.Router();
const {
  getStudents,
  getLoggedStudent,
  updateLoggedStudent,
  getRequiredSummaryForLoggedStudent,
} = require('../controllers/students');

router.get('/', getStudents);
router.get('/logged-student', getLoggedStudent);
router.get('/required-summary', getRequiredSummaryForLoggedStudent);
router.put('/logged-student', updateLoggedStudent);

module.exports = router;
