const prisma = require("../config/prisma");

exports.create =async (req,res)=>{

    try {
        const {name,images =[]} = req.body
        console.log(req.body);
        const category = await prisma.category.create({
            data: {
                name: name,
                images:images.length >0 ?
                {
                    create:images.map(img =>({
                        url: img,
                        
                    }))
                }:undefined
            },include:{
                images:true
            }
        })
        res.send(category);

    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

exports.list =async (req,res)=>{
    try {
const category = await prisma.category.findMany({
    include:{
        images:true
    }
})
        res.send(category);
    } catch (error) {
        console.log(err)
        res.status(500).json({message:"Server Error"})
    }
}

exports.remove =async (req,res)=>{

    try {
        const { id}=req.params
       const category = await prisma.category.delete({
        where:{
            id:Number(id)
        }
       })
        res.send(category);
    } catch (error) {
        console.log(err)
        res.status(500).json({message:"Server Error"})
    }
}

exports.update =async (req,res)=>{

    try {
        const {id, name } = req.body; 
        if (!id || !name) {
            return res.status(400).json({ message: "ID and Name are required" });
          }
       const category = await prisma.category.update({
        where:{
            id:Number(id), 
        },
        data: {
            name:name
        }
       })
        res.send(category);
    } catch (error) { 
        res.status(500).json({message:"Server Error"})
    }
}


exports.search = async(req,res)=>{
    try {
        const { name } = req.body;
        if (!name) {
            const category = await prisma.category.findMany();
            return res.send(category);
        }
        const category = await prisma.category.findMany({
            where:{
                name:{
                    contains:name,
                }
            }
        })
        if (category.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
          }
                res.send(category);
            } catch (error) {
                console.log(error)
                res.status(500).json({message:"Server Error"})
            }
}
