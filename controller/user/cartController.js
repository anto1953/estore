const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const mongoose = require("mongoose");
const path = require("path");


const cart = async (req, res) => {
    try {
      const userId = req.session.user._id;
      const user = await User.findById({ _id: userId });
      const cart = await Cart.findOne({ user }).populate({
        path: "products.product",
        select: "pname pprice image stock isListed offers",
       populate:{
        path:'offers.offerId',
        select: "discount expiryDate isListed",
       }
        });
      console.log('cart',cart);
      
  
      if (!cart) {
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
                          text: 'add some products to cart',
                          confirmButtonText: 'OK'
                      }).then(() => {
                    window.location.href='/viewProducts'
                    });;
                  </script>
              </body>   
          </html>
        `);
      }
  
      const subtotal = cart.products.reduce(
        (total, item) => total + item.product.pprice * item.quantity,
        0
      );
  
      // let totalAfterDiscount = subtotal;
      // cart.products.forEach((item) => {
      //   if (item.product.offers && item.product.offers.length > 0) {
      //     item.product.offers.forEach((offer) => {
      //       if (offer.offerId && offer.offerId.discount) {
      //         totalAfterDiscount -= (totalAfterDiscount * offer.offerId.discount) / 100;
      //       }
      //     });
      //   }
      // });
  
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
  
      const listedProducts = cart.products.filter((item) => item.isListed === true);
  
  
      res.render("user/cart", {
        cart: { ...cart.toObject(), products: cartWithSingleImage },
        subtotal,
        // totalAfterDiscount,
        user: user,
        products: listedProducts,
        // offers:cart.offers,
      });
    } catch (error) {
      console.log("Error fetching cart:", error);
      res.json({
        status:'error',
          message:"Something went wrong while loading the cart. Please try again later."
    });
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
      const productId = req.body.productId;
      const product = await Product.findById(productId).populate({
        path:'offers.offerId',
        model:'Offers',
      });
      console.log('product',product);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      let cart = await Cart.findOne({ user: user._id });
    
      
      let finalPrice=product.pprice;
      let activeOffers;
      if(product.offers.length > 0){
         activeOffers= product.offers.filter(offer=>offer.offerId&&new Date(offer.offerId.expiryDate)> new Date()&&offer.offerId.isListed).sort((a,b)=> b.offerId.discount-a.offerId.discount)
        const activeOffer=activeOffers.length > 0 ?activeOffers[0] : null;
        if(activeOffer){
           finalPrice=(product.pprice * (1- activeOffer.offerId.discount/100)).toFixed(2);
        }
      }
  
      const imagePath = req.file ? req.file.path : null;
      if (!cart) {
        console.log("Creating a new cart");
        cart = new Cart({
          user: user._id,
          products: [
            {
              product: product,
              quantity: 1,
              price: finalPrice,
              total: finalPrice,
              image: imagePath,
              category: product.category,
              offers : activeOffers ? activeOffers : null,
            },
          ],
          totalPrice: finalPrice,
        });
      } else {
        const existingProductIndex = cart.products.findIndex(
          (item) => item.product.toString() === product._id.toString()
        );
  
        if (existingProductIndex >= 0) {
          return res.status(200).json({
            status: "info",
            message: "Product is already added to the cart",
            cart,
          });
        } else {
          console.log("Adding new product to cart");
          cart.products.push({
            product: product,
            quantity: 1,
            price: finalPrice,
            total: finalPrice,
            image: product.image[0],
            category: product.category,
            offers : activeOffers ? activeOffers : null,
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
      const user = req.session.user._id;
      const cart = await Cart.findOne({ user });
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
  


  module.exports = {
    cart,
    addToCart,
    updateQuantity,
    deleteFromCart,
  }