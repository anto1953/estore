const mongoose = require('mongoose');
const { Schema } = mongoose;

const offerSchema = new Schema(
  {
    offerCode: {
      type: String,
      required: true,
      unique: true,
    },
    offerName: {
        type: String,
        required:true
    },
    discount: {
      type: Number,
      required: true,
      min: 0,
    },
    offerType: {
        type: String,
        enum: ['Product Offer', 'Category Offer','Referral Offer'],
        required: true
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const Offer = mongoose.model('Offers', offerSchema);

module.exports = Offer;
