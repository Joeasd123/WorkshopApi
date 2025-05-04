const express= require('express')
const router =express.Router()
const {create,get,} =require('../controllers/usercontroller')




router.get('/user/:id',get)
router.post('/user',create)



module.exports = router