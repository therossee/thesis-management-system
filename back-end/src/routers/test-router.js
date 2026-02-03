const express = require('express');
const router = express.Router();
const { updateThesisApplicationStatus, updateThesisConclusionStatus } = require('../controllers/test-controller');

router.put('/thesis-application', updateThesisApplicationStatus);
router.put('/thesis-conclusion', updateThesisConclusionStatus);

module.exports = router;
