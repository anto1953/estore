const express = require("express");
const router = express.Router();
const usercontroller = require("../controller/usercontroller");
const passport = require("passport");
require("../passport");
const { upload } = require("../config/multer");
const {
  checkAnySessionMiddleware,
  checkSessionMiddleware,
  blockCheckMiddleware,
  checkCategoryisListed,
} = require("../controller/usercontroller");

router.get("/", usercontroller.userhome);
router.get("/login", usercontroller.login);
router.get("/userBlockPage", usercontroller.userBlockPage);
router.post("/login", checkAnySessionMiddleware, usercontroller.loginpost);
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
router.get(
  "/newPassword",
  checkSessionMiddleware,
  blockCheckMiddleware,
  usercontroller.newPassword
);
router.post("/newPassword", usercontroller.newPasswordPost);
router.get("/viewProducts", usercontroller.viewProducts);
router.get("/getSortedProducts", usercontroller.getSortedProducts);
router.get("/viewProductDetails/:id", usercontroller.viewProductDetails);
router.get(
  "/cart",
  checkSessionMiddleware,
  blockCheckMiddleware,
  upload.single("image"),
  usercontroller.cart
);
router.post("/addToCart/:id", upload.single("image"),blockCheckMiddleware, usercontroller.addToCart);
router.post("/updateQuantity", usercontroller.updateQuantity);
router.delete("/deleteFromCart", blockCheckMiddleware, usercontroller.deleteFromCart);
router.get(
  "/checkout",
  checkSessionMiddleware,
  blockCheckMiddleware,
  upload.single("image"),
  usercontroller.checkout
);
router.post("/placeOrder",blockCheckMiddleware, usercontroller.placeOrder);
router.post("/cancelOrder",blockCheckMiddleware, usercontroller.cancelOrder);
router.post("/cancelAProduct",blockCheckMiddleware, usercontroller.cancelAProduct);
router.post("/returnAProduct", blockCheckMiddleware, usercontroller.returnAProduct);
router.post("/returnOrderRequest/:id", blockCheckMiddleware, usercontroller.returnOrderRequest);
router.post("/returnAProductRequest/:id", blockCheckMiddleware,usercontroller.returnAProductRequest);
router.get(
  "/userProfile",
  checkSessionMiddleware,
  blockCheckMiddleware,
  upload.single("profileimage"),
  usercontroller.userProfile
);
router.get(
  "/editUserProfile",
  checkSessionMiddleware,
  blockCheckMiddleware,
  usercontroller.editUserProfile
);
router.post(
  "/editUserProfile/:id",
  upload.single("profileImage"),
  usercontroller.editUserProfilePost
);
router.get(
  "/userProfileOrders",
  checkSessionMiddleware,
  blockCheckMiddleware,
  usercontroller.userProfileOrders
);
router.get(
  "/addressbook",
  checkSessionMiddleware,
  blockCheckMiddleware,
  usercontroller.addressbook
);
router.get(
  "/changePassword",
  checkSessionMiddleware,
  blockCheckMiddleware,
  usercontroller.changePassword
);
router.get(
  "/addAddress",
  checkSessionMiddleware,
  blockCheckMiddleware,
  usercontroller.addAddress
);
router.post("/addAddress", usercontroller.addAddressPost);
router.get(
  "/editAddress/:id",
  checkSessionMiddleware,
  blockCheckMiddleware,
  usercontroller.editAddress
);
router.post("/editAddress/:id", usercontroller.editAddressPost);
router.post("/deleteAddress/:id", usercontroller.deleteAddress);
router.post("/setDefaultAddress/:id", usercontroller.setDefaultAddress);
router.get(
  "/forgotOtp",
  usercontroller.forgotOtp
);

router.get("/logout", usercontroller.logout);

module.exports = router;
