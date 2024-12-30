const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

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
  
      const user = await User.findById(req.session.user._id); 
  
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
          address: updatedUser.addresses, 
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
  
  const changePasswordPost=async (req,res) => {
    try {
      console.log('change password',req.body);
      const{cPassword,newPassword,renewpassword}=req.body;
      const userId=req.session.user._id;
      const user=await User.findById(userId)
      if(newPassword===renewpassword){
      if(cPassword===user.password){
        user.password=newPassword
        const changed=await user.save();
        if(changed){
          return res.json({
            status:'success',
            message:'password changed',
          })
        }
      }
    else{
        return res.json({
          status:'error',
          message:'wrong password',
        })
      }
    }else{
      res.json({
        status:'error',
        message:'password mismatch'
      })
    }
    } catch (error) {
      console.log(error);
      res.json({
        status:'error',
        message:'something error'
      })
    }
  }
  
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
  const processImage = async (file) => {
    try {
      if (!file || !file.path) {
        console.log("File path missing:", file);
        throw new Error("File path is missing or invalid");
      }
  
      const filename = `${Date.now()}-${file.originalname}`;
      const outputPath = path.join(__dirname, "../../public/uploads", filename);
  
      // Process image with sharp
      await sharp(file.path).resize(500, 500).toFile(outputPath);
  
      return filename;
    } catch (error) {
      console.log("Error processing image:", error);
      throw new Error("Error processing image");
    }
  };

  module.exports = {
    userProfile,
    editUserProfile,
    editUserProfilePost,
    processImage,
    addressbook,
  changePassword,
  changePasswordPost,
  addAddress,
  addAddressPost,
  editAddress,
  editAddressPost,
  setDefaultAddress,
  deleteAddress,
  }