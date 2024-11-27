const mongoose=require('mongoose');
const couponSchema=new mongoose.Schema({
    couponCode: { type: String, required: true, unique: true },
    discount: { type: Number, required: true }, 
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 1 },
    isListed: { type: Boolean},
    

},{timestamps:true})

module.exports=mongoose.model('coupons',couponSchema)