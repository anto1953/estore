const User = require("../model/userSchema");
const Product = require("../model/productsSchema");
const Category = require("../model/categorySchema");
const Cart = require("../model/cartSchema");
const Orders = require("../model/orderSchema");
const Coupons = require("../model/couponSchema");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require("mongoose");
const Swal = require("sweetalert2");
const passport = require("passport");
const { generate } = require("otp-generator");
const nodemailer = require("nodemailer");
const { json } = require("body-parser");
const { products } = require("./admincontroller");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const admin = {
  email: process.env.ADMIN_ID,
  password: process.env.ADMIN_PASS,
};

const checkAnySessionMiddleware = (req, res, next) => {
  if (req.session.user || req.session.admin) {
    res.json({
      status: "error",
      message: "A user is already loggedin",
    });
  } else {
    next();
  }
};

const checkSessionMiddleware = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};

const blockCheckMiddleware = async (req, res, next) => {
  try {
    const user = req.session.user;
    const userRecord = await User.findById(user._id);

    if (userRecord && !userRecord.isBlocked) {
      req.session.user.isBlocked = false;
      next();
    } else {
      req.session.user.isBlocked = true;
      res.redirect("/userBlockPage");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send(error);
  }
};

const checkCategoryisListed = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const product = await Product.findById(id).populate("category");
    if (!product.category.isListed) {
      return res.json({
        status: "error",
        message: "this products category is currntly unlisted.",
      });
    }
    next();
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const userBlockPage = async (req, res) => {
  try {
    if (req.session.user.isBlocked == true) {
      res.render("user/userBlockPage");
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const processImage = async (file) => {
  try {
    if (!file || !file.path) {
      console.log("File path missing:", file);
      throw new Error("File path is missing or invalid");
    }

    const filename = `${Date.now()}-${file.originalname}`;
    const outputPath = path.join(__dirname, "../public/uploads", filename);

    // Process image with sharp
    await sharp(file.path).resize(500, 500).toFile(outputPath);

    return filename;
  } catch (error) {
    console.log("Error processing image:", error);
    throw new Error("Error processing image");
  }
};

const logout = async (req, res) => {
  try {
    console.log('logout');
    const userId=req.session.user._id
    const loggedout=await User.updateOne({ _id: userId}, { isLoggedIn: false });
    console.log('loggedout',loggedout);
    

    req.session.destroy((err) => {
      if (err) {
        server;
        return res.status(500).json({
          status: "error",
          message: "failed to logout",
        });
      }
      res.redirect("/userhome");
    });
  } catch (error) {
    console.log(error);
    res.send(error.message);
  }
};

const signup = async (req, res) => {
  try {
    res.render("user/signup");
  } catch (error) {
    res.send(error.message);
  }
};

const signuppost = async (req, res) => {
  try {
    console.log("signup post");

    let userdata = {};
    userdata = req.body;
    console.log(userdata);
    req.session.userdata = userdata;
    const email = req.body.email;
    const password = req.body.password;
    const cpassword = req.body.confirmpassword;
    const existuser = await User.findOne({ email });
    if (existuser || req.body.email === admin.email) {
      res.status(400).json({
        status: "error",
        message: "user already exist",
      });
    } else if (password == cpassword) {
      function generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a number between 100000 and 999999
      }
      const otp = generateOTP();

      req.session.email = email;
      req.session.otp = otp;

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.AUTH_ID,
          pass: process.env.AUTH_PASS,
        },
      });

      const mailOptions = {
        from: process.env.AUTH_ID,
        to: email,
        subject: "otp verification",
        text: `your OTP is ${otp}.`,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (info) {
          console.log("OTP send");
          res.json({
            status: "success",
            message: "check your email",
          });
        } else {
          res.json({
            status: "error",
            message: "try again",
          });
        }
      });
    } else {
      res.json({
        status: "error",
        message: "incorrect confirm-password",
      });
    }
  } catch (error) {
    res.send(error.message);
  }
};

const otp = async (req, res) => {
  try {
    res.render("user/otp");
  } catch (error) {
    res.send(error.message);
  }
};

const otpPost = async (req, res) => {
  try {
    console.log(req.body);
    console.log(req.session.otp);

    const otp = req.body.otp;
    const { name, email, phone, password } = req.session.userdata;
    if (otp === req.session.otp) {
      const user = new User({
        name: name,
        email: email,
        phone: phone,
        password: password,
      });
      const userdata = await user.save();
      if (userdata) {
        res.json({
          status: "success",
          message: "signup successfull",
        });
      }
    } else {
      res.json({
        status: "error",
        message: "incorrect OTP",
      });
    }
  } catch (error) {
    res.send(error.message);
  }
};
const login = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {
    res.send(error.message);
  }
};

