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
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

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

  const searchQuery = req.query.search || "";
  const searchFilter = searchQuery
    ? { name: { $regex: searchQuery, $options: "i" } }
    : {};

  try {
      const users = await User.find(searchFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });
      const count = await User.countDocuments(searchFilter);

      // Render view with pagination and search data
      res.render("admin/users", {
        users: users,
        query: searchQuery,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery: searchQuery,
        limit: limit,
      });
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
        res.render("topbar");
    } catch (error) {
      res.send(error.message);
    }
  }

const sidebar = async (req, res) => {
    try {
      res.render("sidebar");
    } catch (error) {
      res.send(error.message);
    }
  }

const _header = async (req, res) => {
  try {
      res.render("_header");
  } catch (error) {
    res.send(error.message);
  }
};

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
    } catch (error) {
    res.send(error.message);
  }
};

const editcategory = async (req, res) => {
  try {
      const categoryId = req.params.id;
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).send("category not found");
      }
      res.render("admin/editcategory", { category });
    } catch (error) {
    res.send(error.message);
  }
};

const editcategorypost = async (req, res) => {
  console.log(req.body);
  try {
    const categoryid = req.params.id;
    let { value } = req.body;
    const trimvalue = value.trim();
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
        { value: trimvalue, label: trimvalue },
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
      res.render("admin/addcategory");
  } catch (error) {
    res.send(error.message);
  }
};

const addcategorypost = async (req, res) => {
  console.log("add category");

  try {
    const { value } = req.body;
    console.log(value);
    const trimvalue = value.trim();
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

const listCategory = async (req, res) => {
  try {
      const categoryId = req.params.id;

      const category = await Category.findById({ _id: categoryId });
      if (!category) {
        return res.status(404).json({
          status: "error",
          message: "Category not found",
        });
      }

      const updatedCategory = await Category.findByIdAndUpdate(
        categoryId,
        { isListed: !category.isListed },
        { new: true }
      );

      if (updatedCategory) {
        const updatedStatus = updatedCategory.isListed;
        const categoryName = category.value;
        const updateProducts = await Product.updateMany(
          { category: categoryName },
          { isListed: updatedStatus }
        );
        console.log("updatedproducts", updatedStatus);

        if (updateProducts.modifiedCount > 0) {
          return res.status(200).json({
            status: "success",
            message: updatedStatus
              ? "Category listed successfully"
              : "Category unlisted successfully",
          });
        } else {
          return res.json({
            status: "error",
            message: "No products found to update",
          });
        }
      } else {
        return res.status(400).json({
          status: "error",
          message: "Failed to update category listing",
        });
      }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "error",
      message: "something error",
    });
  }
};

const orders = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search || "";
  const searchFilter = searchQuery
    ? { orderStatus: { $regex: searchQuery, $options: "i" } }
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
    await Orders.updateOne(
      { _id: orderId },
      { orderStatus: status, $set: { "products.$[].orderStatus": status } }
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.json({ success: false });
  }
};

const   cancelOrder = async (req, res) => {
  console.log('cancel order details',req.body);

  const { orderId } = req.body;
  try {
    const order = await Orders.findById(orderId).populate({
      path: "products.productId",
      populate:{
        path:'coupon'
      }
    });

    const userId=order.userId
    const user=await User.findById(userId)    

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
        item.orderStatus='Cancelled',
        item.isCancelled=true
        await order.save();

      }
      const nonCancelledTotal = order.products
  .filter((product) => !product.isCancelled)
  .reduce((total, product) => total + product.price * product.quantity, 0);
      // const refundAmount=order.totalPrice-50;

      const transactionId = `TID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      if(order.paymentMethod==='razorpay'||order.paymentMethod==='wallet'){
        user.wallet.balance += nonCancelledTotal;

        user.wallet.transactions.push({
          transactionId: transactionId,
          orderId: order._id,
          amount: nonCancelledTotal,
          date: new Date(),
          description: `Refund for cancelled  order #${order._id.toString().substring(0, 6)}`,
          type: "credit",
        });

        await user.save();
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

