const express = require('express');
const router = express.Router();
const {
  getLoggedStudentThesis,
  createStudentThesis,
  getAllTheses,
  getThesisFile,
  sendThesisCancelRequest,
} = require('../controllers/thesis');

router.get('/', getLoggedStudentThesis);
router.post('/', createStudentThesis);
router.get('/all', getAllTheses);
router.get('/:id/:fileType', getThesisFile);
router.post('/cancel', sendThesisCancelRequest);

module.exports = router;
