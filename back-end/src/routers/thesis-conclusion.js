const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const {
  sendThesisConclusionRequest,
  saveThesisConclusionRequestDraft,
  getThesisConclusionRequestDraft,
  getSustainableDevelopmentGoals,
  getAvailableLicenses,
  getEmbargoMotivations,
  getSessionDeadlines,
  uploadFinalThesis,
} = require('../controllers/thesis-conclusion');

const tempUploadDir = path.join(__dirname, '..', '..', 'uploads', 'tmp');
fs.mkdirSync(tempUploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempUploadDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}_${safeName}`);
    },
  }),
});

router.post(
  '/',
  upload.fields([
    { name: 'thesisSummary', maxCount: 1 },
    { name: 'thesisFile', maxCount: 1 },
    { name: 'additionalZip', maxCount: 1 },
  ]),
  sendThesisConclusionRequest,
);
router.post(
  '/draft',
  upload.fields([
    { name: 'thesisSummary', maxCount: 1 },
    { name: 'thesisFile', maxCount: 1 },
    { name: 'additionalZip', maxCount: 1 },
  ]),
  saveThesisConclusionRequestDraft,
);
router.get('/draft', getThesisConclusionRequestDraft);
router.get('/sdgs', getSustainableDevelopmentGoals);
router.get('/licenses', getAvailableLicenses);
router.get('/embargo-motivations', getEmbargoMotivations);
router.get('/deadlines', getSessionDeadlines);
router.post(
  '/upload-final-thesis',
  upload.fields([
    { name: 'thesisFile', maxCount: 1 },
    { name: 'thesisSummary', maxCount: 1 },
    { name: 'additionalZip', maxCount: 1 },
  ]),
  uploadFinalThesis,
);

module.exports = router;
