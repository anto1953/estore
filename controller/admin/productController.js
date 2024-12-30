const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders = require("../../model/orderSchema");
const Coupons = require("../../model/couponSchema");
const Offers = require("../../model/offerSchema");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const products = async (req, res) => {
    const query = req.query.search ? req.query.search.toLowerCase() : "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
  
    const searchQuery = req.query.search || "";
    const searchFilter = searchQuery
      ? { pname: { $regex: searchQuery, $options: "i" } }
      : {};
  
    try {
        let products = await Product.find(searchFilter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 });
        const count = await Product.countDocuments(searchFilter);
        products = products.map((product) => {
          let image = product.image[0];
          product.image = image;
          return product;
        });
        res.render("admin/products", {
          products: products,
          query: searchQuery,
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          searchQuery: searchQuery,
        });
    } catch (error) {
      res.send(error.message);
    }
  };

  const relistProduct = async (req, res) => {
    try {
        const productid = req.params.id;
        const result = await Product.findByIdAndUpdate(
          productid,
          { isListed: true },
          { new: true }
        );
  
        if (result) {
          return res.status(200).json({
            status: "success",
            message: "Product re-listed successfully",
          });
        } else {
          return res.status(404).json({
            status: "error",
            message: "Product not found",
          });
        }
    } catch (error) {
      res.status(500).send(error.message);
    }
  };

  const storage = multer.memoryStorage();

  const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("please upload an image file"));
      }
      cb(null, true);
    },
  }).array("images", 6);
  
  const processImages = async (files) => {
    const processedImagePaths = [];
    for (const file of files) {
      const outputPath = path.join(
        __dirname,
        "../public/uploads",
        `${Date.now()}-${file.originalname}`
      );
      await sharp(file.buffer).resize(500, 500).toFile(outputPath);
      processedImagePaths.push(outputPath);
    }
    return processedImagePaths;
  };

  const addproduct = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render("admin/addproduct", { categories });
    } catch (error) {
      res.send(error.message);
    }
  };

  const addproductpost = async (req, res) => {
    console.log("add product", req.body);
    console.log("image", req.files);
  
    try {
      const { pname, description, pprice, category, stock } = req.body;
      const normalizedPname = pname.trim().replace(/\s+/g, " ");
  
      const existproduct = await Product.findOne({
        pname: { $regex: new RegExp(`^${normalizedPname}$`, "i") },
      });
      if (existproduct) {
        return res.status(400).json({
          status: "error",
          message: "product already exist",
        });
      }
     
  
      let image = req.files.map((file) => {
        return file.filename;
      });
      const product = new Product({
        pname: pname,
        pprice: pprice,
        description: description,
        category: category,
        image: image,
        stock: stock,
      });
  
      const productdata = await product.save();
      if (productdata) {
        return res.status(200).json({
          status: "success",
          message: "product added successfully",
        });
      } else {
        return res.status(500).json({
          status: "error",
          message: "failed to add product",
        });
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(error.message);
    }
  };

  const editproduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const product = await Product.findById(productId);
        const categories = await Category.find();
        if (!product) {
          return res.status(404).send("product not found");
        }
        res.render("admin/editproduct", { product, categories });
    } catch (error) {
      res.send(error.message);
    }
  };

  const editproductpost = async (req, res) => {
    console.log(req.body, "image", req.files);
    try {
      const productid = req.params.id;
      const { pname, pprice, imagesToRemove, description, category, stock } =
        req.body;
  
      const existproduct = await Product.findOne({
        pname: { $regex: new RegExp(`^${pname}$`, "i") },
        _id: { $ne: productid },
      });
      if (existproduct) {
        console.log("existproduct");
        return res.status(400).json({
          status: "error",
          message: "Product already exists",
        });
      }
  
      const existingProduct = await Product.findById(productid);
      if (!existingProduct) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }
  
      let image = existingProduct.image;
  
      if (imagesToRemove && Array.isArray(imagesToRemove)) {
        const fs = require("fs");
        imagesToRemove.forEach((img) => {
          const imagePath = `uploads/${img}`;
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
          image = image.filter((existingImg) => existingImg !== img);
        });
      }
  
      // Add new images
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => file.filename);
        image = image.concat(newImages);
      }
  
      const updatedProduct = await Product.findByIdAndUpdate(
        productid,
        { pname, pprice, description, category, image, stock },
        { new: true }
      );
  
      if (!updatedProduct) {
        return res.status(404).send("Product not found");
      } else {
        console.log("Product edited successfully with images");
        return res.status(200).json({
          status: "success",
          message: "Product edited successfully",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while editing the product",
      });
    }
  };

  const toggleProductListed = async (req, res) => {
    try {
        const productid = req.params.id;
        const product = await Product.findById(productid);
        if (!product) {
          return res.status(404).json({
            status: "error",
            message: "Product not found",
          });
        }
        const updatedProduct = await Product.findByIdAndUpdate(
          productid,
          { isListed: !product.isListed },
          { new: true }
        );
  
        if (updatedProduct) {
          return res.status(200).json({
            status: "success",
            message: updatedProduct.listed
              ? "Product listed successfully"
              : "Product unlisted successfully",
          });
        } else {
          return res.status(400).json({
            status: "error",
            message: "Failed to update product listing",
          });
      }
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: error.message,
      });
    }
  };

  module.exports = {
    addproduct,
    addproductpost,
    editproduct,
    toggleProductListed,
    editproductpost,
    products,
  relistProduct,
  processImages,

  }