const mongoose = require("mongoose");
const Razorpay = require("razorpay");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        required: true,
      },
      pname: {
        type: String,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
      image: {
        type: String,
        required: false,
      },
      isCancelled: {
        type: Boolean,
        default: false,
      },
      isReturned: {
        type: Boolean,
      },
      returnRequest: {
        type: String,
      },
      returnRequestStatus: {
        type: String,
        enum: ["Request Pending", "Return Accepted", "Return Rejected"],
      },
      orderStatus: {
        type: String,
        default: "Pending",
        enum: [
          "Pending",
          "Processing",
          "Shipped",
          "Delivered",
          "Cancelled",
          "returned",
          "Return Request Accepted",
          "Return Request Rejected",
        ],
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ["wallet", "online Payment", "razorpay", "cash_on_delivery"],
  },
  razorpayOrderId:{
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ["Payment Pending", "Failed", "Success"],
  },
  orderStatus: {
    type: String,
    default: "Pending",
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
      "returned",
      "Return Request Accepted",
      "Return Request Rejected",
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  returnRequest: {
    type: String,
  },
  returnRequestStatus: {
    type: String,
    enum: ["Request Pending", "Return Accepted", "Return Rejected"],
  },
  discount: {
    type: Number,
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "coupons",
  },
});

module.exports = mongoose.model("orders", orderSchema);
