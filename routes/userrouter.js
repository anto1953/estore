const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController");
const authcontroller = require("../controller/user/authcontroller");
const cartController = require("../controller/user/cartController");
const checkoutController = require("../controller/user/checkoutController");
const orderController = require("../controller/user/orderController");
const userProfileController = require("../controller/user/userProfileController");
const wishlistController = require("../controller/user/wishlistController");

const passport = require("passport");
require("../passport");
const { upload } = require("../config/multer");
const {
  checkAnySessionMiddleware,
  checkSessionMiddleware,
  blockCheckMiddleware,
  checkCategoryisListed,
} = require("../controller/user/middlewares");
const { route } = require("./adminrouter");

router.get("/", userController.userhome);
router.get("/login", authcontroller.login);
router.get("/userBlockPage", userController.userBlockPage);
router.post("/login", checkAnySessionMiddleware, authcontroller.loginpost);
router.get(
  "/loadAuth",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.status(200).redirect("/profile");
  }
);

router.get("/profile",authcontroller.profile);
router.get("/success", authcontroller.success);
router.get("/failure", authcontroller.failure);
router.get("/userhome", userController.userhome);
router.get("/signup", userController.signup);
router.post("/signup", userController.signuppost);
router.post('/validateReferralCode',userController.validateReferralCode)
router.get("/otp", userController.otp);
router.post("/otp", userController.otpPost);
router.get("/email", userController.email);
router.post("/email", userController.emailPost);
router.get("/forgotOtp", userController.forgotOtp);
router.post("/forgotOtp", userController.forgotOtpPost);
router.get(
  "/newPassword",userController.newPassword
);
router.post("/newPassword", userController.newPasswordPost);
router.get("/viewProducts", userController.viewProducts);
router.get("/getSortedProducts", userController.getSortedProducts);
router.get("/viewProductDetails/:id", userController.viewProductDetails);
router.get(
  "/wishlist",
  checkSessionMiddleware,
  blockCheckMiddleware,
  wishlistController.wishlist
);
router.post(
  "/addToWishlist/:id",
  checkSessionMiddleware,
  blockCheckMiddleware,
  wishlistController.addToWishlist
);
router.delete("/removeFromWishlist/:id", wishlistController.removeFromWishlist);
router.get(
  "/wallet",
  checkSessionMiddleware,
  blockCheckMiddleware,
  userController.wallet
);
router.get(
  "/cart",
  checkSessionMiddleware,
  blockCheckMiddleware,
  upload.single("image"),
  cartController.cart
);
router.post(
  "/addToCart/:id",
  upload.single("image"),
  checkSessionMiddleware,
  blockCheckMiddleware,
  cartController.addToCart
);
router.post("/updateQuantity", cartController.updateQuantity);
router.delete(
  "/deleteFromCart",
  blockCheckMiddleware,
  cartController.deleteFromCart
);
router.get(
  "/checkout/:id",
  checkSessionMiddleware,
  blockCheckMiddleware,
  upload.single("image"),
  checkoutController.checkout
);
router.post("/validateCoupon", checkoutController.validateCoupon);
router.post("/placeOrder", blockCheckMiddleware, checkoutController.placeOrder);
router.post('/continuePayment/:id',checkoutController.continuePayment)
router.post("/verifyPayment", checkoutController.verifyPayment);
router.post("/cancelOrder", blockCheckMiddleware, orderController.cancelOrder);
router.post(
  "/cancelAProduct",
  blockCheckMiddleware,
  orderController.cancelAProduct
);
router.post(
  "/returnAProduct",
  blockCheckMiddleware,
  orderController.returnAProduct
);
router.post(
  "/returnOrderRequest/:id",
  blockCheckMiddleware,
  orderController.returnOrderRequest
);
router.post(
  "/returnAProductRequest/:id",
  blockCheckMiddleware,
  orderController.returnAProductRequest
);
router.get(
  "/userProfile",
  checkSessionMiddleware,
  blockCheckMiddleware,
  upload.single("profileimage"),
  userProfileController.userProfile
);
router.get(
  "/editUserProfile",
  checkSessionMiddleware,
  blockCheckMiddleware,
  userProfileController.editUserProfile
);
router.post(
  "/editUserProfile/:id",
  upload.single("profileImage"),
  userProfileController.editUserProfilePost
);
router.get(
  "/userProfileOrders",
  checkSessionMiddleware,
  blockCheckMiddleware,
  orderController.userProfileOrders
);
router.get(
  "/invoice/:id",
  checkSessionMiddleware,
  blockCheckMiddleware,
  orderController.invoice
);
router.get(
  "/addressbook",
  checkSessionMiddleware,
  blockCheckMiddleware,
  userProfileController.addressbook
);
router.get(
  "/changePassword",
  checkSessionMiddleware,
  blockCheckMiddleware,
  userProfileController.changePassword
);
router.post('/changePassword',userProfileController.changePasswordPost)
router.get(
  "/addAddress",
  checkSessionMiddleware,
  blockCheckMiddleware,
  userProfileController.addAddress
);
router.post("/addAddress", userProfileController.addAddressPost);
router.get(
  "/editAddress/:id",
  checkSessionMiddleware,
  blockCheckMiddleware,
  userProfileController.editAddress
);
router.post("/editAddress/:id", userProfileController.editAddressPost);
router.post("/deleteAddress/:id", userProfileController.deleteAddress);
router.post("/setDefaultAddress/:id", userProfileController.setDefaultAddress);
router.get("/logout", userController.logout);

module.exports = router;
