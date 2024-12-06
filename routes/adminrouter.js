const express = require("express");
const router = express.Router();
const admincontroller = require("../controller/admincontroller");
const path = require("path");
const { upload } = require("../config/multer");

const {checkSessionMiddleware}=require('../controller/admincontroller')

router.get('/adminhome',checkSessionMiddleware,admincontroller.adminhome)
router.get("/users",checkSessionMiddleware, admincontroller.users);
router.post("/blockuser/:id", admincontroller.blockUser);
router.post("/unblockuser/:id", admincontroller.unblockUser);
router.get("/topbar", admincontroller.topbar);
router.get("/sidebar", admincontroller.sidebar);
router.get("/products",checkSessionMiddleware, admincontroller.products);
router.get("/_header", admincontroller._header);
router.get("/addproduct",checkSessionMiddleware, admincontroller.addproduct);
router.post(
  "/addproduct",
  upload.array("images"),
  admincontroller.addproductpost
);
router.get("/toggleProductListed/:id", admincontroller.toggleProductListed);
router.post("/relistProduct", admincontroller.relistProduct);
router.get("/editproduct/:id",checkSessionMiddleware, admincontroller.editproduct);
router.post(
  "/editproduct/:id",
  upload.array("images"),
  admincontroller.editproductpost
);
router.get("/categories",checkSessionMiddleware, admincontroller.categories);
router.get("/editcategory/:id",checkSessionMiddleware, admincontroller.editcategory);
router.post("/editcategory/:id", admincontroller.editcategorypost);
router.get("/addcategory",checkSessionMiddleware, admincontroller.addcategory);
router.post("/addcategory", admincontroller.addcategorypost);
router.get("/listCategory/:id", admincontroller.listCategory);
router.get("/processImages", admincontroller.processImages);
router.get("/orders",checkSessionMiddleware, admincontroller.orders);
router.post("/updateOrderStatus", admincontroller.updateOrderStatus);
router.post("/cancelOrder", admincontroller.cancelOrder);
router.get('/getReturnRequest/:id',admincontroller.getReturnRequest)
router.post('/acceptReturnRequest/:id',admincontroller.acceptReturnRequest)
router.post('/rejectReturnRequest/:id',admincontroller.rejectReturnRequst)
router.get('/getReturnAProductRequest/:orderid/:productId',admincontroller.getReturnAProductRequest)
router.post('/acceptAProductReturnRequest/:orderId/:productId',admincontroller.acceptAProductReturnRequest),
router.post('/rejectAProductReturnRequest/:orderId/:productId',admincontroller.rejectAProductReturnRequest)
router.get('/orderDetails/:id',admincontroller.orderDetails)
router.get('/coupons',checkSessionMiddleware,admincontroller.coupons)
router.get('/addCoupon',checkSessionMiddleware,admincontroller.addCoupon)
router.post('/addCoupon',admincontroller.addCouponPost)
router.get('/deleteCoupon/:id',admincontroller.deleteCoupon)
router.get('/editCoupon/:id',checkSessionMiddleware,admincontroller.editCoupon)
router.post('/editCoupon/:id',admincontroller.editCouponPOst)
router.get('/offers',checkSessionMiddleware,admincontroller.offers)
router.get('/addOffer',checkSessionMiddleware,admincontroller.addOffer)
router.post('/addOffer',admincontroller.addOfferPost)
router.get('/editOffer/:id',checkSessionMiddleware,admincontroller.editOffer)
router.post('/editOffer/:id',admincontroller.editOfferPost)
router.get('/listOffer/:id',admincontroller.listOffer)
router.post('/applyOfferToProducts/:id',admincontroller.applyOfferToProducts)
router.post('/applyOfferToCategories/:id',admincontroller.applyOfferToCategories)
router.get("/adminLogout", admincontroller.adminLogout);
// router.get('/sales',admincontroller.sales)
router.get('/salesReport',checkSessionMiddleware,admincontroller.salesReport)
router.get('/generateLedger',admincontroller.generateLedger)


module.exports = router;
