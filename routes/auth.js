const express = require('express');
const router =express.Router()
const {register,login,currentUser} =require('../controllers/auth')


router.post('/register',register)
router.post('/login',login)
router.post('/current-user',currentUser)


module.exports = router;