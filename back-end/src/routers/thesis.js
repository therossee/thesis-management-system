const express = require('express');
const router = express.Router();
const { getLoggedStudentThesis, createStudentThesis, getAllTheses } = require('../controllers/thesis');

router.get('/', getLoggedStudentThesis);
router.post('/', createStudentThesis);
router.get('/all', getAllTheses);

module.exports = router;
