const mongoose = require("mongoose");

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
  },
  isReturned: {
    type:Boolean,
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "coupons",
  },
  popularity: Number,
  ratings: Number,
  featured: Boolean,
  offers: [{
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offers',
    },
    offerName: {
      type: String
    },
    offerCode: {
      type: String
    },
    discount: {
      type: Number
    },
    offerType: {
      type: String
    },
    expiryDate: {
      type: Date
    }
  }]

});

module.exports = mongoose.model("products", productsSchema);