const loginpost = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });

    if (email === admin.email && password === admin.password) {
      const isAnyUserLoggedIn = await User.findOne({ isLoggedIn: true });
      if (isAnyUserLoggedIn && req.session.user) {
        return res.json({
          status: "error",
          message: "A user is already logged in from another session.",
        });
      } else {
        req.session.admin = admin.email;
        return res.json({
          status: "success",
          message: "Admin login successful",
          redirectUrl: "/adminhome",
        });
      }
    }
    if (user) {
      if (user.isBlocked) {
        return res.json({
          status: "error",
          message: "User is blocked",
        });
      }
      if (req.session.admin) {
        return res.json({
          status: "error",
          message: "Admin is already logged in from another session.",
          redirectUrl: "/login",
        });
      }
      if (password === user.password) {
        req.session.user = user;
        req.session.id = user.id;
        await User.updateOne({ _id: user._id }, { isLoggedIn: true });

        return res.json({
          status: "success",
          message: "User login successful",
          redirectUrl: "/userhome",
        });
      } else {
        return res.json({
          status: "error",
          message: "Invalid username or password",
        });
      }
    } else {
      return res.json({
        status: "error",
        message: "Invalid username or password",
      });
    }
  } catch (error) {
    res.json({
      status: "error",
      message: error.message,
    });
  }
};

const loadAuth = async (req, res) => {
  try {
    const user = await User.findOne({ email: email });
    if (user.isBlocked == true) {
      res.json({
        status: "error",
        message: "user is blocked",
      });
    } else {
      if (req.session.user) {
        res.render("user/userhome");
      }
    }
  } catch (error) {
    res.send(error.message);
  }
};

const success = async (req, res) => {
  try {
    if (req.session.user) {
      if (!req.user) res.redirect("/failure");
      res.send(`<script>
            alert('success')
            </script>`);
    }
  } catch (error) {
    res.send(error.message);
  }
};
const failure = async (req, res) => {
  try {
    if (req.session.user) {
      res.render("/login");
    }
  } catch (error) {
    res.send(error.message);
  }
};

const profile = async (req, res) => {
  try {
    const email = req.user.email;
    const user = await User.findOne({ email: email });

    const authenticated = await User.findOne({ email: email });
    req.session.authenticated = authenticated;
    if (!authenticated) {
      return res.render("/login");
    } else if (user.isBlocked == true) {
      res.send(`
          <script>
            alert('user is blocked')
              window.location.href = "/login"; // Redirect to login after alert
          </script>
      `);
    } else {
      req.session.user = authenticated;
      await User.updateOne({ _id: user._id }, { isLoggedIn: true });
      res.status(200).redirect("/userhome");
    }
  } catch (error) {
    console.log(error);

    res.send(error.message);
  }
};
const email = async (req, res) => {
  try {
    const user = req.session.user || null;
    const userId=user._id
    const cart=await Cart.findOne({user:userId})
    res.render("user/email", { user: user || null ,cart});
  } catch (error) {
    res.send(error.message);
  }
};
const emailPost = async (req, res) => {
  try {
    const email = req.body.email;
    req.session.email = email;
    console.log(req.session.email);
    const existuser = await User.findOne({ email });
    if (existuser) {
      function generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a number between 100000 and 999999
      }
      const otp = generateOTP();
      req.session.otp = otp;

      const transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
          user: process.env.AUTH_ID,
          pass: process.env.AUTH_PASS,
        },
      });

      const mailOptions = {
        from: "project001953@gmail.com",
        to: email,
        subject: "otp verification",
        text: `your OTP is ${otp}.`,
      };
      transporter.sendMail(mailOptions, (err, info) => {
        if (info) {
          console.log("OTP send");
          res.json({
            status: "success",
            message: "check your email",
          });
        } else {
          res.json({
            status: "error",
            message: "try again",
          });
        }
      });
    } else {
      res.json({
        status: "error",
        message: "no user found",
      });
    }
  } catch (error) {
    res.send(error.message);
  }
};
const forgotOtp = async (req, res) => {
  try {
    res.render("user/forgotOtp");
  } catch (error) {
    console.log(error);

    res.send(error.message);
  }
};
const forgotOtpPost = async (req, res) => {
  console.log(req.body);
  console.log(req.session.otp);
  try {
    const otp = req.body.otp;
    const email = req.session.email;
    console.log(email);

    if (otp === req.session.otp) {
      res.json({
        status: "success",
      });
    } else {
      res.json({
        status: "error",
        message: "wrong otp",
      });
    }
  } catch (error) {
    res.send(error.message);
  }
};
const newPassword = async (req, res) => {
  try {
    res.render("user/newPassword");
  } catch (error) {
    res.send(error.message);
  }
};
const newPasswordPost = async (req, res) => {
  const email = req.session.email;
  const user = await User.findOne({ email });
  const userid = user._id;
  try {
    const password = req.body.newPassword;
    const cpassword = req.body.confirmPassword;

    if (password === cpassword) {
      const updatedPassword = await User.findByIdAndUpdate(
        userid,
        { password },
        { new: true }
      );
      if (updatedPassword) {
        res.json({
          status: "success",
          message: "password changed successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "try again",
        });
      }
    }
  } catch (error) {
    res.send(error.message);
  }
};

