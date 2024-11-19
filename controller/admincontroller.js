const User = require("../model/userSchema");
const Product = require("../model/productsSchema");
const Category = require("../model/categorySchema");
const Cart = require("../model/cartSchema");
const Orders = require("../model/orderSchema");
const Coupons = require("../model/couponSchema");
const Offers = require("../model/offerSchema");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const { log, error } = require("console");
const { query } = require("express");
const { disconnect } = require("process");

const checkSessionMiddleware = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/login");
  }
};

const adminLogout = async (req, res) => {
  console.log("adminlogout");

  try {
    req.session.destroy((err) => {
      if (err) {
        Server;
        return res.status(500).json({
          status: "error",
          message: "failed to logout",
        });
      }
      res.redirect("/userhome");
    });
  } catch (error) {
    res.send(error.message);
  }
};

const users = async (req, res) => {
  const query = req.query.search ? req.query.search.toLowerCase() : "";
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search || ""; // Use 'q' for search consistency
  const searchFilter = searchQuery
    ? { name: { $regex: searchQuery, $options: "i" } }
    : {};

  try {
    if (req.session.admin) {
      // Fetch paginated users based on search filter
      const users = await User.find(searchFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      const count = await User.countDocuments(searchFilter); // Total number of matching users

      // Render view with pagination and search data
      res.render("admin/users", {
        users: users,
        query: searchQuery,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery: searchQuery,
        limit: limit,
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: error.message,
    });
  }
};

const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: true });
    res.redirect("/admin/users");
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
};

//unblock user
const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndUpdate(userId, { isBlocked: false });
    res.redirect("/admin/users");
  } catch (error) {
    console.log(error.message);
    res.status(500).send(error.message);
  }
};

const topbar = async (req, res) => {
  try {
    if (req.session.admin) {
      res.render("topbar");
    }
  } catch (error) {
    res.send(error.message);
  }
};

