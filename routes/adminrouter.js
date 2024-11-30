const express = require("express");
const router = express.Router();
const admincontroller = require("../controller/admincontroller");
const path = require("path");
const { upload } = require("../config/multer");

router.get("/users", admincontroller.users);
router.post("/blockuser/:id", admincontroller.blockUser);
router.post("/unblockuser/:id", admincontroller.unblockUser);
router.get("/topbar", admincontroller.topbar);
router.get("/sidebar", admincontroller.sidebar);
router.get("/products", admincontroller.products);
router.get("/_header", admincontroller._header);
router.get("/addproduct", admincontroller.addproduct);
router.post(
  "/addproduct",
  upload.array("images"),
  admincontroller.addproductpost
);
router.get("/toggleProductListed/:id", admincontroller.toggleProductListed);
router.post("/relistProduct", admincontroller.relistProduct);
router.get("/editproduct/:id", admincontroller.editproduct);
router.post(
  "/editproduct/:id",
  upload.array("images"),
  admincontroller.editproductpost
);
router.get("/categories", admincontroller.categories);
router.get("/editcategory/:id", admincontroller.editcategory);
router.post("/editcategory/:id", admincontroller.editcategorypost);
router.get("/addcategory", admincontroller.addcategory);
router.post("/addcategory", admincontroller.addcategorypost);
router.get("/listCategory/:id", admincontroller.listCategory);
router.get("/processImages", admincontroller.processImages);
router.get("/orders", admincontroller.orders);
router.post("/updateOrderStatus", admincontroller.updateOrderStatus);
router.post("/cancelOrder", admincontroller.cancelOrder);
router.get('/getReturnRequest/:id',admincontroller.getReturnRequest)
router.post('/acceptReturnRequest/:id',admincontroller.acceptReturnRequest)
router.post('/rejectReturnRequest/:id',admincontroller.rejectReturnRequst)
router.get('/getReturnAProductRequest/:orderid/:productId',admincontroller.getReturnAProductRequest)
router.post('/acceptAProductReturnRequest/:orderId/:productId',admincontroller.acceptAProductReturnRequest),
router.post('/rejectAProductReturnRequest/:orderId/:productId',admincontroller.rejectAProductReturnRequest)
router.get('/orderDetails/:id',admincontroller.orderDetails)
router.get('/coupons',admincontroller.coupons)
router.get('/addCoupon',admincontroller.addCoupon)
router.post('/addCoupon',admincontroller.addCouponPost)
router.get('/deleteCoupon/:id',admincontroller.deleteCoupon)
router.get('/editCoupon/:id',admincontroller.editCoupon)
router.post('/editCoupon/:id',admincontroller.editCouponPOst)
router.get('/offers',admincontroller.offers)
router.get('/addOffer',admincontroller.addOffer)
router.post('/addOffer',admincontroller.addOfferPost)
router.get('/editOffer/:id',admincontroller.editOffer)
router.post('/editOffer/:id',admincontroller.editOfferPost)
router.get('/listOffer/:id',admincontroller.listOffer)
router.post('/applyOfferToProducts/:id',admincontroller.applyOfferToProducts)
router.post('/applyOfferToCategories/:id',admincontroller.applyOfferToCategories)
router.get("/adminLogout", admincontroller.adminLogout);
router.get('/sales',admincontroller.sales)
router.get('/salesReport',admincontroller.salesReport)


module.exports = router;
