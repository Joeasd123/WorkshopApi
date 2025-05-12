
const prisma =require('../config/prisma')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.register = async (req,res)=>{

try {
    const { email,password,name,images } = req.body;
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
        name: name,
        images:images

    }, include:{
        images:true
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
  
      const user = await prisma.user.findFirst({ where: { email } });
  
      if (!user) {
        return res.status(400).json({ message: 'Email not found' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Password Invalid' });
      }
  
      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        image: user.image
      };
  
      if (!process.env.SECRET) {
        console.log('⚠️ JWT SECRET not found');
        return res.status(500).json({ message: 'Server config error' });
      }
  
      const token = jwt.sign(payload, process.env.SECRET, { expiresIn: '7d' });
  
      res.json({ token, payload });
    } catch (error) {
      console.log('❌ Error:', error);
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