const sidebar = async (req, res) => {
  try {
    if (req.session.admin) {
      res.render("sidebar");
    }
  } catch (error) {
    res.send(error.message);
  }
};
const _header = async (req, res) => {
  try {
    if (req.session.admin) {
      res.render("_header");
    }
  } catch (error) {
    res.send(error.message);
  }
};
const products = async (req, res) => {
  const query = req.query.search ? req.query.search.toLowerCase() : "";
  const page = parseInt(req.query.page) || 1; // Corrected this line
  const limit = 10;
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search || ""; // Adjusted for consistent search handling
  const searchFilter = searchQuery
    ? { pname: { $regex: searchQuery, $options: "i" } }
    : {};

  try {
    if (req.session.admin) {
      // Fetch paginated products based on search filter
      let products = await Product.find(searchFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      const count = await Product.countDocuments(searchFilter); // Total number of matching products
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
    }
  } catch (error) {
    res.send(error.message);
  }
};

const relistProduct = async (req, res) => {
  try {
    if (req.session.admin) {
      const productid = req.params.id;
      const result = await Product.findByIdAndUpdate(
        productid,
        { listed: true },
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
});

//image processing helper
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
    if (req.session.admin) {
      const categories = await Category.find();
      res.render("admin/addproduct", { categories });
    }
  } catch (error) {
    res.send(error.message);
  }
};

const addproductpost = async (req, res) => {
  console.log('add product',req.body);
  
  try {
    const { pname, description, pprice, category, stock } = req.body;
    const normalizedPname = pname.trim().replace(/\s+/g, ' ');

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
    if (req.session.admin) {
      const productId = req.params.id;
      const product = await Product.findById(productId);
      const categories = await Category.find();
      if (!product) {
        return res.status(404).send("product not found");
      }
      res.render("admin/editproduct", { product, categories });
    }
  } catch (error) {
    res.send(error.message);
  }
};

const editproductpost = async (req, res) => {
  console.log(req.body, 'image', req.files);
  try {
    const productid = req.params.id;
    const { pname, pprice, imagesToRemove, description, category, stock } = req.body;

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
      const fs = require('fs');
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
    if (req.session.admin) {
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
        { listed: !product.listed },
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
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

const categories = async (req, res) => {
  const query = req.query.search ? req.query.search.toLowerCase() : "";
  const page = parseInt(req, query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search || "";
  const searchFilter = searchQuery
    ? { value: { $regex: searchQuery, $options: "i" } }
    : {};
  try {
    if (req.session.admin) {
      const categories = await Category.find(searchFilter)
        .skip(skip)
        .limit(limit);
      const count = await Category.countDocuments(searchFilter);
      res.render("admin/categories", {
        categories: categories,
        query: query,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery,
      });
    }
  } catch (error) {
    res.send(error.message);
  }
};

const editcategory = async (req, res) => {
  try {
    if (req.session.admin) {
      const categoryId = req.params.id;
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).send("category not found");
      }
      res.render("admin/editcategory", { category });
    }
  } catch (error) {
    res.send(error.message);
  }
};

const editcategorypost = async (req, res) => {
  console.log(req.body);
  try {
    const categoryid = req.params.id;
    let { value } = req.body;
    const trimvalue=value.trim(); 
    const existcategory = await Category.findOne({
      value: { $regex: new RegExp(`^${trimvalue}$`, "i") },
      _id: { $ne: categoryid },
    });
    if (existcategory) {
      return res.status(400).json({
        status: "error",
        message: "category already exist",
      });
    } else {
      const updatedcategory = await Category.findByIdAndUpdate(
        categoryid,
        { value:trimvalue, label: trimvalue },
        { new: true }
      );
      console.log("edit");

      if (!updatedcategory) {
        return res.status(404).json({
          status: "error",
          message: "category not found",
        });
      } else {
        return res.status(400).json({
          status: "success",
          message: "category edited",
        });
      }
    }
  } catch (error) {
    res.send(error.message);
  }
};

const addcategory = async (req, res) => {
  try {
    if (req.session.admin) {
      res.render("admin/addcategory");
    }
  } catch (error) {
    res.send(error.message);
  }
};

const addcategorypost = async (req, res) => {
  console.log("add category");

  try {
    const { value } = req.body;
    console.log(value);
    const trimvalue=value.trim()
    const existcategory = await Category.findOne({
      value: { $regex: new RegExp(`^${trimvalue}$`, "i") },
    });
    if (existcategory) {
      console.log("exist");

      return res.status(400).json({
        status: "error",
        message: "category already exist",
      });
    } else {
      console.log("not exist");

      const category = new Category({ value: value, label: value });
      const cactegorydata = await category.save();
      if (cactegorydata) {
        return res.json({
          status: "success",
          message: "category added successfully",
        });
      } else {
        return res.json({
          status: "error",
          message: "failed",
        });
      }
    }
  } catch (error) {
    res.send(error.message);
  }
};

const deletecategory = async (req, res) => {
  try {
    if (req.session.admin) {
      const categoryid = req.params.id;
      const category = await Category.find({});
      const categorydata = await Category.findByIdAndDelete(categoryid, {
        deleted: true,
      });
      if (categorydata) {
        res.status(400).json({
          status: "success",
          message: "category deleted successfully",
        });
      } else
        res.status(404).json({
          status: "error",
          message: "category not found",
        });
    }
  } catch (error) {
    res.send(error.message);
  }
};
const orders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search || "";
  const searchFilter = searchQuery
    ? { pname: { $regex: searchQuery, $options: "i" } }
    : {};

  try {
    let orders = await Orders.find(searchFilter)
      .populate("products.productId")
      .sort({ updatedAt: -1 })
      .populate("userId")
      .populate("products.productId")
      .skip(skip)
      .limit(limit);
    const count = await Orders.countDocuments(searchFilter);

    res.render("admin/orders", {
      orders: orders,
      query: searchQuery,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      searchQuery: searchQuery,
    });
  } catch (error) {
    res.send(error.message);
  }
};

const updateOrderStatus = async (req, res) => {
  const { orderId, status } = req.body;
  try {
    await Orders.updateOne({ _id: orderId }, { orderStatus: status });
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.json({ success: false });
  }
};

const cancelOrder = async (req, res) => {
  console.log(req.body);

  const { orderId } = req.body;
  try {
    const order = await Orders.findById(orderId).populate({
      path: "products.productId",
    });
    const cancelled = await Orders.updateOne(
      { _id: orderId },
      { orderStatus: "Cancelled" }
    );
    if (cancelled.modifiedCount > 0) {
      for (const item of order.products) {
        const product = item.productId;
        const quantityOrdered = item.quantity;
        await Product.updateOne(
          { _id: product._id },
          { $inc: { stock: quantityOrdered } }
        );  
      }
      res.json({
        status: "success",
        message: "Order cancelled and stock restored",
      });
    } else {
      res.json({
        status: "error",
        message: "failed to cancel",
      });
    }
  } catch (error) {
    console.log("Error cancelling order:", error);
    res.json({ success: false });
  }
};

const getReturnRequest = [
  checkSessionMiddleware,
  async (req, res) => {
    const orderid = req.params.id;
    try {
      const order = await Orders.findById(orderid);
      if (order) {
        res.json({ status: "success", returnRequest: order.returnRequest });
      } else {
        res.json({ status: "error", message: "Order not found." });
      }
    } catch (error) {
      res.status(500).json({ status: "error", message: "An error occurred." });
    }
  },
];

const acceptReturnRequest = async (req, res) => {
  console.log("params", req.params);
  console.log("body", req.body);
  const orderid = req.params.id;

  try {
    const order = await Orders.findByIdAndUpdate(
      orderid,
      {
        returnRequestStatus: "Return accepted",
        orderStatus: "Return Request Accepted",
        $set: {
          "products.$[].isReturned": true, // Update 'isReturned' for all products
        },
      },
      { new: true }
    );
    if (order) {
      res.json({ status: "success", message: "Return request accepted." });
    } else {
      res.json({ status: "error", message: "Order not found." });
    }
  } catch (error) {
    console.log(error);

    res.status(500).json({ status: "error", message: "An error occurred." });
  }
};

const rejectReturnRequst = async (req, res) => {
  try {
    const order = await Orders.findByIdAndUpdate(
      req.params.id,
      {
        returnRequestStatus: "Return Rejected",
        orderStatus: "Return Request Rejected ",
      },
      { new: true }
    );
    if (order) {
      res.json({ status: "success", message: "Return request rejected." });
    } else {
      res.json({ status: "error", message: "Order not found." });
    }
  } catch (error) {
    res.status(500).json({ status: "error", message: "An error occurred." });
  }
};

const coupons = [
  checkSessionMiddleware,
  async (req, res) => {
    const query = req.query.search ? req.query.search.toLowerCase() : "";
    const page = parseInt(req, query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const searchFilter = searchQuery
      ? { couponCode: { $regex: searchQuery, $options: "i" } }
      : {};
    try {
      const now = new Date();
      await Coupons.updateMany(
        { expiryDate: { $lt: now }, isListed: true },
        { $set: { isListed: false } }
      );

      const coupons = await Coupons.find(searchFilter).skip(skip).limit(limit);
      const count = await Coupons.countDocuments(searchFilter);

      res.render("admin/coupons", {
        coupons: coupons,
        query: query,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery,
      });
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  },
];

const addCoupon = [
  checkSessionMiddleware,
  async (req, res) => {
    try {
      res.render("admin/addcoupon");
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  },
];

const addCouponPost = async (req, res) => {
  try {
    console.log(req.body);
    const { couponCode, discount, expiryDate, usageLimit } = req.body;
    const existCoupon = await Coupons.findOne({
      couponCode: { $regex: new RegExp(`^${couponCode}$`, "i") },
    });
    if (existCoupon) {
      return res.json({
        status: "error",
        message: "coupon is already exist",
      });
    } else {
      const coupon = new Coupons({
        couponCode,
        discount,
        expiryDate,
        usageLimit,
      });
      const couponData = await coupon.save();
      if (couponData) {
        res.json({
          status: "success",
          message: "coupon added successfully",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const couponid = req.params.id;
    const coupon = await Coupons.findById({ _id: couponid });
    const updatedcoupon = await Coupons.findByIdAndUpdate(
      couponid,
      { isListed: !coupon.isListed },
      { new: true }
    );
    if (updatedcoupon) {
      res.json({
        status: "success",
        message: coupon.isListed ? "coupon listed" : "coupon unlisted",
      });
    } else {
      res.json({
        status: "error",
        message: "can't update",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something wrong",
    });
  }
};

const editCoupon = [
  checkSessionMiddleware,
  async (req, res) => {
    try {
      const couponid = req.params.id;
      const coupon = await Coupons.findById({ _id: couponid });
      if (coupon) {
        res.render("admin/editCoupon", { coupon });
      } else {
        res.json({
          status: "error",
          message: "coupon  not found",
        });
      }
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something wrong",
      });
    }
  },
];

const editCouponPOst = [
  async (req, res) => {
    try {
      console.log("coupon", req.body);
      const couponid = req.params.id;
      const { couponCode, discount, expiryDate, usageLimit, status } = req.body;
      const existCoupon = await Coupons.findOne({
        value: { $regex: new RegExp(`^${couponCode}$`, "i") },
        _id: { $ne: couponid },
      });
      if (existCoupon) {
        return res.status(400).json({
          status: "error",
          message: "coupon already exist",
        });
      } else {
        const editCoupon = await Coupons.findByIdAndUpdate(
          { _id: couponid },
          { couponCode, discount, expiryDate, usageLimit, status },
          { new: true }
        );
        if (editCoupon) {
          res.json({
            status: "success",
            message: "coupon edited successfully",
          });
        } else {
          res.json({
            status: "error",
            message: "something error",
          });
        }
      }
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something wrong",
      });
    }
  },
];

const offers = [
  checkSessionMiddleware,
  async (req, res) => {
    const query = req.query.search ? req.query.search.toLowerCase() : "";
    const page = parseInt(req, query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const searchFilter = searchQuery
      ? { offerName: { $regex: searchQuery, $options: "i" } }
      : {};
    try {
      const now = new Date();
      await Offers.updateMany(
        { expiryDate: { $lt: now }, isListed: true },
        { $set: { isListed: false } }
      );

      const offers = await Offers.find(searchFilter).skip(skip).limit(limit);
      const count = await Offers.countDocuments(searchFilter);

      res.render("admin/offers", {
        offers: offers,
        query: query,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery,
      });
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  },
];

const addOffer = [
  checkSessionMiddleware,
  async (req, res) => {
    try {
      res.render("admin/addOffer");
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  },
];

const addOfferPost = async (req, res) => {
  try {
    console.log("offers", req.body);

    const { offerName, offerCode, offerType, discount, expiryDate, status } =
      req.body;
    const existOffer = await Offers.findOne({
      offerCode: { $regex: new RegExp(`^${offerCode}$`, "i") },
    });
    if (existOffer) {
      res.json({
        status: "error",
        message: "offer is already exist",
      });
    } else {
      const offer = new Offers({
        offerName,
        offerCode,
        offerType,
        discount,
        expiryDate,
        status,
      });
      const offerData = await offer.save();

      if (offerData) {
        res.json({
          status: "success",
          message: "offer added successfully",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something wrong",
    });
  }
};

const editOffer = [
  checkSessionMiddleware,
  async (req, res) => {
    try {
      const offerid = req.params.id;
      const offer = await Offers.findById({ _id: offerid });
      if (offer) {
        res.render("admin/editOffer", { offer });
      } else {
        res.json({
          status: "error",
          message: "offer not found",
        });
      }
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something wrong",
      });
    }
  },
];

const editOfferPost = async (req, res) => {
  try {
    const offerid = req.params.id;
    const { offerName, offerCode, expiryDate, discount, offerType, status } =
      req.body;
    const existOffer = await Offers.findOne({
      offerCode: { $regex: new RegExp(`^${offerCode}$`, "i") },
      _id: { $ne: offerid },
    });
    if (existOffer) {
      res.json({
        status: "error",
        message: "coupon  already exist",
      });
    } else {
      const editOffer = await Offers.findByIdAndUpdate(
        { _id: offerid },
        { offerName, offerCode, discount, expiryDate, offerType, status },
        { new: true }
      );
      if (editOffer) {
        res.json({
          status: "success",
          message: "offer edited successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "offer can't edit",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const listOffer = async (req, res) => {
  try {
    const offerid = req.params.id;
    const offer = await Offers.findById({ _id: offerid });
    const updatedoffer = await Offers.findByIdAndUpdate(
      offerid,
      { isListed: !offer.isListed },
      { new: true }
    );
    if (updatedoffer) {
      res.json({
        status: "success",
        message: offer.isListed ? "offer listed" : "offer unlisted",
      });
    } else {
      res.json({
        status: "error",
        message: "can't update",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const salesReport = [
  checkSessionMiddleware,
  async (req, res) => {
    try {
      const reportType = [];
      res.render("admin/salesReport");
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  },
];
module.exports = {
  checkSessionMiddleware,
  adminLogout,
  users,
  blockUser,
  unblockUser,
  topbar,
  sidebar,
  products,
  relistProduct,
  _header,
  addproduct,
  addproductpost,
  editproduct,
  toggleProductListed,
  editproductpost,
  categories,
  editcategory,
  editcategorypost,
  addcategory,
  addcategorypost,
  deletecategory,
  processImages,
  orders,
  updateOrderStatus,
  cancelOrder,
  getReturnRequest,
  acceptReturnRequest,
  rejectReturnRequst,
  coupons,
  addCoupon,
  addCouponPost,
  deleteCoupon,
  editCoupon,
  editCouponPOst,
  offers,
  addOffer,
  addOfferPost,
  editOffer,
  editOfferPost,
  listOffer,
  salesReport,
};
