const prisma = require("../config/prisma");

exports.create = async (req, res) => {
    try {
        const { id, name, address, email, images = [] } = req.body;
        console.log(req.body);
        
        if (!id) {
            return res.status(400).json({ message: "User ID is required." });
        }

        const pictureList = Array.isArray(images) ? images : [images];
        const userId = Number(id);

        // ใช้คำสั่ง upsert เพื่อตรวจสอบว่ามีข้อมูลในฐานข้อมูลแล้วหรือไม่
        const user = await prisma.user.upsert({
            where: { id: Number(userId) }, // ตรวจสอบว่ามี user ที่มี id นี้อยู่แล้วหรือไม่
            update: {
                name: name,
                email: email,
                address: address,
                images: {
                    deleteMany: {}, 
                    create: pictureList.map((url) => ({ url }))
                  }
            },
            include:{
                images:true
            },
            create: {
                id: Number(id),
                name: name,
                email: email,
                address: address,
                images: {
                    create: pictureList.map((url) => ({ url }))
                  }
            }, include:{
                images:true
            }
        });

        res.send(user);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Server Error" });
    }
}


exports.get =async (req,res)=>{
    const { id}=req.params
    try {
const user = await prisma.user.findUnique({
    where:{
        id:Number(id)
    },
    include:{
        images:true
    }
   
})
        res.send(user);
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}




