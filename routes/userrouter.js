const express = require("express");
const router = express.Router();
const usercontroller = require("../controller/usercontroller");
const passport = require("passport");
require("../passport");
const { upload } = require("../config/multer");

router.get("/", usercontroller.userhome);
router.get("/login", usercontroller.login);
router.post("/login", usercontroller.loginpost);
router.get(
  "/loadAuth",
  passport.authenticate("google", { scope: ["email", "profile"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.status(200).redirect("/profile");
  }
);

router.get("/profile", usercontroller.profile);
router.get("/success", usercontroller.success);
router.get("/failure", usercontroller.failure);
router.get("/userhome", usercontroller.userhome);
router.get("/adminhome", usercontroller.adminhome);
router.get("/signup", usercontroller.signup);
router.post("/signup", usercontroller.signuppost);
router.get("/otp", usercontroller.otp);
router.post("/otp", usercontroller.otpPost);
router.get("/email", usercontroller.email);
router.post("/email", usercontroller.emailPost);
router.post("/forgotOtp", usercontroller.forgotOtpPost);
router.get("/newPassword", usercontroller.newPassword);
router.post("/newPassword", usercontroller.newPasswordPost);
router.get("/viewProducts", usercontroller.viewProducts);
router.get("/getSortedProducts", usercontroller.getSortedProducts);
router.get("/viewProductDetails/:id", usercontroller.viewProductDetails);
router.get("/cart", upload.single("image"), usercontroller.cart);
router.post("/addToCart/:id", upload.single("image"), usercontroller.addToCart);
router.post("/updateQuantity", usercontroller.updateQuantity);
router.delete("/deleteFromCart", usercontroller.deleteFromCart);
router.get("/checkout", upload.single("image"), usercontroller.checkout);
router.post("/placeOrder", usercontroller.placeOrder);
router.post("/cancelOrder", usercontroller.cancelOrder);
router.post('/cancelAProduct',usercontroller.cancelAProduct)
router.post('/returnAProduct',usercontroller.returnAProduct)
router.post("/returnOrderRequest/:id",usercontroller.returnOrderRequest)
router.post('/returnAProductRequest/:id',usercontroller.returnAProductRequest)
router.get(
  "/userProfile",
  upload.single("profileimage"),
  usercontroller.userProfile
);
router.get("/editUserProfile", usercontroller.editUserProfile);
router.post(
  "/editUserProfile/:id",
  upload.single("profileImage"),
  usercontroller.editUserProfilePost
);
router.get("/userProfileOrders", usercontroller.userProfileOrders);
router.get("/addressbook", usercontroller.addressbook);
router.get("/changePassword", usercontroller.changePassword);
router.get("/addAddress", usercontroller.addAddress);
router.post("/addAddress", usercontroller.addAddressPost);
router.get("/editAddress/:id", usercontroller.editAddress);
router.post("/editAddress/:id", usercontroller.editAddressPost);
router.post("/deleteAddress/:id", usercontroller.deleteAddress);
router.post("/setDefaultAddress/:id", usercontroller.setDefaultAddress);
router.get("/forgotOtp", usercontroller.forgotOtp);

router.get("/logout", usercontroller.logout);

module.exports = router;