const getReturnRequest = async (req, res) => {
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
  }

const acceptReturnRequest = async (req, res) => {
  const orderid = req.params.id;
  try {
    const order = await Orders.findById({ _id: orderid }).populate({
      path:'coupon'
    });
    console.log('orderrrr',order);
    
    const user = await User.findById(order.userId);

    const nonCancelledTotal = order.products
  .filter((product) => !product.isCancelled && !product.returnRequestStatus)
  .reduce((total, product) => total + product.price * product.quantity, 0);


  console.log('Non-cancelled total price:', nonCancelledTotal);

    const updatedOrder = await Orders.findByIdAndUpdate(
      orderid,
      {
        returnRequestStatus: "Return accepted",
        orderStatus: "Return Request Accepted",
        $set: {
          "products.$[].isReturned": true, // Update 'isReturned' for all products
          "products.$[].returnRequestStatus": "Return accepted",
        },
      },
      { new: true }
    );

    let refundAmount = nonCancelledTotal;
if (order.coupon && order.coupon.discount) {
      refundAmount = refundAmount * ( order.coupon.discount / 100);
    }

      const transactionId = `TID-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;
      
      user.wallet.balance += refundAmount;
      user.wallet.transactions.push({
        transactionId: transactionId,
        orderId: orderid,
        amount: refundAmount,
        date: new Date(),
        description: `Refund for returned order #${order._id
          .toString()
          .substring(0, 6)}`,
        type: "credit",
      });
      console.log('totalPrice',refundAmount);

      // srock increment
      for (const item of order.products) {
        if (!item.isReturned) { 
          const product = item.productId;
          const quantityReturned = item.quantity;
          await Product.updateOne(
            { _id: product },
            { $inc: { stock: quantityReturned } }
          );
        }
      }
      
      await user.save();

    if (updatedOrder) {
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
        $set: {
          "products.$[].returnRequestStatus": "Return Rejected", // Update each product's return status
        },
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

const getReturnAProductRequest = async (req, res) => {
    console.log("retuenaproduct", req.params);

    const { orderid, productId } = req.params;
    try {
      const order = await Orders.findById(orderid);
      if (order) {
        const product = order.products.find(
          (item) => item.productId.toString() === productId
        );
        if (product) {
          res.json({
            status: "success",
            returnRequest: product.returnRequest || false,
          });
        } else {
          res.json({
            status: "error",
            message: "Product not found in the order.",
          });
        }
      } else {
        res.json({ status: "error", message: "Order not found." });
      }
    } catch (error) {
      res.status(500).json({ status: "error", message: "An error occurred." });
    }
  }

const acceptAProductReturnRequest = async (req, res) => {
  console.log("params", req.params);
  const { orderId, productId } = req.params;

  try {
    const order = await Orders.findById(orderId).populate({
      path:'coupon'
    });
    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found." });
    }

    console.log('order',order);

    const user = await User.findById(order.userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found." });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );
    if (!product) {
      return res
        .status(404)
        .json({ status: "error", message: "Product not found in order." });
    }

    // Update the specific product's return request status
    product.returnRequestStatus = "Return Accepted";
    product.isReturned = true;

    // Save the updated order
    await order.save();

      const transactionId = `TID-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;
        let totalPrice=product.total;
        if(order.coupon&&order.discount){ 
          totalPrice=totalPrice * ( order.coupon.discount / 100);
         }
      user.wallet.balance += totalPrice;
      user.wallet.transactions.push({
        transactionId,
        orderId,
        amount: totalPrice,
        date: new Date(),
        description: `Refund for returned product #${productId.substring(
          0,
          6
        )} in order #${orderId.substring(0, 6)}`,
        type: "credit",
      });
      console.log('totalprice',totalPrice);
      

      // Save the updated user
      await user.save();

      const quantityReturned = product.quantity;
    await Product.updateOne(
      { _id: productId },
      { $inc: { stock: quantityReturned } }
    );

    res.json({
      status: "success",
      message: "Product return request accepted.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "An error occurred." });
  }
};

const rejectAProductReturnRequest = async (req, res) => {
  console.log("rejectAProductReturnRequest", req.params);

  const { orderId, productId } = req.params;
  try {
    const order = await Orders.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found." });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );
    if (!product) {
      return res
        .status(404)
        .json({ status: "error", message: "Product not found in order." });
    }

    // Update the specific product's return request status
    product.returnRequestStatus = "Return Rejected";

    // const productTotal = product.price * product.quantity;
    // order.totalPrice -= productTotal;

    // Save the updated order
    await order.save();

    res.json({
      status: "success",
      message: "Product return request rejected.",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "An error occurred." });
  }
};

const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Orders.findById({ _id: orderId })
      .populate("userId")
      .populate("products.productId");
    const user = await User.findById(order.userId);
    const address = user.addresses.find(
      (addr) => addr._id.toString() === order.address.toString()
    );

    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found" });
    }

    res.json({ order, address });
  } catch (error) {
    console.log("Error fetching order details:", error);
    res.status(500).json({ status: "error", message: "something error" });
  }
};

