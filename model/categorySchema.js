const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  value: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  isListed: {
    type: Boolean
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  offers: [{   
    offerId: {
  type: mongoose.Schema.Types.ObjectId, 
  ref: 'Offers',
 }}]
  // offers: [{
  //   offerId: {
  //     type: mongoose.Schema.Types.ObjectId,
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
});

module.exports = mongoose.model('categories', categorySchema);
