const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders=require("../../model/orderSchema")
const path = require("path");


const cancelOrder = async (req, res) => {
    const { orderId } = req.body;
    try {
      const order = await Orders.findById(orderId).populate({
          path:'coupon'
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
          if (!item.isCancelled) {
            await Product.updateOne(
              { _id: product._id },
              { $inc: { stock: quantityOrdered } }
            );
          }
          await Orders.updateOne(
            { _id: orderId },
            { 
              $set: { 
                "products.$[elem].isCancelled": true,
                "products.$[elem].orderStatus": "Cancelled"
  
              }
            },  
            { 
              arrayFilters: [{ "elem.productId": product._id }] 
            }
          );
         
        }
        const nonCancelledTotal = order.products
    .filter((product) => !product.isCancelled)
    .reduce((total, product) => total + product.price * product.quantity, 0);
  
        const transactionId = `TID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
        if(order.paymentMethod==='razorpay'||order.paymentMethod==='wallet'){
          let refundAmount = nonCancelledTotal;
          if (order.coupon && order.coupon.discount) {
                refundAmount = refundAmount * ( order.coupon.discount / 100).toString(2);
              }
          user.wallet.balance += refundAmount;
  
          user.wallet.transactions.push({
            transactionId: transactionId,
            orderId: order._id,
            amount: refundAmount,
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
      const order = await Orders.findById(orderId).populate({
          path:'coupon'
      });
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
      product.orderStatus='Cancelled';
      await order.save();
      let totalPrice=product.price * product.quantity;
      if(order.coupon&&order.discount){ 
        totalPrice=totalPrice * ( order.coupon.discount / 100).toFixed(2);
       }
      const refundAmount=totalPrice;
      order.totalPrice-=refundAmount
  
      if (order.totalPrice < 0) {
        order.totalPrice = 0; 
      }
      const allProductsCancelled = order.products.every(product => product.isCancelled);
      if(allProductsCancelled){
        order.orderStatus='Pending';
      }
  
  
  
      const transactionId = `TID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
  
      const cancelOrder = await order.save();
      if(cancelOrder&&(order.paymentMethod==='razorpay' || order.paymentMethod==='wallet')){
        user.wallet.balance += refundAmount;
        user.wallet.transactions.push({
          transactionId: transactionId,
          orderId:order._id,
          amount:refundAmount,
          date:new Date(),
          description: `Refund for cancelled product #(${productId.substring(0, 6)}) in order #${order._id.toString().substring(0, 6)}`,
          type: "credit"
      })
        await user.save();
      }
      const quantityReturned = product.quantity;
          await Product.updateOne(
            { _id: productId },
            { $inc: { stock: quantityReturned } }
          );
  
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
  const userProfileOrders = async (req, res) => {
    try {
      const userId = req.session.user._id;
      const user= await User.findById({_id:userId})
      const cart=await Cart.findOne({user:userId})
      if (!user) {
        return res.send(`
          <html>
              <head>
                  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
              </head>
              <body>
                  <script>
                      Swal.fire({
                          icon: 'error',
                          title: 'user not found',
                          text: 'Please check and try again.',
                          confirmButtonText: 'OK'
                      }).then(() => {
                    window.location.href='/userProfile'
                    });;
                  </script>
              </body>   
          </html>
        `);
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
  
      // console.log('orderss',orders);
  
      res.render("user/userProfileOrders", { orders, user,cart });
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  };
  
  const invoice = async (req, res) => {
    try {
      console.log('invoice',req.params);
      
      const order = await Orders.findById(req.params.id).populate('products.productId'); 
      if (!order) {
        return res.json({
          stauts:'error',
          message: 'Order not found' });
      }
  
      const products = order.products.map(product => ({
        name: product.productId.pname,
        price: product.productId.pprice,
        quantity: product.quantity,
      }));
  
      const user=await User.findById(order.userId)
      console.log("user",user);
      
        const address=user.addresses.find(addr=>addr._id.toString()===order.address)
        console.log('address',address);
           
      res.json({ order, products,user,address });
    } catch (error) {
      console.error('Error fetching order data:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
  
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

  module.exports = {
    cancelOrder,
    cancelAProduct,
    returnAProduct,
    userProfileOrders,
    returnOrderRequest,
    returnAProductRequest,
    invoice,
  }