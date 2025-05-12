
const prisma =require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.register = async (req,res)=>{

try {
    const { email,password,name, } = req.body;
    if(!email){
        return res.status(400).json({message:"Email is required"})
    }
    if(!password){
        return res.status(400).json({message:"Password is required"})
    }

    //Step2 Check Email in DB
    const user = await prisma.user.findFirst({
        where:{
            email:email
        }
    })
   if(user){
    return res.status(400).json({message:"Email already exists"})
   }
    
//Step3 Check Email in DB
const hashPassword = await bcrypt.hash(password,10)
console.log(hashPassword)

//Step4 Register

const usersuccess = await prisma.user.create({
    data:{
        email: email,
        password:hashPassword,
        name: name

    }
})

    res.send(usersuccess);
} catch (error) {
    console.log(error)
    res.status(500).json({message:"Server Error"})
}
    
}

exports.login =async (req,res)=>{

try {
const {email,password} =req.body
console.log('📥 Body:', email, password);

//step 1 checkemail
const user =await prisma.user.findFirst({
    where:{ 
        email:email

    }
})



//step 2 password

const isMatch =await bcrypt.compare(password,user.password)

if(!isMatch){
    return res.status(400).json({message:'Password Invalid'})
}

//step 3 Payload
console.log('JWT_SECRET:', process.env.SECRET)
const payload ={
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
    
}

res.json({payload})

} catch (error) {
    console.log(error)
    res.status(500).json({message:"Server Error"})
}
}   

exports.currentUser = async(req,res)=>{

    try {
        res.send('Hello CurrentUser ')
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
    }   

