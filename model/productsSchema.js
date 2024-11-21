const mongoose = require("mongoose");
const { type } = require("os");
const { array } = require("../services/admin/productServices");

const productsSchema = new mongoose.Schema({
  pname: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  pprice: {
    type: Number,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  image: {
    type: [String],
    required: false,
  },
  stock: {
    type: Number,
    required: true,
  },
  rating: {
    type: Number,
    required: false,
  },
  reviews: {
    type: Array(Object),
    required: false,
  },
  index: {
    type: Number,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  popularity: Number,
  ratings: Number,
  featured: Boolean,
});

module.exports = mongoose.model("products", productsSchema);
