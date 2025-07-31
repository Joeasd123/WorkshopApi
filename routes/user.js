const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/usercontroller');
const authController = require('../controllers/auth');
const authenticate = require('../middleware/auth');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public route
router.post('/register', userController.create);
router.post('/login', authController.login);

// Protected routes - ต้องมี token
router.get('/user', authenticate, userController.get);
router.post('/user/update', authenticate, upload.array('images'), userController.update);

module.exports = router;
