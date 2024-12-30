const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders = require("../../model/orderSchema");
const Coupons = require("../../model/couponSchema");
const Offers = require("../../model/offerSchema");

const orders = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
  
    const searchQuery = req.query.search || "";
    const searchFilter = searchQuery
      ? { orderStatus: { $regex: searchQuery, $options: "i" } }
      : {};
  
    try {
      let orders = await Orders.find(searchFilter)
        .populate("products.productId")
        .sort({ updatedAt: -1 })
        .populate("userId")
        .populate("products.productId")
        .skip(skip)
        .limit(limit);
      const count = await Orders.countDocuments(searchFilter);
  
      res.render("admin/orders", {
        orders: orders,
        query: searchQuery,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery: searchQuery,
      });
    } catch (error) {
      res.json({
        status:'error',
        message:'something error'
    });
    }
  };
  
  const updateOrderStatus = async (req, res) => {
    const { orderId, status } = req.body;
    try {
      await Orders.updateOne(
        { _id: orderId },
        { orderStatus: status, $set: { "products.$[].orderStatus": status } }
      );
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating order status:", error);
      res.json({ success: false });
    }
  };
  
  const   cancelOrder = async (req, res) => {
    console.log('cancel order details',req.body);
  
    const { orderId } = req.body;
    try {
      const order = await Orders.findById(orderId).populate({
        path: "products.productId",
        populate:{
          path:'coupon'
        }
      });
  
      const userId=order.userId
      const user=await User.findById(userId)    
  
      const cancelled = await Orders.updateOne(
        { _id: orderId },
        { orderStatus: "Cancelled" }
      );
      if (cancelled.modifiedCount > 0) {
        for (const item of order.products) {
          const product = item.productId;
          const quantityOrdered = item.quantity;
          await Product.updateOne(
            { _id: product._id },
            { $inc: { stock: quantityOrdered } }
          );
          item.orderStatus='Cancelled',
          item.isCancelled=true
          await order.save();
  
        }
        const nonCancelledTotal = order.products
    .filter((product) => !product.isCancelled)
    .reduce((total, product) => total + product.price * product.quantity, 0);
        // const refundAmount=order.totalPrice-50;
  
        const transactionId = `TID-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  
        if(order.paymentMethod==='razorpay'||order.paymentMethod==='wallet'){
          user.wallet.balance += nonCancelledTotal;
  
          user.wallet.transactions.push({
            transactionId: transactionId,
            orderId: order._id,
            amount: nonCancelledTotal,
            date: new Date(),
            description: `Refund for cancelled  order #${order._id.toString().substring(0, 6)}`,
            type: "credit",
          });
  
          await user.save();
        }
  
        res.json({
          status: "success",
          message: "Order cancelled and stock restored",
        });
      } else {
        res.json({
          status: "error",
          message: "failed to cancel",
        });
      }
    } catch (error) {
      console.log("Error cancelling order:", error);
      res.json({ success: false });
    }
  };
  
  const getReturnRequest = async (req, res) => {
      const orderid = req.params.id;
      try {
        const order = await Orders.findById(orderid);
        if (order) {
          res.json({ status: "success", returnRequest: order.returnRequest });
        } else {
          res.json({ status: "error", message: "Order not found." });
        }
      } catch (error) {
        res.status(500).json({ status: "error", message: "An error occurred." });
      }
    }
  
  const acceptReturnRequest = async (req, res) => {
    const orderid = req.params.id;
    try {
      const order = await Orders.findById({ _id: orderid }).populate({
        path:'coupon'
      });
      // console.log('orderrrr',order);
      
      const user = await User.findById(order.userId);
  
      const nonCancelledTotal = order.products
    .filter((product) => !product.isCancelled && !product.returnRequestStatus)
    .reduce((total, product) => total + product.price * product.quantity, 0);
  
  
    console.log('Non-cancelled total price:', nonCancelledTotal);
  
      const updatedOrder = await Orders.findByIdAndUpdate(
        orderid,
        {
          returnRequestStatus: "Return accepted",
          orderStatus: "Return Request Accepted",
          $set: {
            "products.$[].isReturned": true, // Update 'isReturned' for all products
            "products.$[].returnRequestStatus": "Return accepted",
          },
        },
        { new: true }
      );
  
      let refundAmount = nonCancelledTotal;
  if (order.coupon && order.coupon.discount) {
        refundAmount = refundAmount * ( order.coupon.discount / 100);
      }
  
        const transactionId = `TID-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 6)
          .toUpperCase()}`;
        
        user.wallet.balance += refundAmount;
        user.wallet.transactions.push({
          transactionId: transactionId,
          orderId: orderid,
          amount: refundAmount,
          date: new Date(),
          description: `Refund for returned order #${order._id
            .toString()
            .substring(0, 6)}`,
          type: "credit",
        });
        console.log('totalPrice',refundAmount);
  
        // srock increment
        for (const item of order.products) {
          if (!item.isReturned) { 
            const product = item.productId;
            const quantityReturned = item.quantity;
            await Product.updateOne(
              { _id: product },
              { $inc: { stock: quantityReturned } }
            );
          }
        }
        
        await user.save();
  
      if (updatedOrder) {
        res.json({ status: "success", message: "Return request accepted." });
      } else {
        res.json({ status: "error", message: "Order not found." });
      }
    } catch (error) {
      console.log(error);
  
      res.status(500).json({ status: "error", message: "An error occurred." });
    }
  };
  
  const rejectReturnRequst = async (req, res) => {
    try {
      const order = await Orders.findByIdAndUpdate(
        req.params.id,
        {
          returnRequestStatus: "Return Rejected",
          orderStatus: "Return Request Rejected ",
          $set: {
            "products.$[].returnRequestStatus": "Return Rejected", // Update each product's return status
          },
        },
        { new: true }
      );
      if (order) {
        res.json({ status: "success", message: "Return request rejected." });
      } else {
        res.json({ status: "error", message: "Order not found." });
      }
    } catch (error) {
      res.status(500).json({ status: "error", message: "An error occurred." });
    }
  };
  
  const getReturnAProductRequest = async (req, res) => {
      console.log("retuenaproduct", req.params);
  
      const { orderid, productId } = req.params;
      try {
        const order = await Orders.findById(orderid);
        if (order) {
          const product = order.products.find(
            (item) => item.productId.toString() === productId
          );
          if (product) {
            res.json({
              status: "success",
              returnRequest: product.returnRequest || false,
            });
          } else {
            res.json({
              status: "error",
              message: "Product not found in the order.",
            });
          }
        } else {
          res.json({ status: "error", message: "Order not found." });
        }
      } catch (error) {
        res.status(500).json({ status: "error", message: "An error occurred." });
      }
    }
  
  const acceptAProductReturnRequest = async (req, res) => {
    console.log("params", req.params);
    const { orderId, productId } = req.params;
  
    try {
      const order = await Orders.findById(orderId).populate({
        path:'coupon'
      });
      if (!order) {
        return res
          .status(404)
          .json({ status: "error", message: "Order not found." });
      }
  
      console.log('order',order);
  
      const user = await User.findById(order.userId);
      if (!user) {
        return res
          .status(404)
          .json({ status: "error", message: "User not found." });
      }
  
      const product = order.products.find(
        (p) => p.productId.toString() === productId
      );
      if (!product) {
        return res
          .status(404)
          .json({ status: "error", message: "Product not found in order." });
      }
  
      // Update the specific product's return request status
      product.returnRequestStatus = "Return Accepted";
      product.isReturned = true;
  
      // Save the updated order
      await order.save();
  
        const transactionId = `TID-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 6)
          .toUpperCase()}`;
          let totalPrice=product.total;
          if(order.coupon&&order.discount){ 
            totalPrice=totalPrice * ( order.coupon.discount / 100);
           }
        user.wallet.balance += totalPrice;
        user.wallet.transactions.push({
          transactionId,
          orderId,
          amount: totalPrice,
          date: new Date(),
          description: `Refund for returned product #${productId.substring(
            0,
            6
          )} in order #${orderId.substring(0, 6)}`,
          type: "credit",
        });
        console.log('totalprice',totalPrice);
        
  
        // Save the updated user
        await user.save();
  
        const quantityReturned = product.quantity;
      await Product.updateOne(
        { _id: productId },
        { $inc: { stock: quantityReturned } }
      );
  
      res.json({
        status: "success",
        message: "Product return request accepted.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: "An error occurred." });
    }
  };
  
  const rejectAProductReturnRequest = async (req, res) => {
    console.log("rejectAProductReturnRequest", req.params);
  
    const { orderId, productId } = req.params;
    try {
      const order = await Orders.findById(orderId);
      if (!order) {
        return res
          .status(404)
          .json({ status: "error", message: "Order not found." });
      }
  
      const product = order.products.find(
        (p) => p.productId.toString() === productId
      );
      if (!product) {
        return res
          .status(404)
          .json({ status: "error", message: "Product not found in order." });
      }
  
      // Update the specific product's return request status
      product.returnRequestStatus = "Return Rejected";
  
      // const productTotal = product.price * product.quantity;
      // order.totalPrice -= productTotal;
  
      // Save the updated order
      await order.save();
  
      res.json({
        status: "success",
        message: "Product return request rejected.",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: "An error occurred." });
    }
  };
  
  const orderDetails = async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = await Orders.findById({ _id: orderId })
        .populate("userId")
        .populate("products.productId");
      const user = await User.findById(order.userId);
      const address = user.addresses.find(
        (addr) => addr._id.toString() === order.address.toString()
      );
  
      if (!order) {
        return res
          .status(404)
          .json({ status: "error", message: "Order not found" });
      }
  
      res.json({ order, address });
    } catch (error) {
      console.log("Error fetching order details:", error);
      res.status(500).json({ status: "error", message: "something error" });
    }
  };

  module.exports={
    orders,
  updateOrderStatus,
  cancelOrder,
  getReturnRequest,
  getReturnAProductRequest,
  acceptReturnRequest,
  rejectReturnRequst,
  acceptAProductReturnRequest,
  rejectAProductReturnRequest,
  orderDetails,
  }