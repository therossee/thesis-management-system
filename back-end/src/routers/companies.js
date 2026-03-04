const express = require('express');
const router = express.Router();
const { getCompanies } = require('../controllers/companies');

router.get('/', getCompanies);

module.exports = router;
