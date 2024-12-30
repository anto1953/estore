const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders = require("../../model/orderSchema");
const Coupons = require("../../model/couponSchema");
const Offers = require("../../model/offerSchema");

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

  module.exports = {
    categories,
    editcategory,
    editcategorypost,
    addcategory,
    addcategorypost,
    listCategory,
  }