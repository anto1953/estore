const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',  
    required: true,
  },
  products: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,  
      ref: 'products', 
      required: true,
    },
    pname: {
      type:String
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
    default:false
    },
    isReturned: {
      type:Boolean,
      
    },
    returnRequest: {
      type:String
    },
    returnRequestStatus: {
      type: String,
      enum: ['Request Pending','Return Accepted','Return Rejected']
    },
    orderStatus: {
      type: String,
      default: 'Pending',  
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled','returned','Return Request Accepted','Return Request Rejected'],  
    }
  }],
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
    enum: ['Credit Card', 'online Payment','razorpay', 'cash_on_delivery'],  
  },
  orderStatus: {
    type: String,
    default: 'Pending',  
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled','returned','Return Request Accepted','Return Request Rejected'],  
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
    type:String
  },
  returnRequestStatus: {
    type: String,
    enum: ['Request Pending','Return Accepted','Return Rejected']
  },
  discount: {
    type:Number
  }
});

module.exports = mongoose.model("orders", orderSchema);