const userhome = async (req, res) => {
  try {
    console.log(req.user);
    const user = req.session.user;
    const userId=user._id
    const authenticated = req.user;
    const category = await Category.find({});
    const products = await Product.find({});
    const cart = await Cart.findOne({user:userId})
    res.status(200).render("user/userhome", {
      category: category,
      user: user,
      products: products,
      authenticated: authenticated,
      cart
    });
  } catch (error) {
    res.send(error.message);
  }
};

const adminhome = async (req, res) => {
  try {
    if (req.session.admin) {
      res.render("admin/adminhome");
    } else {
      res.render("login");
    }
  } catch (error) {
    res.send(error.message);
  }
};

const viewProducts = async (req, res) => {  
  console.log('view products',req.query);
  
  try {
    const query = req.query.Search ? req.query.Search.toLowerCase() : "";
    const sortBy = req.query.sortBy || "";
    const category = req.query.category || "";
    let authenticated = false;
    const user=req.session.user 
    const userid = user ? req.session.user._id : null;

    if (userid) {
      authenticated = true;
    }

    const filterCriteria = Object.assign(
      query ? { pname: { $regex: query, $options: "i" } } : {},
      category ? { category: category } : {},
      { isListed: true } // Ensure only listed products are shown
    );
    
    let products = await Product.find(
      Object.assign({}, filterCriteria, { isListed: true })
    ).populate({
      path: 'offers.offerId',
      model: 'Offers',
    });        

    let categories = await Category.find({ isListed: true });

    if (sortBy) {
      switch (sortBy) {
        case "popularity":
          products.sort((a, b) => b.popularity - a.popularity);
          break;
        case "price-asc":
          products.sort((a, b) => a.pprice - b.pprice);
          break;
        case "price-desc":
          products.sort((a, b) => b.pprice - a.pprice);
          break;
        case "ratings":
          products.sort((a, b) => b.ratings - a.ratings);
          break;
        case "featured":
          products.sort((a, b) => b.featured - a.featured);
          break;
        case "new-arrivals":
          products.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          );
          break;
        case "a-z":
          products.sort((a, b) => a.pname.localeCompare(b.pname));
          break;
        case "z-a":
          products.sort((a, b) => b.pname.localeCompare(a.pname));
          break;
        default:
          break;
      }
    }
    products = products.map((product) => {
      product.image = product.image[0];
      return product;
    });
    
    console.log('prioducts',products);
    
    const cart = await Cart.findOne(userid ? { user: userid } : {});
    const cartProductIds = cart
      ? cart.products.map((item) => item.product.toString())
      : [];

    const wishlist=user?.wishlist || null;  
    
    res.render("user/product_list", {
      products,
      cart: cartProductIds,
      searchQuery: query,
      sortBy: sortBy,
      category: category,
      categories,
      user,
      wishlist

    });
  } catch (error) {
    console.log(error);

    res.send(error.message);
  }
};

const getSortedProducts = async (req, res) => {
  const { sortBy } = req.query;
  let sortCriteria = {};

  // Based on the sorting option, define how to sort the products
  switch (sortBy) {
    case "popularity":
      sortCriteria = { popularity: -1 };
      break;
    case "price-asc":
      sortCriteria = { pprice: 1 };
      break;
    case "price-desc":
      sortCriteria = { pprice: -1 };
      break;
    case "ratings":
      sortCriteria = { ratings: -1 };
      break;
    case "featured":
      sortCriteria = { featured: 1 };
      break;
    case "new-arrivals":
      sortCriteria = { createdAt: -1 };
      break;
    case "a-z":
      sortCriteria = { pname: 1 };
      break;
    case "z-a":
      sortCriteria = { pname: -1 };
      break;
    default:
      sortCriteria = {};
      break;
  }

  try {
    const products = await Product.find().sort(sortCriteria);
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching sorted products:", error);
    res.json({ success: false });
  }
};

const viewProductDetails = async (req, res) => {
  try {
    const user = req.session.user || null;
    const userid = user ? req.session.user._id : null;
    const productid = req.params.id;
    const product = await Product.findById(productid).populate({
      path: 'offers.offerId',
      model: 'Offers',
    });
    console.log('offer',product.offers);
    

    const carts = await Cart.findOne(userid ? { user: userid } : {});
    const cartitems = carts
      ? carts.products.map((item) => item.product.toString())
      : [];
    const cart = await Cart.findOne(userid ? { user: userid } : {});

    let relatedProduct = await Product.find({
      category: product.category,
      _id: { $ne: productid },
    }).limit(3);

    let relatedProductImage = relatedProduct.map((product) => {
      let image = product.image[0];
      product.image = image;
      return product;
    });
    const wishlist=user?.wishlist || []
    res.render("user/viewProductDetails", {
      product,
      relatedProduct,
      cart,
      user,
      cartitems,
      wishlist
    });
  } catch (error) {
    console.log(error);
    Swal.fire({
      status: "error",
      message: "something error",
    });
  }
};

