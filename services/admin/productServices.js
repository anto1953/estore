// Importing Core Modules
const express=require('express')
const fs=require('fs');
const path=require('path');
const adminController=require('../../controller/admin/adminController')
const { fileURLToPath }=require("url");

// Importing extenal dependencies
const multer=require('multer')

const  productModel=require("../../model/productsSchema");


// Multer
const Storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "./public/uploads/products");
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() +  "-" + file.originalname);
    },
  });
  
   const upload = multer({ storage: Storage });
  // Multer
  
//   // Create Product
//   export async function createProduct(body, id, files) {
//     const fileNames = files.map((val) => val.filename);
  
//     const product = {
//       name: body.name,
//       description: body.description,
//       category: id,
//       images: fileNames,
//       original_price: body.og_price,
//       discounted_price: body.ds_price,
//       stock: body.stock,
//       category_name: body.category,
//     };
  
//     if (body.size) {
//       product.size_field = body.size;
//     }
//     if (body.size_values) {
//       const arr = body.size_values.split(",");
//       if (arr.length !== 0) {
//         product.size_options = arr;
//       }
//     }
  
//     try {
//       const newDocument = await productModel.create(product);
  
//       await categoryModel.updateOne(
//         { _id: id },
//         {
//           $push: {
//             products_id: newDocument._id,
//           },
//         }
//       );
  
//       return newDocument;
//     } catch (err) {
//       console.log(
//         `error while creating or updating category or product at createProduct at productServices ${err.message}`
//       );
//     }
// }

module.exports=upload;