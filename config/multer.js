const multer=require('multer')
const path=require('path')

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/uploads')); // Correct folder path
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname); // Generate a unique filename
    }
});

const filefilter=(req,file,cb)=>{
    if(file.mimetype==='image/webp'||file.mimetype==='image/avif'||file.mimetype==='image/jpeg'||file.mimetype==='image/png'||file.mimetype==='image/jpg'){
        cb(null,true);
    }else{
        cb(new Error('only valid format allowed'),false)
    }
}

// Set up the Multer upload middleware
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Optional: Limit file size to 5MB
    // fileFilter:filefilter
}); // Accept multiple file

module.exports={
    upload,
    filefilter,
    storage 
}