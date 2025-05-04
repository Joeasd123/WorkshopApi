const prisma = require("../config/prisma");

exports.create =async (req,res)=>{

    try {
        const {title,description,price,quantity,categoryId,images =[]} = req.body
        if (!title || !description || !price || !quantity || !categoryId) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const category = await prisma.category.findUnique({
            where: {
                id: categoryId
            }
        });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        const product = await prisma.product.create({
            data: {
                title: title,
                description:description,
                price:price,
                quantity:quantity,
                categoryId:categoryId,
                images: images.length >0 ?
                {
                    create:images.map(img =>({
                        url: img,
                        
                    }))
                }:undefined
              
            },
            include:{
                images:true
            }
        });
       
     
     
        res.send(product);

    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Server Error"})
    }
}

exports.list = async(req,res)=>{
    try {
        const { title,categoryId } = req.body;
        if (!title) {
            const product = await prisma.product.findMany({
                where: {
                    categoryId: categoryId 
                },
                include: {
                    images: true,
                }
            });
        
            return res.send(product);
        }

        const product = await prisma.product.findMany({
            where:{
                title:{
                    contains:title,
                },
                categoryId: categoryId
            },
            include: {
                images: true, 
            }
        })
        if (product.length === 0) {
            return res.status(404).json({ message: 'product not found' });
          }
                res.send(product);
            } catch (error) {
                console.log(error)
                res.status(500).json({message:"Server Error"})
            }
}
