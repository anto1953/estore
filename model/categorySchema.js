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
    listed: {
        type: Boolean
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports=mongoose.model('categories',categorySchema)
