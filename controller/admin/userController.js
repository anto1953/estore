const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders = require("../../model/orderSchema");
const Coupons = require("../../model/couponSchema");
const Offers = require("../../model/offerSchema");

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

  module.exports = {
    users,
    blockUser,
    unblockUser
  }