const wishlist= async (req,res) => {
  const userId = req.session.user._id;
  const user = await User.findById(userId).populate('wishlist');
  const cart=await Cart.findOne({user:userId})

  res.render('user/wishlist', { wishlist: user.wishlist,user,cart });
}


const addToWishlist=async (req, res) => {  
  try {
    const userId = req.session.user._id;
    const productId = req.params.id;
    const product=await Product.findById({_id:productId})    
    // Add product to wishlist only if not already present
    const user = await User.findById({_id:userId});
    const isProductInWishlist = user.wishlist.some(item => item.productId.toString() === productId);
    if (!isProductInWishlist) {
      // Add product to wishlist
      user.wishlist.push({
        productId: productId,
        name: product.pname,
        price: product.pprice,
        image: product.image[0],
      });
      await user.save();
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).send({ success: false, message: 'Failed to add product to wishlist.' });
  }
}

const removeFromWishlist = async (req, res) => {
  const productId  = req.params; // Get the productId from request body
  const userId = req.session.user._id;  // Get the user from session

  try {
    const productObjectId = new mongoose.Types.ObjectId(productId); // Convert productId to ObjectId
    
    const user = await User.findById({_id:userId}); // Find the user by ID

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check if the product exists in the wishlist
    const productToDelete = user.wishlist.find(item =>
      item.productId.equals(productObjectId)
    );

    if (productToDelete) {
      // Pull the product from the wishlist
      await User.updateOne(
        { _id: user._id },
        {
          $pull: { wishlist: { productId: productObjectId } }
        }
      );

      return res.json({ success: true, message: "Product removed from wishlist." });
    }

    res.json({ success: false, message: "Product not found in wishlist." });
  } catch (error) {
    console.error("Error deleting product from wishlist:", error);
    res.json({ success: false, message: "An error occurred while removing the product." });
  }
};

const wallet = async (req, res) => {
  try {
    const userId = req.session.user._id;  // Assuming the user ID is stored in the session
    const cart=await Cart.findOne({user:userId})

    // Find the user and their wallet data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Send wallet data to the view
    res.render('user/wallet', { wallet: user.wallet, transactions: user.wallet.transactions.sort((a, b) => b.date - a.date),user,cart });
  } catch (error) {
    console.log(error);
    res.status(500).send('Server error');
  }
};

const cart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById({ _id: userId });
    const cart = await Cart.findOne({ user }).populate({
      path: "products.product",
      select: "pname pprice image stock isListed offers",
    });

    console.log("cart", cart.products);

    if (!cart) {
      Swal.fire({
        title: "cart is empty",
        text: "Add a product to the cart",
        confirmButtonColor: "#d33",
      });
      return;
    }

    const subtotal = cart.products.reduce(
      (total, item) => total + item.product.pprice * item.quantity,
      0
    );

    const cartWithSingleImage = cart.products.map((item) => {
      const stock = item.product.stock;
      const maxQuantity = stock < 10 ? stock : 10;
      return {
        ...item.toObject(),
        product: {
          ...item.product.toObject(),
          image: item.product.image[0],
          pname: item.product.pname,
          maxQuantity,
        },
      };
    });

    const listedProducts = cart.products.map((item) => {
      return (isListed = true);
    });

    res.render("user/cart", {
      cart: { ...cart.toObject(), products: cartWithSingleImage },
      subtotal,
      user: user,
      shippingOptions: [
        {
          name: "Standard Shipping",
          price: 5.0,
          value: "standard",
          selected: true,
        },
        {
          name: "Express Shipping",
          price: 10.0,
          value: "express",
          selected: false,
        },
        {
          name: "Next Day Delivery",
          price: 15.0,
          value: "next-day",
          selected: false,
        },
      ],
      products: listedProducts,
    });
  } catch (error) {
    console.log("Error fetching cart:", error);
    res
      .status(500)
      .send(
        "Something went wrong while loading the cart. Please try again later."
      );
  }
};

