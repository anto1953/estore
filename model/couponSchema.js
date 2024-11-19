const mongoose=require('mongoose');
const couponSchema=new mongoose.Schema({
    couponCode: {
        type:String,
        required:true,
        unique:true
    },
    discount: {
        type:Number,
        required:true,
        min:0
    },
    expiryDate: {
        type:Date,
        required:true   
    },
    usageLimit: {
        type:Number,
    },
    usedCount: {
        type:Number
    },
    isActive: {
        type:Boolean,
    },
    isListed: {
        type:Boolean,
        default:true
    }
    

},{timestamps:true})

module.exports=mongoose.model('coupons',couponSchema)