const coupons = async (req, res) => {
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
  }

const addCoupon = async (req, res) => {
    try {
      res.render("admin/addcoupon");
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  }

const addCouponPost = async (req, res) => {
  try {
    console.log(req.body);
    const { couponCode, discount, expiryDate, usageLimit } = req.body;
    const existCoupon = await Coupons.findOne({
      couponCode: { $regex: new RegExp(`^${couponCode.trim()}$`, "i") },
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

const editCoupon = async (req, res) => {
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
  }

const editCouponPOst = [
  async (req, res) => {
    try {
      console.log("coupon", req.body);
      const couponid = req.params.id;
      const { couponCode, discount, expiryDate, usageLimit, status } = req.body;
      const trimmedCouponCode=couponCode.trim().replace(/\s+/g, " ");
      console.log('trimeed coupon',trimmedCouponCode);
      
      const existCoupon = await Coupons.findOne({
        couponCode: { $regex: new RegExp(`^${trimmedCouponCode}$`, "i") },
        _id: { $ne: couponid },
      });
      console.log('existcoupon',existCoupon);
      
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

const offers = async (req, res) => {
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
      const category = await Category.find({});
      const products = await Product.find({});
      const offers = await Offers.find(searchFilter).skip(skip).limit(limit);
      const count = await Offers.countDocuments(searchFilter);

      res.render("admin/offers", {
        offers: offers,
        query: query,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery,
        products,
        category,
      });
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  }

const addOffer = async (req, res) => {
    try {
      res.render("admin/addOffer");
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  }

const addOfferPost = async (req, res) => {
  try {
    console.log("offers", req.body);

    const { offerName, offerCode, offerType, discount, expiryDate, status } =
      req.body;
    const existOffer = await Offers.findOne({
      offerCode: { $regex: new RegExp(`^${offerCode.trim()}$`, "i") },
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

const editOffer = async (req, res) => {
    try {
      const offerid = req.params.id;
      const offer = await Offers.findById({ _id: offerid });
      if (offer) {
        if (offer.expiryDate) {
          offer.expiryDate = offer.expiryDate.toISOString().split("T")[0];
        }
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
  }

const editOfferPost = async (req, res) => {
  try {
    const offerid = req.params.id;
    const { offerName, offerCode, expiryDate, discount, offerType, status } =
      req.body;
      const existOffer = await Offers.findOne({
        offerCode: { $regex: new RegExp(`^${offerCode.trim()}$`, "i") },
        _id: { $ne: offerid },
      });
      
    if (existOffer) {
      res.json({
        status: "error",
        message: "offer already exist",
      });
    } else {
      const editOffer = await Offers.findByIdAndUpdate(
        { _id: offerid },
        { offerName, offerCode, discount, expiryDate, offerType, status },
        { new: true }
      );
      if (editOffer) {
        // const updateProducts = await Product.updateMany(
        //   { "offers.offerId": offerid },
        //   {
        //     $set: {
        //       "offers.$[elem].offerName": offerName,
        //       "offers.$[elem].offerCode": offerCode,
        //       "offers.$[elem].discount": discount,
        //       "offers.$[elem].offerType": offerType,
        //       "offers.$[elem].expiryDate": expiryDate,
        //     },
        //   },
        //   {
        //     arrayFilters: [{ "elem.offerId": offerid }],
        //     multi: true,
        //   }
        // );

        // const updateCategories = await Category.updateMany(
        //   { "offers.offerId": offerid },
        //   {
        //     $set: {
        //       "offers.$[elem].offerName": offerName,
        //       "offers.$[elem].offerCode": offerCode,
        //       "offers.$[elem].discount": discount,
        //       "offers.$[elem].offerType": offerType,
        //       "offers.$[elem].expiryDate": expiryDate,
        //     },
        //   },
        //   {
        //     arrayFilters: [{ "elem.offerId": offerid }], // Only update the matched offer in the `appliedOffers` array
        //     multi: true, // Ensure all matching categories are updated
        //   }
        // );

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
        message: offer.isListed ? "offer unlisted" : "offer     listed",
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

const applyOfferToProducts = async (req, res) => {
  console.log("applyOfferToProducts", req.body, req.params);

  try {
    const { productIds } = req.body;
    const { id } = req.params;

    // Find the offer by ID
    const offer = await Offers.findById(id);
    if (!offer) {
      return res
        .status(400)
        .json({ status: "error", message: "Offer not found" });
    }

    // Fetch products to check for existing offers
    const products = await Product.find({ _id: { $in: productIds } });

    // Filter out products that already have the offer applied
    const productsToUpdate = products
      .filter(
        (product) =>
          !product.offers.some(
            (existingOffer) =>
              existingOffer.offerId.toString() === offer._id.toString()
          )
      )
      .map((product) => product._id);

    if (productsToUpdate.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Offer is already applied to the selected products",
      });
    }

    // Apply the offer to the filtered products
    await Product.updateMany(
      { _id: { $in: productsToUpdate } },
      {
        $addToSet: {
          offers: {
            offerId: offer._id,
            offerName: offer.offerName,
            offerCode: offer.offerCode,
            discount: offer.discount,
            offerType: offer.offerType,
            expiryDate: offer.expiryDate,
          },
        },
      }
    );

    return res.status(200).json({
      status: "success",
      message: `Offer applied to ${productsToUpdate.length} products`,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Something went wrong" });
  }
};

const applyOfferToCategories = async (req, res) => {
  console.log("applyOfferToCategories", req.body, req.params);

  try {
    const { categoryIds } = req.body;
    const { id } = req.params;

    // Find the offer by ID
    const offer = await Offers.findById(id);
    if (!offer) {
      return res
        .status(400)
        .json({ status: "error", message: "Offer not found" });
    }

    // Fetch categories based on IDs and extract their labels
    const categories = await Category.find({ _id: { $in: categoryIds } });

    // Filter categories that already have the offer applied
    const categoriesToUpdate = categories.filter(
      (category) =>
        !category.offers.some(
          (existingOffer) =>
            existingOffer.offerId.toString() === offer._id.toString()
        )
    );

    const categoryLabelsToUpdate = categoriesToUpdate.map(
      (category) => category.label
    );

    if (categoriesToUpdate.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Offer is already applied to the selected categories",
      });
    }

    // Apply the offer to the filtered categories
    await Category.updateMany(
      { _id: { $in: categoriesToUpdate.map((category) => category._id) } },
      {
        $addToSet: {
          offers: {
            offerId: offer._id,
            offerName: offer.offerName,
            offerCode: offer.offerCode,
            discount: offer.discount,
            offerType: offer.offerType,
            expiryDate: offer.expiryDate,
          },
        },
      }
    );

    // Fetch products belonging to the selected category labels
    const products = await Product.find({
      category: { $in: categoryLabelsToUpdate },
    });

    // Filter out products that already have the offer applied
    const productsToUpdate = products
      .filter(
        (product) =>
          !product.offers.some(
            (existingOffer) =>
              existingOffer.offerId.toString() === offer._id.toString()
          )
      )
      .map((product) => product._id);

    // Apply the offer to the filtered products
    if (productsToUpdate.length > 0) {
      await Product.updateMany(
        { _id: { $in: productsToUpdate } },
        {
          $addToSet: {
            offers: {
              offerId: offer._id,
              offerName: offer.offerName,
              offerCode: offer.offerCode,
              discount: offer.discount,
              offerType: offer.offerType,
              expiryDate: offer.expiryDate,
            },
          },
        }
      );
    }

    return res.status(200).json({
      status: "success",
      message: `Offer applied to ${categoriesToUpdate.length} categories and ${productsToUpdate.length} products`,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Something went wrong" });
  }
};

const adminhome = async (req, res) => {
  try {
    console.log('adminhome');
    const {filter}=req.query;
    console.log('filter',filter);
      
    const date=new Date();
    let startDate;

    if (filter === 'monthly') {
      startDate = new Date(date.getFullYear(), date.getMonth(), 1); // Start of the month
    } else if (filter === 'weekly') {
      startDate = new Date(date.setDate(date.getDate() - 7)); // Last 7 days
    } else if (filter === 'daily') {
      startDate = new Date(date.setDate(date.getDate()-1)); // Start of the day
    }else {
      startDate = new Date(date.getFullYear(), 0, 1); // Start of the year
    }  

    const ordersData = await Orders.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalSales: { $sum: "$totalPrice" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const orderStatusData = await Orders.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$orderStatus",
          count: { $sum: 1 },
        },
      },
    ]);
    
    const salesData = await Orders.aggregate([
      {
        $group: {
          _id: null,
          salesCount: { $sum: 1 },
          totalOrderAmount: { $sum: "$totalPrice" },
          totalDiscount: { $sum: "$discount" },
          totalCoupons: { $sum: "$totalCouponDiscount" },
        },
      },
    ]);

    const mostOrderedProductId = await Orders.aggregate([
      {
        $unwind: "$products",
      },
      {
        $group: {
          _id: "$products.productId",
          totalQuantity: { $sum: "$products.quantity" },
        },
      },
      {
        $sort: { totalQuantity: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    const mostOrderedProduct = await Product.findById(mostOrderedProductId);

    const totalSales = await Orders.countDocuments();

    const topProducts = await Orders.aggregate([
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalSold: { $sum: "$products.quantity" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },
    ]);

    const topCategories = await Orders.aggregate([
  { $unwind: "$products" }, 
  {
    $lookup: {
      from: "products",
      localField: "products.productId",
      foreignField: "_id",
      as: "productDetails",
    },
  },
  { $unwind: "$productDetails" }, 
  {
    $group: {
      _id: "$productDetails.category", 
      totalSold: { $sum: "$products.quantity" }, 
    },
  },
  { $sort: { totalSold: -1 } },
  { $limit: 5 }, 
]);    

    if (filter) {
      return res.json({
        ordersData,
        orderStatusData,
      });
    }else{
    res.render("admin/sales", {
      filter,
      orderStatusData,
      ordersData,
      topProducts,
      topCategories,
      totalSales,
      salesData,
      totalSalesAmount: salesData? salesData[0].totalOrderAmount.toFixed(2):null,
      salesReport: salesData[0] || null,
      totalDiscountAmount: salesData?salesData[0].totalDiscount.toFixed(2):null,
      mostOrderedProduct: mostOrderedProduct.pname,
    })};
  } catch (error) {
    console.log(error);
    res.send(`
      <html>
      <head>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
          <script>
              Swal.fire({
                  icon: 'error',
                  text: 'something error',
                  confirmButtonText: 'OK'
              }).then(() => {
            window.location.href='/admin/adminhome'
            });;
          </script>
      </body>   
  </html>
`);  }
};

const salesReport = async (req, res) => {
  try {
    
    console.log('salesreport',req.query);
    
    const { reportType, startDate, endDate, format } = req.query;

    // Date filtering logic
    let filter = {};
    if (reportType === "custom" && startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (reportType === "daily") {
      const today = new Date();
      filter.createdAt = {
        $gte: new Date(today.setHours(0, 0, 0)),
        $lte: new Date(today.setHours(23, 59, 59)),
      };
    } else if (reportType == "weekly") {
      const today = new Date();
      const weekStart = new Date(
        today.setDate(today.getDate() - today.getDay())
      );
      filter.createdAt = {
        $gte: new Date(weekStart.setHours(0, 0, 0)),
        $lte: new Date(),
      };
    } else if (reportType === "monthly") {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      filter.createdAt = { $gte: monthStart, $lte: new Date() };
    }

    const orders = await Orders.find(filter)
      .populate("userId") 
      .populate("products.productId") 
      .lean();

      console.log('orderaddress',orders);
      

    if (orders.length<0) {
      return res.json({
        status:'error',
        message:"No orders found for the selected period."
    })}

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);    

    // Generate Report based on format
    if (format === "pdf") {
      const doc = new PDFDocument({ margin: 30 });
      const fileName = `sales-report-${reportType}.pdf`;
    
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      doc.pipe(res);
    
      // PDF Header
      const currentDate = new Date();
      const dateAndTime = currentDate.toLocaleString();
      doc.fontSize(18).text("Sales Report", { align: "center" }).moveDown();
      doc.fontSize(15).text("E-store", { align: "center" })
      doc.fontSize(13).text("Online fashion store", { align: "center" })


      doc.fontSize(14).text(`Report Type: ${reportType}`);
      if(reportType=='custom'){
        doc.text(`Start Date: ${startDate}`);
        doc.text(`End Date: ${endDate}`);
      }
      doc.text(`Total Orders: ${totalOrders}`);
      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`).moveDown();
      doc.text(`Date: ${dateAndTime}`);

    
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    
      // Adjusted column widths
      const columnWidths = [
        pageWidth * 0.15, // Order ID
        pageWidth * 0.10, // User Name
        pageWidth * 0.17, // Payment Method
        pageWidth * 0.35, // Products
        pageWidth * 0.12, // Discount
        pageWidth * 0.11, // Total Price
      ];
    
      const startX = doc.page.margins.left;
      let currentY = doc.y;
    
      const tableHeaders = [
        "Order ID",
        "User Name",
        "Payment Method",
        "Products",
        "Discount",
        "Total Price",
      ];
    
      // Function to calculate row height dynamically
      const calculateRowHeight = (columns, columnWidths, fontSize) => {
        const padding = 10;
        return columns.reduce((maxHeight, text, index) => {
          const columnWidth = columnWidths[index] - padding;
          const lines = doc.heightOfString(text, { width: columnWidth, fontSize });
          return Math.max(maxHeight, lines);
        }, 0) + padding;
      };
    
      // Function to draw rows
      const drawRow = (y, columns, isHeader = false) => {
        const fontSize = isHeader ? 12 : 10;
        const rowHeight = calculateRowHeight(columns, columnWidths, fontSize);
    
        let x = startX;
    
        columns.forEach((text, index) => {
          const columnWidth = columnWidths[index];
    
          // Draw cell border
          doc
            .rect(x, y, columnWidth, rowHeight)
            .stroke();
    
          // Add text inside cell
          doc
            .fontSize(fontSize)
            .text(text, x + 5, y + 5, { width: columnWidth - 10, align: "left" });
    
          x += columnWidth;
        });
    
        return y + rowHeight; // Return the new Y position
      };
    
      // Draw Table Header
      currentY = drawRow(currentY, tableHeaders, true);
    
      // Table Body
      orders.forEach((order) => {        
        if (currentY > doc.page.height - 50) {
          doc.addPage();
          currentY = 50; // Reset Y position for new page
          currentY = drawRow(currentY, tableHeaders, true); // Redraw header
        }
    
        // Combine product details into a single string
        const productDetails = order.products
          .map(
            (product) =>
              `${product.productId.pname} (Qty: ${product.quantity}, ₹${product.price.toFixed(
                2
              )})`
          )
          .join("\n");
    
        // Order Row with dynamic row height
        currentY = drawRow(currentY, [
          order._id,
          order.userId.name,
          order.paymentMethod,
          productDetails,
          `₹${order.discount || 0}`, // Discount column
          `₹${order.totalPrice.toFixed(2)}`, // Total Price column
        ]);
      });
    
      doc.end();
    }
    
     else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales Report");

      // Excel Header
      worksheet.columns = [
        { header: "Order ID", key: "_id", width: 30 },
        { header: "User Name", key: "userName", width: 20 },
        { header: "Payment method", key: "PaymentMethod", width: 25 },
        { header: "Products", key: "Products", width: 30 },
        { header: "Discount", key: "discount", width: 15 },
        { header: "Total Price (₹)", key: "totalPrice", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];

      // Adding rows
      orders.forEach((order) => {
        worksheet.addRow({
          _id: order._id,
          userName: order.userId.name,
          PaymentMethod: order.paymentMethod,
          Products: order.products.map((product) => product.productId.pname).join(", "),
          totalPrice: `₹${order.totalPrice}`,
          discount: order.discount || "N/A",
          createdAt: order.createdAt.toISOString(),
        });

       
      });

      // Total Summary Row
      worksheet.addRow({});
      worksheet.addRow({ _id: "Total Orders:", totalPrice: totalOrders });
      worksheet.addRow({ _id: "Total Revenue:", totalPrice: `₹${totalRevenue.toFixed(2)}` });

      const fileName = `sales-report-${reportType}.xlsx`;
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

      await workbook.xlsx.write(res);
    
      res.end();
    } else {
      res.status(400).send("Invalid format specified.");
    }
  } catch (err) {
    console.log("Error generating sales report:", err);
    res.json({
      status:'error',
      message:"An error occurred while generating the sales report."

  })
}
}

const generateLedger= async (req, res) => {
  console.log('generateledger');
  
  try {
    // Fetch orders
    const orders = await Orders.find({}).populate('userId').populate('products.productId');

    // Format orders for CSV
    const ledgerData = orders.map((order, index) => ({
        SNo: index + 1,
        OrderID: order._id,
        UserName: order.userId ? order.userId.name : 'N/A',
        Products: order.products
            .map(product => `${product.productId ? product.productId.pname : 'Unknown Product'} (Qty: ${product.quantity})`)
            .join(', '),
        TotalPrice: `₹${order.totalPrice.toFixed(2)}`,
        OrderStatus: order.orderStatus,
        Date: new Date(order.createdAt).toLocaleDateString()
    }));

    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(ledgerData);

    // Set response headers for download
    res.header('Content-Type', 'text/csv');
    res.attachment('ledger.csv');
    res.send(csv);
} catch (error) {
    console.error('Error generating ledger:', error);
    res.status(500).send('Error generating ledger');
}
}



module.exports = {
  checkSessionMiddleware,
  adminLogout,
  adminhome,
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
  listCategory,
  processImages,
  orders,
  updateOrderStatus,
  cancelOrder,
  getReturnRequest,
  getReturnAProductRequest,
  acceptReturnRequest,
  rejectReturnRequst,
  acceptAProductReturnRequest,
  rejectAProductReturnRequest,
  orderDetails,
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
  applyOfferToProducts,
  applyOfferToCategories,
  salesReport,
  generateLedger
};