const addToCart = async (req, res) => {
  console.log('addtocart',req.body);
  
  try {
    const userId = req.session.user._id;
    const user = await User.findById({ _id: userId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const price=req.body.discountedPrice;
    const productId = req.body.productId;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    let finalPrice = price? price: product.pprice;
    if ( product.offers.length > 0) {
      const activeOffer = product.offers.find(
        (offer) => new Date(offer.expiryDate) > new Date()
      );
      if (activeOffer) {
        finalPrice = (product.pprice * (1 - activeOffer.discount / 100)).toFixed(2);
      }
    }

    const imagePath = req.file ? req.file.path : null;
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      console.log("Creating a new cart");
      cart = new Cart({
        user: user._id,
        products: [
          {
            product: product._id,
            quantity: 1,
            price: finalPrice,
            total: finalPrice,
            image: imagePath,
            category: product.category,
          },
        ],
        totalPrice: finalPrice,
      });
    } else {
      const existingProductIndex = cart.products.findIndex(
        (item) => item.product.toString() === product._id.toString()
      );

      if (existingProductIndex >= 0) {
        console.log("Updating quantity for existing product");
        cart.products[existingProductIndex].quantity += 1;
        cart.products[existingProductIndex].total =
          cart.products[existingProductIndex].quantity *
          cart.products[existingProductIndex].price;
      } else {
        console.log("Adding new product to cart");
        cart.products.push({
          product: product._id,
          quantity: 1,
          price: finalPrice,
          total: finalPrice,
          image: product.image[0],
          category: product.category,
        }); 
      }
      cart.totalPrice = cart.products.reduce(
        (total, item) => total + item.total,
        0
      );
    }
    await cart.save();
    console.log("Cart after save:", cart);

    res.status(200).json({
      status: "success",
      message: "Product added to cart",
      cart,
    });
  } catch (error) {
    console.log("Error adding product to cart:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateQuantity = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = req.session.user;
    const userId = await User.findOne({ user });
    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const productIndex = cart.products.findIndex(
      (item) => item.product.toString() === productId
    );
    if (productIndex === -1) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in cart" });
    }

    // Update the product quantity and total
    cart.products[productIndex].quantity = quantity;
    cart.products[productIndex].total =
      cart.products[productIndex].price * quantity;

    // Save the updated cart
    await cart.save();

    return res.json({ success: true, message: "Cart updated successfully" });
  } catch (error) {
    console.log("Error updating cart:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteFromCart = async (req, res) => {
  const { productId } = req.body;
  const user = req.session.user;
  try {
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const cart = await Cart.findOne({ user: user._id });
    const productToDelete = cart.products.find((product) =>
      product.product.equals(productObjectId)
    );
    if (productToDelete) {
      const updatedTotalPrice = cart.totalPrice - productToDelete.total;
      await Cart.updateOne(
        { user: user._id },
        {
          $pull: { products: { product: productObjectId } },
          $set: { totalPrice: updatedTotalPrice },
        }
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.json({ success: false });
  }
};

const checkout = async (req, res) => {
  console.log("checkout", req.params);
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const userid = req.session.user._id;
    const cartId = req.params.id;
    const imagePath = req.file ? req.file.path : null;
    const user = await User.findById({ _id: userid });
    const cart = await Cart.findById({ _id: cartId }).populate({
      path: "products.product",
      select: "pname pprice image category isListed",
    });

    const unlistedProduct = cart.products.some(
      (item) => item.product.isListed === false
    );

    if (unlistedProduct) {
      return res.send(`
        <html>
            <head>
                <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
            </head>
            <body>
                <script>
                    Swal.fire({
                        icon: 'error',
                        title: 'unlisted',
                        text: 'some products are unlisted',
                        confirmButtonText: 'OK'
                    }).then(() => {
                  window.location.href='/cart'
                  });;
                </script>
            </body>   
        </html>
      `);
    }

    const orderDetails = {
      products: cart.products,
      totalPrice: cart.totalPrice.toFixed(2),
    };

    const razorpayKeyId=process.env.RAZORPAY_KEY_ID

    // Render the checkout page with user and cart details
    res.render("user/checkout", {
      user,
      orderDetails,
      imagePath,
      cart,
      razorpayKeyId
    });
  } catch (err) {
    console.error("Error during checkout:", err);
    res
      .status(500)
      .render("error", { message: "Server error. Please try again later." });
  }
};

const validateCoupon = async (req, res) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    return res.status(400).json({ message: "Coupon code is required." });
  }

  try {
    const coupon = await Coupons.findOne({
      couponCode: couponCode,
      isListed: true,
    });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code." });
    }

    // Check if the coupon is expired
    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: "This coupon has expired." });
    }

    // Check if the usage limit is reached
    if (coupon.usageLimit <= 0) {
      return res
        .status(400)
        .json({ message: "This coupon has reached its usage limit." });
    }

    coupon.usageLimit-=1;
    await coupon.save();

    // Return the discount amount (percentage)
    res.status(200).json({ discount: coupon.discount });
  } catch (error) {
    console.log('coupon error',error);
    res.status(500).json({ status:'error',message: "something error." });
  }
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const placeOrder = async (req, res) => {
  console.log('placeOrder', req.body);
  const { address, payment_method, totalPrice,discountAmount } = req.body;
  const userid = req.session.user._id;
  const user = await User.findById({ _id: userid });

  if (!address) {
    return res.status(400).json({
      status: "error",
      message: "Please select a delivery address.",
    });
  }

  if (!payment_method) {
    return res.status(400).json({
      status: "error",
      message: "Please select a payment method.",
    });
  }

  try {
    const cart = await Cart.findOne({ user: user._id }).populate({
      path: "products.product",
      select: "productId isListed stock",
    });

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({
        status: "error",
        message:
          "Your cart is empty. Please add items before placing an order.",
      });
    }

    const unlistedProducts = cart.products.filter(
      (item) => !item.product.isListed || item.product.stock < item.quantity
    );

    if (unlistedProducts.length > 0) {
      const unlistedNames = unlistedProducts
        .map((item) => item.product.name)
        .join(", ");
      return res.status(400).json({
        message: `The following products are unavailable or unlisted: ${unlistedNames}. Please update your cart.`,
      });
    }

    let finalTotalPrice = cart.totalPrice;

    // Create new order in the Order model
    const newOrder = new Orders({
      userId: userid,
      address: address,
      paymentMethod: payment_method,
      discount:discountAmount|| 0,
      razorpayOrderId:null,
      products: cart.products.map((product) => ({
        productId: product.product,
        quantity: product.quantity,
        price: product.price,
        total: product.total,
        image: product.image,
      })),
      totalPrice: totalPrice.toFixed(2),
      orderStatus: "Pending",
    });
    await newOrder.save();
    console.log('neworder', newOrder);

    // Handle Razorpay payment method
    let razorpayOrder = null;
    if (payment_method === "razorpay") {
      const options = {
        amount: totalPrice * 100,
        currency: "INR",
        receipt: `order_rcptid_${Date.now()}`,
       };

      // Create a Razorpay order
      razorpayOrder = await razorpay.orders.create(options);
      console.log('razorpayOrder',razorpayOrder);
      

      // Save the Razorpay order ID to the order for tracking
      newOrder.razorpayOrderId = razorpayOrder.id;
      await newOrder.save();
    }

    // Update product stock
    for (const item of cart.products) {
      const product = item.product;
      const quantityOrdered = item.quantity;

      // Reduce the stock
      await Product.updateOne(
        { _id: product._id },
        { $inc: { stock: -quantityOrdered } }
      );
    }

    // Remove the products from the cart
    await Cart.updateOne(
      { user: user._id },
      { $set: { products: [], totalPrice: 0 } }
    );

    return res.status(200).json({
      newOrder,
      razorpayOrder, // Send Razorpay order details if payment method is Razorpay
      icon: "success",
      title: "Order placed successfully!",
      message: "Your order will be delivered within 7 days.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "There was an error placing your order. Please try again.",
    });
  }
};


 
const verifyPayment= async (req, res) => {
  console.log('varifyPayment',req.body);
  
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, address } = req.body;

  const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

  if (generated_signature === razorpay_signature) {
      // Save order details to the database
      // ...
      res.status(200).json({ success: true });
  } else {
      res.status(400).json({ success: false, message: 'Invalid payment signature' });
  }
}

