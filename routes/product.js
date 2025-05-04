const express= require('express')
const router =express.Router()
const {create,list,remove,update,search} =require('../controllers/productscontroller')



router.post('/product',create)
router.post('/productlist',list)
// router.post('/category/search',search);

// router.delete('/category/:id',remove)
// router.put('/category',update)


module.exports = router