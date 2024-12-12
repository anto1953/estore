const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Cart Schema
const cartSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId, // Reference to the User model
        ref: 'User', 
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId, // Reference to the Product model
            ref: 'products',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        total: {
            type: Number,
            required: true,
            default: function() {
                return this.price * this.quantity; 
            }
        },
        image: {
            type: String, 
            required: false 
        },
        category: {
            type: String
        },
        offers: [{
            offerId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Offers',
            },
            offerName: {
                type: String,
            },
            offerCode: {
                type: String,
            },
            discount: {
                type: Number,
            },
            offerType: {
                type: String,
            },
            expiryDate: {
                type: Date,
            }
        }],
        
    }],
    
    totalPrice: {
        type: Number,
        required: true,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update totalPrice when the products are updated
cartSchema.pre('save', function(next) {
    let total = 0;
    this.products.forEach(product => {
        total += product.total;
    });
    // Apply discounts from offers, if any
    if (this.offers && this.offers.length > 0) {
        this.offers.forEach(offer => {
            if (offer.discount) {
                total -= (total * offer.discount) / 100; // Assuming percentage discount
            }
        });
    }

    this.totalPrice = total;
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('carts', cartSchema);
