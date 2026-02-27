const express = require('express');
const router = express.Router();
const {
  getThesisProposals,
  getTargetedThesisProposals,
  getThesisProposalsTypes,
  getThesisProposalsKeywords,
  getThesisProposalsTeachers,
  getThesisProposalById,
  getProposalAvailability,
} = require('../controllers/thesis-proposals');

router.get('/', getThesisProposals);
router.get('/targeted', getTargetedThesisProposals);
router.get('/types', getThesisProposalsTypes);
router.get('/keywords', getThesisProposalsKeywords);
router.get('/teachers', getThesisProposalsTeachers);
router.get('/:thesisProposalId', getThesisProposalById);
router.get('/:thesisProposalId/availability', getProposalAvailability);

module.exports = router;
