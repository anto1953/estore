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
  popularity: Number,
  ratings: Number,
  featured: Boolean,
  offers: [{   
      offerId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Offers',
   }}]

});

module.exports = mongoose.model("products", productsSchema);

  // offers: [{
  //   offerId: {
      // type: mongoose.Schema.Types.ObjectId,
  //     ref: 'Offer',
  //     required: true
  //   },
  //   offerName: {
  //     type: String,
  //     required: true
  //   },
  //   offerCode: {
  //     type: String,
  //     required: true
  //   },
  //   discount: {
  //     type: Number,
  //     required: true
  //   },
  //   offerType: {
  //     type: String,
  //     required: true
  //   },
  //   expiryDate: {
  //     type: Date,
  //     required: true
  //   }
  // }]