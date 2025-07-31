const express = require('express');
const router = express.Router();
const { uploadFile, uploadMiddleware } = require('../controllers/uploadcontroller');

router.post('/upload', uploadMiddleware, uploadFile);

module.exports = router;