const cancelOrder = async (req, res) => {
  const { orderId } = req.body;
  try {
    const order = await Orders.findById(orderId).populate({
      path: "products.productId",
    });
    const user=await User.findById({_id:order.userId})


    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    const result = await Orders.updateOne(
      { _id: orderId },
      { orderStatus: "Cancelled" }
    );

    if (result.modifiedCount > 0) {
      for (const item of order.products) {
        const product = item.productId;
        const quantityOrdered = item.quantity;
        await Orders.updateOne(
          { _id: orderId },
          { 
            $set: { 
              "products.$[elem].isCancelled": true,
              "products.$[elem].orderStatus": "Cancelled"

            }
          },  
          { 
            arrayFilters: [{ "elem.productId": product._id }] // Using correct path for array filter
          }
        );
        await Product.updateOne(
          { _id: product._id },
          { $inc: { stock: quantityOrdered } }
        );
      }

      const transactionId = `TID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;


      if(order.paymentMethod==='razorpay'){
        user.wallet.balance += order.totalPrice;

        user.wallet.transactions.push({
          transactionId: transactionId,
          orderId: order._id,
          amount: order.totalPrice,
          date: new Date(),
          description: `Refund for cancelled  order #${order._id.toString().substring(0, 6)}`,
          type: "credit",
        });

        await user.save();
      }
      
      res.json({
        status: "success",
        message: "Order cancelled",
      });
    } else {
      res.json({
        status: "error",
        message: "Order not updated",
      });
    }
  } catch (error) {
    console.log("Error cancelling order:", error);
    res.json({ success: false, message: "Error cancelling order" });
  }
};

