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

const topbar = [
  checkSessionMiddleware,
  async (req, res) => {
    try {
      if (req.session.admin) {
        res.render("topbar");
      }
    } catch (error) {
      res.send(error.message);
    }
  },
];

const sidebar = [
  checkSessionMiddleware,
  async (req, res) => {
    try {
      res.render("sidebar");
    } catch (error) {
      res.send(error.message);
    }
  },
];
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
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const searchQuery = req.query.search || "";
  const searchFilter = searchQuery
    ? { pname: { $regex: searchQuery, $options: "i" } }
    : {};

  try {
    if (req.session.admin) {
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
    if (req.session.admin) {
      const categories = await Category.find();
      res.render("admin/addproduct", { categories });
    }
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
    if (req.session.admin) {
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
  const orderid = req.params.id;

  try {
    const order = await Orders.findById({ _id: orderid });
    const user = await User.findById(order.userId);

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

    if (order.paymentMethod === "Razorpay") {
      const transactionId = `TID-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;

      user.wallet.balance += order.totalPrice;
      user.wallet.transactions.push({
        transactionId: transactionId,
        orderId: orderid,
        amount: order.totalPrice,
        date: new Date(),
        description: `Refund for returned order #${order._id
          .toString()
          .substring(0, 6)}`,
        type: "credit",
      });
      await user.save();
    }

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

const getReturnAProductRequest = [
  checkSessionMiddleware,
  async (req, res) => {
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
  },
];

const acceptAProductReturnRequest = async (req, res) => {
  console.log("params", req.params);
  const { orderId, productId } = req.params;

  try {
    const order = await Orders.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found." });
    }

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

    const productTotal = product.price * product.quantity;
    order.totalPrice -= productTotal;
    // Save the updated order
    await order.save();

    if (order.paymentMethod === "Razorpay") {
      const transactionId = `TID-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)
        .toUpperCase()}`;
      user.wallet.balance += product.total;
      user.wallet.transactions.push({
        transactionId,
        orderId,
        amount: product.total,
        date: new Date(),
        description: `Refund for returned product #${productId.substring(
          0,
          6
        )} in order #${orderId.substring(0, 6)}`,
        type: "credit",
      });

      // Save the updated user
      await user.save();
    }

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

    const productTotal = product.price * product.quantity;
    order.totalPrice -= productTotal;

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

const sales = async (req, res) => {
  try {
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

    // Render sales report view
    res.render("admin/sales", {
      totalSales,
      totalSalesAmount: salesData[0].totalOrderAmount,
      salesReport: salesData[0] || null,
      totalDiscountAmount: salesData[0].totalDiscount,
      mostOrderedProduct: mostOrderedProduct.pname,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "something error" });
  }
};

const salesReport = async (req, res) => {
  try {
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
    } else if (reportType === "weekly") {
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

    // Query the orders collection and populate related fields
    const orders = await Orders.find(filter)
      .populate("userId", "name email address") // Assuming `userId` references the User schema
      .populate("products.productId", "name price") // Assuming `products.productId` references the Product schema
      .lean();

    if (!orders.length) {
      return res.status(404).send("No orders found for the selected period.");
    }

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    // Generate Report based on format
    if (format === "pdf") {
      const doc = new PDFDocument();
      const fileName = `sales-report-${reportType}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

      doc.pipe(res);

      // PDF Header
      doc.fontSize(18).text("Sales Report", { align: "center" });
      doc.text(`Report Type: ${reportType}`, { align: "center" });
      doc.text(`Total Orders: ${totalOrders}`);
      doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`);
      doc.moveDown();

      // PDF Table
      orders.forEach((order, index) => {
        doc.fontSize(12).text(
          `Order #${index + 1}:
      Order ID: ${order._id}
      User Name: ${order.userId.name}
      User Email: ${order.userId.email}
      User Address: ${order.address}
      Order Status: ${order.orderStatus}
      payment method: ${order.paymentMethod}
      Created At: ${order.createdAt}

      Products:
      `
        );
      
        // Add product details
        order.products.forEach((product) => {
          doc.text(
            `  - Product Name: ${product.pname}
          Quantity: ${product.quantity}
          Price: ₹${product.price}`
          );
        });
      
        // Add discount and total price after product details
        doc.text(
          `   Discount Applied: ${order.discount || "N/A"}
            Total Price: ₹${order.totalPrice}`
        );
      
        doc.text("----------------------------------------");
      });
      
      doc.end();
      
    } else if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sales Report");

      // Excel Header
      worksheet.columns = [
        { header: "Order ID", key: "_id", width: 30 },
        { header: "User Name", key: "userName", width: 20 },
        { header: "User Email", key: "userEmail", width: 25 },
        { header: "User Address", key: "userAddress", width: 30 },
        { header: "Total Price (₹)", key: "totalPrice", width: 15 },
        { header: "Discount", key: "discount", width: 15 },
        { header: "Order Status", key: "orderStatus", width: 15 },
        { header: "Created At", key: "createdAt", width: 20 },
      ];

      // Adding rows
      orders.forEach((order) => {
        worksheet.addRow({
          _id: order._id,
          userName: order.userId.name,
          userEmail: order.userId.email,
          userAddress: order.userId.address,
          totalPrice: `₹${order.totalPrice}`,
          discount: order.discount || "N/A",
          orderStatus: order.orderStatus,
          createdAt: order.createdAt.toISOString(),
        });

        // Add product details as sub-rows
        order.products.forEach((product) => {
          worksheet.addRow({
            _id: `  - Product: ${product.pname}`,
            userName: "",
            userEmail: "",
            userAddress: "",
            totalPrice: `  Quantity: ${product.quantity}, Subtotal: ₹${product.total}`,
          });
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
    console.error("Error generating sales report:", err);
    res
      .status(500)
      .send("An error occurred while generating the sales report.");
  }
};



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
  sales,
  salesReport,
};
