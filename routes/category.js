const express= require('express')
const router =express.Router()
const {create,list,remove,update,search} =require('../controllers/categorycontroller')




router.get('/category',list)
router.post('/category/search',search);
router.post('/category',create)
router.delete('/category/:id',remove)
router.put('/category',update)


module.exports = router