
const prisma =require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.register = async (req,res)=>{

try {
    const { email,password } = req.body;
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
        password:hashPassword
    }
})

    res.send(usersuccess);
} catch (error) {
    console.log(error)
    res.status(500).json({message:"Server Error"})
}
    
}
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // step 1 check email
        const user = await prisma.user.findFirst({
            where: { 
                email: email
            }
        });
        
        if (!user || !user.enabled) {
            return res.status(400).json({ message: 'User Not found or Disabled' });
        }

        // step 2 password validation
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password Invalid' });
        }

        // step 3 create payload for JWT
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };

        // step 4 generate JWT token
        if (!process.env.SECRET) {
            return res.status(500).json({ message: 'Server Error: SECRET key is missing' });
        }

        jwt.sign(payload, process.env.SECRET, {
            expiresIn: '1d'
        }, (err, token) => {
            if (err) {
                return res.status(500).json({ message: 'Server Error' });
            }
            res.json({ payload, token });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};


exports.currentUser = async(req,res)=>{

    try {
        res.send('Hello CurrentUser ')
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
    }   