const cancelAProduct = async (req, res) => {
  console.log(req.body);
  const { orderId, productId } = req.body;
  try {
    const order = await Orders.findById(orderId);
    const user=await User.findById(order.userId)
    console.log('user',user);
    
    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found" });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found in order",
      });
    }

    if (product.isCancelled) {
      return res.status(400).json({
        status: "error",
        message: "Product already cancelled",
      });
    }

    product.isCancelled = true;
    order.totalPrice -= product.price * product.quantity;
    const refundAmount=product.price * product.quantity.toFixed(2)
    // order.totalPrice-=refundAmount

    if (order.totalPrice < 0) {
      order.totalPrice = 0; // Ensure non-negative total price
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;


    const cancelOrder = await order.save();
    if(cancelOrder&&order.paymentMethod==='razorpay'){
      user.wallet.balance += refundAmount;
      user.wallet.transactions.push({
        transactionId: transactionId,
        orderId:order._id,
        amount:refundAmount,
        date:new Date(),
        description: `Refund for cancelled product (${productId.substring(0, 6)}) in order #${order._id.toString().substring(0, 6)}`,
        type: "credit"
    })
      await user.save();
    }

    if (cancelOrder) {
      return res.json({
        status: "success",
        message: "Product cancelled successfully",
      });
    } else {
      return res.status(500).json({
        status: "error",
        message: "Cancellation failed",
      });
    }
  } catch (error) {
    console.error("Error during cancellation:", error);
    res.status(500).json({ status: "error", message: "Something went wrong" });
  }
};

const returnAProduct = async (req, res) => {
  console.log(req.body);

  const { orderId, productId } = req.body;
  try {
    const order = await Orders.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found" });
    }

    const product = order.products.find(
      (item) => item.productId.toString() === productId
    );

    if (!product) {
      return res
        .status(404)
        .json({ status: "error", message: "Product not found in order" });
    }

    if (order.orderStatus !== "Delivered") {
      return res
        .status(400)
        .json({ status: "error", message: "Product cannot be returned" });
    }

    // Mark the product as returned
    product.isReturned = true;
    order.returnRequest = true;

    await order.save();

    res.status(200).json({ message: "Product return requested successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Something went wrong" });
  }
};

const userProfile = async (req, res) => {
  try {
    const userid = req.session.user._id;
    const user = await User.findById(userid);
    const cart=await Cart.findOne({user:userid})
    // console.log("user", user);

    if (!user) {
      return res.json({
        status: "error",
        message: "user not found!",
      });
    }
    res.render("user/userProfile", { user,cart });
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const editUserProfile = async (req, res) => {
  try {
    const userid = req.session.user._id;
    const user = await User.findById(userid);
    if (!user) {
      return res.json({
        status: "error",
        message: "user not found",
      });
    }
    const cart=await Cart.findOne({user:userid})
    res.render("user/editUserProfile", { user,cart });
  } catch (error) {
    console.log(error.message);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const editUserProfilePost = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("body", req.body);

    const { name, country, address, phone, email } = req.body;
    const profileImage = req.file ? await processImage(req.file) : null;

    const existUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existUser) {
      console.log("User already exists");
      return res.status(400).json({
        status: "error",
        message: "User with this email already exists",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, country, address, phone, profileImage, email },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        status: "error",
        message: "User not found",
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "User profile edited successfully",
      });
    }
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while updating the profile",
    });
  }
};

const userProfileOrders = async (req, res) => {
  try {
    const user = req.session.user;
    const userId=user._id;
    const cart=await Cart.findOne({user:userId})
    if (!user) {
      Swal.fire({
        icon: "error",
        title: "User Not Found",
        text: "Please check and try again.",
        confirmButtonColor: "#d33",
      });
      return;
    }

    const getStatusClass = (status) => {
      switch (status) {
        case "Processing":
          return "status-processing";
        case "Shipped":
          return "status-shipped";
        case "Delivered":
          return "status-delivered";
        case "Cancelled":
          return "status-cancelled";
        default:
          return "";
      }
    };

    const orders = await Orders.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .populate("products.productId", "pname price image")
      .lean();

    orders.forEach((order) => {
      order.statusClass = getStatusClass(order.orderStatus);
    });

    res.render("user/userProfileOrders", { orders, user,cart });
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "soething error",
    });
  }
};

const returnOrderRequest = async (req, res) => {
  try {
    console.log("params", req.params);

    const orderid = req.body.orderId;
    const returnRequest = req.body.message;
    const order = await Orders.findById({ _id: orderid });
    if (order) {
      order.returnRequest = returnRequest;
      order.returnRequestStatus = "Request Pending";
    }
    const saveRequest = await order.save();
    if (saveRequest) {
      res.json({
        status: "success",
        message: "Request send",
      });
    } else {
      res.json({
        status: "error",
        message: "something error",
      });
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const returnAProductRequest = async (req, res) => {
  console.log("return request body", req.body);
  const { productId, message, orderId } = req.body;

  try {
    const order = await Orders.findById(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ status: "error", message: "Order not found" });
    }

    const product = order.products.find(
      (p) => p.productId.toString() === productId
    );

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found in this order",
      });
    }
    product.returnRequest = message;
    product.isReturned = false;
    product.returnRequestStatus = "Request Pending";

    const updatedOrder = await order.save();
    if (updatedOrder) {
      res.json({
        status: "success",
        message: "Return request has been submitted successfully.",
      });
    }
  } catch (err) {
    console.error("Error processing return request:", err);
    res.status(500).json({
      status: "error",
      message: "An error occurred while processing the return request.",
    });
  }
};

