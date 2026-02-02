const express = require('express');
const router = express.Router();
const {
    sendThesisConclusionRequest,
    getSustainableDevelopmentGoals,
    getAvailableLicenses,
    getEmbargoMotivations,
} = require('../controllers/thesis-conclusion');

router.post('/', sendThesisConclusionRequest);
router.get('/sdgs', getSustainableDevelopmentGoals);
router.get('/licenses', getAvailableLicenses);
router.get('/embargo-motivations', getEmbargoMotivations);

module.exports = router;