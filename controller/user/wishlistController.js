const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const mongoose = require("mongoose");


const wishlist = async (req, res) => {
    const userId = req.session.user._id;
    const user = await User.findById(userId).populate('wishlist');
    const cart = await Cart.findOne({ user: userId });
  
    // Update the wishlist items with discounted prices
    const updatedWishlist = await Promise.all(
      user.wishlist.map(async (item) => {
        const product = await Product.findById(item.productId).populate('offers.offerId');
        
        // Find the best active offer
        const activeOffers = product.offers
          .filter(offer => 
            offer.offerId && 
            new Date(offer.offerId.expiryDate) > new Date() &&
            offer.offerId.isListed
          )
          .sort((a, b) => b.offerId.discount - a.offerId.discount);
  
        const bestOffer = activeOffers.length > 0 ? activeOffers[0] : null;
        let discountedPrice = item.price;
  
        if (bestOffer) {
          // Apply percentage discount
          discountedPrice = (item.price * (1 - bestOffer.offerId.discount / 100)).toFixed(2);
        }
  
        return {
          ...item._doc,
          discountedPrice,
        };
      })
    );
  
    res.render('user/wishlist', { wishlist: updatedWishlist, user, cart });
  };
  
  
  const addToWishlist=async (req, res) => {  
    try {
      const userId = req.session.user._id;
      const productId = req.params.id;
      const product=await Product.findById({_id:productId})    
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
        const addedToWishlist=await user.save();
        if(addedToWishlist){
          res.json({
            status:'success',
            message:'Product added to wishlist'
          })
        }
      }else {
        return res.json({
          status:'info',
          message:'Products already added to wishlist'
        })
      }
      // res.status(200).send({ success: true });
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      res.status(500).json({ stauts:'error', message: 'Failed to add product to wishlist.' });
    }
  }
  
  const removeFromWishlist = async (req, res) => {
    const productId  = req.params; 
    const userId = req.session.user._id; 
  
    try {
      const productObjectId = new mongoose.Types.ObjectId(productId); 
      
      const user = await User.findById({_id:userId});
  
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }
  
      // Check if the product exists in the wishlist
      const productToDelete = user.wishlist.find(item =>
        item.productId.equals(productObjectId)
      );
  
      if (productToDelete) {
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

  module.exports = {
    wishlist,
    addToWishlist,
    removeFromWishlist,
  }
