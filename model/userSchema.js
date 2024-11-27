const { type } = require("os");
const { array } = require("../services/admin/productServices");
const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipcode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const wishlistSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the Product model
    ref: 'products',
    // required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
});


const userSchema = new mongoose.Schema({
  isLoggedIn: {
    type: Boolean,
  },
  name: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId;
    },
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: false,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    required: false,
  },
  googleId: {
    type: String,
    required: false,
    unique: true,
  },
  profileImage: {
    type: String,
  },
  addresses: {
    type: [addressSchema], // Embedding the addressSchema as an array
    default: [], // Ensures addresses is an array by default
  },
  country: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
},
wishlist: { type: [wishlistSchema], default: [] }, // Embedding the wishlist schema

wallet: {
  balance: { type: Number, default: 0 },  // User's wallet balance
  transactions: [
    {
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Orders' },  // Link to the order
      amount: { type: Number },  // Transaction amount
      date: { type: Date, default: Date.now }  // Date of the transaction
    }
  ]
},

});

module.exports = mongoose.model("User", userSchema);
