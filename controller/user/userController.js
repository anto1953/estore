const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const nodemailer = require("nodemailer");
const path = require("path");

const logout = async (req, res) => {
  try {
    console.log('logout');
    const userId=req.session.user._id
    const user=await User.findById(userId)
    user.isLoggedIn=false;
    const loggedout=await user.save();
    // const loggedout=await User.updateOne({ _id: userId}, { isLoggedIn: false });
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
    console.log('userdata',userdata);
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

const email = async (req, res) => {
  try {
    const user = req.session.user ? req.session.user : null;
    const userId=user ? user._id:null;
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

const validateReferralCode=async (req, res) => {
  try {
    const { referralCode } = req.body;

    const referredBy = await User.findOne({ referralCode });
    if (referredBy) {
      return res.json({
        status: 'success',
        message: 'Referral code is valid.',
        referredBy
      });
    } else {
      return res.json({
        status: 'error',
        message: 'Referral code is invalid.',
      });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message:'something error' });
  }
}

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
    console.log('userdata',req.session.userdata);
    
    const otp = req.body.otp;
    const { name, email, phone, password } = req.session.userdata;
    const referralCode=req.session.userdata.referralCode ? req.session.userdata.referralCode : null;
    
    if (otp === req.session.otp) {

      let newReferralCode;
      do {
        newReferralCode = Math.random().toString().slice(2, 8); // Generates referral code
      } while (await User.findOne({ referralCode:newReferralCode })); 
      
        const referredBy= referralCode? await User.findOne({referralCode:referralCode}):null

      const user = new User({
        name: name,
        email: email,
        phone: phone,
        password: password,
        referralCode:newReferralCode,
        referredBy:referredBy?referredBy._id:null,
      });
      const userdata = await user.save();
      if (userdata&&userdata.referredBy!=null) {
        const transactionId = `TID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        referredBy.wallet.balance+=100;

        referredBy.wallet.transactions.push({
          transactionId:transactionId,
          amount:100,
          date:new Date(),
          description:'Bonus for referral',
          type:'credit'
        })
        await referredBy.save();
      }
        
        res.json({
          status: "success",
          message: "signup successfull",
        });
      
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
const newPassword = async (req, res) => {
    try {
      console.log('new password');
      
      res.render("user/newPassword");
    } catch (error) {
      res.send(error.message);
    }
  };
  const newPasswordPost = async (req, res) => {
    try {
      const email = req.session.email;
      const user = await User.findOne({ email });
      const userid = user._id;
      console.log('new password',req.body);
      
      const password = req.body.newPassword;
      const cpassword = req.body.confirmPassword;
  
      if (password === cpassword&&password!=user.password) {
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
      }else{
        res.json({
          status:'error',
          message:'wrong password or password mismatch',
        })
      }
    } catch (error) {
      console.log(error);
      res.json({
        stauts:'error',
        message:'something error'
      });
    }
  };
  
  const userhome = async (req, res) => {
    try {
      // console.log(req.user);
      const userId=req.session.user?req.session.user._id:null;
      const user=userId?await User.findById({_id:userId}):null;
      const authenticated = req.user;
      const category = await Category.find({isListed:true})
      const products = await Product.find({isListed:true}).populate({path:'offers.offerId',model:'Offers',});;
      const cart = await Cart.findOne({user:userId})
      res.status(200).render("user/userhome", {
        category: category,
        user: user,
        products: products,
        authenticated: authenticated,
        cart
      });
    } catch (error) {
      console.log(error);
      res.json({
        stauts:'error',
        message:'something error'
      });
    }
  };
  
  const viewProducts = async (req, res) => {  
    console.log('view products',req.query);
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 12;
      const skip = (page - 1) * limit;
      const query = req.query.Search ? req.query.Search.toLowerCase() : "";
      const sortBy = req.query.sortBy || "";
      const category = req.query.category || "";
      const isAjax = req.query.ajax === "true";
      
  
      let authenticated = false;
      const userid = req.session.user ? req.session.user._id : null;
      const user=userid?await User.findById({_id:userid}):null
  
      if (userid) {
        authenticated = true;
      }
  
      const filterCriteria = Object.assign(
        query ? { pname: { $regex: query, $options: "i" } } : {},
        category ? { category: category } : {},
        { isListed: true }
      );
      
      let products = await Product.find(
        Object.assign({}, filterCriteria, { isListed: true })
      ).populate({
        path: 'offers.offerId',
        model: 'Offers',
      }).skip(skip)
      .limit(limit);            
  
      const count = await Product.countDocuments(filterCriteria);
      const totalPages = Math.ceil(count / limit);
  
  
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
          
      if (isAjax) {
        // Return JSON response for AJAX requests
        return res.json({ success: true, products });
      }
      const cart = await Cart.findOne(userid ? { user: userid } : {});
      const cartProductIds = cart
        ? cart.products.map((item) => item.product.toString())
        : [];
  
      const wishlist=user?user.wishlist : null;  
  
      
      res.render("user/product_list", {
        products,
        cartItem: cartProductIds,
        searchQuery: query,
        sortBy: sortBy,
        category: category,
        categories,
        user,
        wishlist,
        cart,
        currentPage: page,
        totalPages,
      });
    } catch (error) {
      console.log(error);
     return res.send(`
      <html>
      <head>
          <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
          <script>
              Swal.fire({
                  icon: 'error',
                  text: 'something error',
              }).then(() => {
            window.location.href='/userhome';
            });
          </script>
      </body>   
  </html>
     `)
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
      const userId=req.session.user?req.session.user._id:null;
      const user=userId?await User.findById({_id:userId}):null;
      const productid = req.params.id;
      const product = await Product.findById(productid).populate({
        path: 'offers.offerId',
        model: 'Offers',
      });    
  
      const carts = await Cart.findOne(userId ? { user: userId } : {});
      const cartitems = carts
        ? carts.products.map((item) => item.product.toString())
        : [];
      const cart = await Cart.findOne(userId ? { user: userId } : {});
  
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
      res.json({
        status: "error",
        message: "something error",
      });
    }
  };
  const wallet = async (req, res) => {
    try {
      
      const userId = req.session.user._id;  
      const cart=await Cart.findOne({user:userId})
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).send('User not found');
      }
  
       // Pagination 
       const page = parseInt(req.query.page) || 1; // Current page (default: 1)
       const limit = 10; 
       const startIndex = (page - 1) * limit;
   
       // Sort and paginate transactions
       const transactions = user.wallet.transactions
         .sort((a, b) => b.date - a.date)
         .slice(startIndex, startIndex + limit);
  
         const totalPages = Math.ceil(user.wallet.transactions.length / limit);
  
      res.render('user/wallet', { 
        wallet: user.wallet,
        transactions,
        user,
        cart,
        currentPage: page,
        totalPages,
       });
    } catch (error) {
      console.log(error);
      res.status(500).send('Server error');
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
  const forgotOtpPost = async (req, res) => {
    console.log('forgototp',req.body);
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
  const forgotOtp = async (req, res) => {
    try {        
      res.render("user/forgotOtp");
    } catch (error) {
      console.log(error);
  
      res.send(error.message);
    }
  };


  module.exports = {
    userhome,
    signup,
    signuppost,
    email,
    emailPost,
    validateReferralCode,
    otp,
    otpPost,
    newPassword,
    newPasswordPost,
    viewProducts,
    getSortedProducts,
    viewProductDetails,
    logout,
    wallet,
    userBlockPage,
    forgotOtp,
    forgotOtpPost,

  }
