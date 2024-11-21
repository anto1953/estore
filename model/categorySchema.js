const { strict } = require('assert');
const mongoose=require('mongoose');
const { type } = require('os');

const categorySchema=new mongoose.Schema({
    
    value:{
        type:String,
        required:true
    },
    label:{
        type:String,
        required:true
    },
    image: {
        String
    },
    isListed: {
        type: Boolean
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports=mongoose.model('categories',categorySchema)
