const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Coupons = require("../../model/couponSchema");
const Orders=require('../../model/orderSchema')
const Razorpay = require('razorpay');
const crypto = require('crypto');
const path = require("path");


const checkout = async (req, res) => {
    console.log("checkout", req.params);
    try {
      const deliveryCharge = 50;
      const userid = req.session.user._id;
      const cartId = req.params.id;
      const imagePath = req.file ? req.file.path : null;
      const user = await User.findById({ _id: userid });
      const cart = await Cart.findById({ _id: cartId }).populate({
        path: "products.product",
        select: "pname pprice image stock isListed offers",
        populate: {
          path: 'offers.offerId',
          select: "discount expiryDate isListed",
        }
      });
      if(cart.products.length == 0){
        return res.send(`
          <html>
          <head>
              <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
          </head>
          <body>
              <script>
                  Swal.fire({
                      icon: 'info',
                      title: 'cart is empty',
                      confirmButtonText: 'OK'
                  }).then(() => {
                window.location.href='/cart'
                });;
              </script>
          </body>   
      </html>
         `)
      }
  
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
                      icon: 'info',
                      title: 'some products are unavailable or unlisted',
                      confirmButtonText: 'OK'
                  }).then(() => {
                window.location.href='/cart'
                });;
              </script>
          </body>   
      </html>
         `)
      }
  
      cart.totalPrice += deliveryCharge;
      const orderDetails = {
        products: cart.products,
        totalPrice: cart.totalPrice.toFixed(2),
      };
  
      const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  
      // Render the checkout page
      res.render("user/checkout", {
        user,
        orderDetails,
        imagePath,
        cart,
        razorpayKeyId,
        deliveryCharge
      });
  
    } catch (err) {
      console.error("Error during checkout:", err);
      res.status(500).render("error", { message: "Server error. Please try again later." });
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
    const { address, payment_method, totalPrice,discountAmount,couponCode } = req.body;
    const userid = req.session.user._id;
    const user = await User.findById({ _id: userid });
  
    if (!address) {
      return res.json({
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
  
      if(payment_method==='wallet'&&user.wallet.balance < totalPrice){
        return res.json({
          status:'info',
          title:'insufficient wallet',
          message:'Please try another payment method'
        })
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
  
      const coupon=await Coupons.findOne({couponCode:couponCode})
  
      let finalTotalPrice = cart.totalPrice;
  
      // Create new order in the Order model
      const newOrder = new Orders({
        userId: userid,
        address: address,
        paymentMethod: payment_method,
        discount:discountAmount|| 0,
        coupon:coupon?coupon:null,
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
        paymentStatus:payment_method=='cash_on_delivery'?'Success':null,
      });
      await newOrder.save();
  
      let razorpayOrder = null;
      if (payment_method === "razorpay") {
        const options = {
          amount: Math.round(totalPrice * 100), 
          currency: "INR",
          receipt: `order_rcptid_${Date.now()}`,
         };
  
        try {
                // Create a Razorpay order
          razorpayOrder = await razorpay.orders.create(options);
          newOrder.razorpayOrderId = razorpayOrder.id;
          newOrder.paymentStatus = "Payment Pending"; 
          await newOrder.save();
          console.log('new order',razorpayOrder);
          
          
      } catch (error) {
        console.log(error);
          newOrder.paymentStatus = "Failed";
          await newOrder.save();
          return res.status(500).json({
            status: "error",
            message: "Failed to create Razorpay order. Please try again.",
        });    }
      }else if(payment_method=='wallet'){
        
        const transactionId = `TID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
        user.wallet.balance -= totalPrice;
        user.wallet.transactions.push({
          transactionId: transactionId,
          orderId: newOrder._id,
          amount: totalPrice,
          date: new Date(),
          description: 'Purchase product using wallet',
          type: "debit",
        });
        await user.save();
  
      }
      console.log('neworder', newOrder);
  
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
        razorpayOrder, 
        status: "success",
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
  
  const continuePayment = async (req, res) => {
    try {
      console.log('continue payment',req.params);
      
        const { id } = req.params;  
        const order = await Orders.findById(id);
  
        if (!order || order.paymentStatus !== 'Payment Pending') {
            return res.json({ message: 'Invalid order or payment already completed.' });
        }
  
        const razorpayKeyId=process.env.RAZORPAY_KEY_ID;
  
        const razorpayOrder = await razorpay.orders.create({
            amount: order.totalPrice * 100,
            currency: 'INR',
            receipt: `order_rcptid_${Date.now()}`,
        });
  
        order.razorpayOrderId = razorpayOrder.id;
        await order.save();
  
        res.json({ razorpayOrder ,order,razorpayKeyId});
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to initiate payment.' });
    }
  }
  
   
  const verifyPayment= async (req, res) => {
    try {
      console.log('varifyPayment',req.body);
  
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, address } = req.body;
  
    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
  
    if (generated_signature === razorpay_signature) {
        res.status(200).json({ success: true });
        const order = await Orders.findOne({ razorpayOrderId:razorpay_order_id});
        console.log("order",order);
        
          order.paymentStatus = 'Success';
  
          await order.save();
    } else {
        res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
      
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
                  title: 'unlisted',
                  text: 'some products are unlisted',
                  confirmButtonText: 'OK'
              }).then(() => {
            window.location.href='/cart'
            });;
          </script>
      </body>   
  </html>
     `)
    }
    
  }

  module.exports = {
    checkout,
    validateCoupon,
    placeOrder,
    continuePayment,
    verifyPayment,
  }