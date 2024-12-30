const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");

const checkAnySessionMiddleware = (req, res, next) => {
  if (req.session.user || req.session.admin) {
    return res.json({
      status: "error",
      message: "A user is already loggedin",
    });
  } else {
    next();
  }
};

const checkSessionMiddleware = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

const blockCheckMiddleware = async (req, res, next) => {
  try {
    const user = req.session.user;
    const userRecord = await User.findById(user._id);

    if (userRecord && !userRecord.isBlocked) {
      req.session.user.isBlocked = false;
      next();
    } else {
      req.session.user.isBlocked = true;
      res.redirect("/userBlockPage");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send(error);
  }
};

const checkCategoryisListed = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(id).populate("category");
    if (!product.category.isListed) {
      return res.json({
        status: "error",
        message: "this products category is currntly unlisted.",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

module.exports = {
    checkSessionMiddleware,
    blockCheckMiddleware,
    checkCategoryisListed,
    checkAnySessionMiddleware,
}