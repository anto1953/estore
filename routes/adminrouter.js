const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin/adminController");
const userController = require("../controller/admin/userController");
const productController = require("../controller/admin/productController");
const categoryController = require("../controller/admin/categoryController");
const orderController = require("../controller/admin/orderController");
const couponController = require("../controller/admin/couponController");
const offerController = require("../controller/admin/offerController");



const path = require("path");
const { upload } = require("../config/multer");

const {checkSessionMiddleware}=require('../controller/admin/middlewares')

router.get('/adminhome',checkSessionMiddleware,adminController.adminhome)
router.get("/users",checkSessionMiddleware, userController.users);
router.post("/blockuser/:id", userController.blockUser);
router.post("/unblockuser/:id", userController.unblockUser);
router.get("/topbar", adminController.topbar);
router.get("/sidebar", adminController.sidebar);
router.get("/products",checkSessionMiddleware, productController.products);
router.get("/_header", adminController._header);
router.get("/addproduct",checkSessionMiddleware, productController.addproduct);
router.post(
  "/addproduct",
  upload.array("images"),
  productController.addproductpost
);
router.get("/toggleProductListed/:id", productController.toggleProductListed);
router.post("/relistProduct", productController.relistProduct);
router.get("/editproduct/:id",checkSessionMiddleware, productController.editproduct);
router.post(
  "/editproduct/:id",
  upload.array("images"),
  productController.editproductpost
);
router.get("/categories",checkSessionMiddleware, categoryController.categories);
router.get("/editcategory/:id",checkSessionMiddleware, categoryController.editcategory);
router.post("/editcategory/:id", categoryController.editcategorypost);
router.get("/addcategory",checkSessionMiddleware, categoryController.addcategory);
router.post("/addcategory", categoryController.addcategorypost);
router.get("/listCategory/:id", categoryController.listCategory);
router.get("/processImages", productController.processImages);
router.get("/orders",checkSessionMiddleware, orderController.orders);
router.post("/updateOrderStatus", orderController.updateOrderStatus);
router.post("/cancelOrder", orderController.cancelOrder);
router.get('/getReturnRequest/:id',orderController.getReturnRequest)
router.post('/acceptReturnRequest/:id',orderController.acceptReturnRequest)
router.post('/rejectReturnRequest/:id',orderController.rejectReturnRequst)
router.get('/getReturnAProductRequest/:orderid/:productId',orderController.getReturnAProductRequest)
router.post('/acceptAProductReturnRequest/:orderId/:productId',orderController.acceptAProductReturnRequest),
router.post('/rejectAProductReturnRequest/:orderId/:productId',orderController.rejectAProductReturnRequest)
router.get('/orderDetails/:id',orderController.orderDetails)
router.get('/coupons',checkSessionMiddleware,couponController.coupons)
router.get('/addCoupon',checkSessionMiddleware,couponController.addCoupon)
router.post('/addCoupon',couponController.addCouponPost)
router.get('/deleteCoupon/:id',couponController.deleteCoupon)
router.get('/editCoupon/:id',checkSessionMiddleware,couponController.editCoupon)
router.post('/editCoupon/:id',couponController.editCouponPOst)
router.get('/offers',checkSessionMiddleware,offerController.offers)
router.get('/addOffer',checkSessionMiddleware,offerController.addOffer)
router.post('/addOffer',offerController.addOfferPost)
router.get('/editOffer/:id',checkSessionMiddleware,offerController.editOffer)
router.post('/editOffer/:id',offerController.editOfferPost)
router.get('/listOffer/:id',offerController.listOffer)
router.post('/applyOfferToProducts/:id',offerController.applyOfferToProducts)
router.post('/applyOfferToCategories/:id',offerController.applyOfferToCategories)
router.get("/adminLogout", adminController.adminLogout);
router.get('/salesReport',checkSessionMiddleware,adminController.salesReport)

module.exports = router;