const addressbook = async (req, res) => {
  const email = req.session.user.email;
  const user = await User.findOne({ email });
  const userId=user._id;
  const cart=await Cart.findOne({user:userId})
  const addresses = user.addresses || [];
  try {
    res.render("user/addressbook", { addresses, user,cart });
  } catch (error) {
    res.send(error.message);
  }
};

const addAddress = async (req, res) => {
  try {
    const user = req.session.user;
    const userId=user._id;
    const cart=await Cart.findOne({user:userId})
    res.render("user/addAddress", { user ,cart});
  } catch (error) {
    res.send(error.message);
  }
};
const addAddressPost = async (req, res) => {
  try {
    const { name, phone, street, city, state, country, zipcode } = req.body;

    if (!name || !phone || !street || !city || !state || !zipcode) {
      return res
        .status(400)
        .json({ status: "error", message: "All fields are required" });
    }

    const user = await User.findById(req.session.user._id); // Fetch the actual user from the database

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    user.addresses.push({
      name,
      phone,
      street,
      city,
      state,
      country,
      zipcode,
    });
    const updatedUser = await user.save();

    if (updatedUser) {
      res.status(200).json({
        status: "success",
        message: "Address added successfully",
        address: updatedUser.addresses, // Returning the updated addresses
      });
    } else {
      res.status(500).json({
        status: "error",
        message: "Failed to add address",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while adding the address",
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const user = req.session.user;
    const userId=user._id;
    const cart=await Cart.findOne({user:userId})
    res.render("user/changePassword", { user ,cart});
  } catch (error) {
    res.send(error.message);
  }
};

const editAddress = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(id);
    const user = await User.findOne(
      { "addresses._id": id },
      { "addresses.$": 1 }
    );
    const userId=user._id;
    const cart=await Cart.findOne({user:userId})
    const address = user.addresses[0];
    res.render("user/editAddress", { address, user ,cart});
  } catch (error) {
    res.send(error.message);
  }
};

const editAddressPost = async (req, res) => {
  console.log(req.body);
  try {
    const Id = req.params.id;
    console.log(Id);
    const { name, country, street, state, city, phone, zipcode } = req.body;
    const user = await User.findOne({ "addresses._id": Id });
    const updatedAddress = user.addresses.map((address) => {
      if (address.id === Id) {
        address.name = name;
        address.country = country;
        address.street = street;
        address.state = state;
        address.city = city;
        address.phone = phone;
        address.zipcode = zipcode;
      }
    });
    user.save();

    console.log("updated");

    if (!updatedAddress) {
      return res.status(400).json({
        status: "error",
        message: "User not found",
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "address edited successfully",
      });
    }
  } catch (error) {
    res.send(error.message);
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const id = req.params.id;
    const email = req.session.user.email;
    const user = await User.findOne({ email });
    const addresses = user.addresses;
    const address = addresses.map((address) => {
      address.isDefault = false;
    });
    await user.save();
    addresses.map((address) => {
      if (address.id === id) {
        address.isDefault = true;
      }
    });
    await user.save();
    res.json({ status: "success", message: "Address set as default." });
  } catch (error) {
    console.log(error.message);
    res.json({ status: "error", message: "Failed to set default address." });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.params.id;
    const email = req.session.user.email;
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ status: "error", message: "User not found" });
    }
    const addressIndex = user.addresses.findIndex(
      (address) => address.id === addressId
    );

    if (addressIndex > -1) {
      user.addresses.splice(addressIndex, 1);
      await user.save();
      return res
        .status(200)
        .json({ status: "success", message: "Address deleted successfully" });
    } else {
      return res
        .status(404)
        .json({ status: "error", message: "Address not found" });
    }
  } catch (error) {
    console.error("Error deleting address:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error. Please try again later.",
    });
  }
};

module.exports = {
  checkSessionMiddleware,
  blockCheckMiddleware,
  checkCategoryisListed,
  checkAnySessionMiddleware,
  userBlockPage,
  processImage,
  logout,
  login,
  loginpost,
  loadAuth,
  success,
  failure,
  profile,
  userhome,
  adminhome,
  signup,
  signuppost,
  otp,
  otpPost,
  viewProducts,
  getSortedProducts,
  viewProductDetails,
  wishlist,
  addToWishlist,
  removeFromWishlist,
  cart,
  addToCart,
  updateQuantity,
  deleteFromCart,
  checkout,
  validateCoupon,
  placeOrder,
  verifyPayment,
  cancelOrder,
  cancelAProduct,
  returnAProduct,
  userProfile,
  editUserProfile,
  editUserProfilePost,
  userProfileOrders,
  returnOrderRequest,
  returnAProductRequest,
  addressbook,
  changePassword,
  addAddress,
  addAddressPost,
  editAddress,
  editAddressPost,
  setDefaultAddress,
  deleteAddress,
  email,
  emailPost,
  forgotOtpPost,
  newPassword,
  newPasswordPost,
  forgotOtp,
  wallet
};
