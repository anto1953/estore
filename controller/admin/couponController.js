const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders = require("../../model/orderSchema");
const Coupons = require("../../model/couponSchema");
const Offers = require("../../model/offerSchema");

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

const editCouponPOst = async (req, res) => {
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
  }

  module.exports={
    coupons,
    addCoupon,
    addCouponPost,
    deleteCoupon,
    editCoupon,
    editCouponPOst,
  }