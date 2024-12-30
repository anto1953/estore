const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders = require("../../model/orderSchema");
const Coupons = require("../../model/couponSchema");
const Offers = require("../../model/offerSchema");

const offers = async (req, res) => {
    const query = req.query.search ? req.query.search.toLowerCase() : "";
    const page = parseInt(req, query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.search || "";
    const searchFilter = searchQuery
      ? { offerName: { $regex: searchQuery, $options: "i" } }
      : {};
    try {
      const now = new Date();
      await Offers.updateMany(
        { expiryDate: { $lt: now }, isListed: true },
        { $set: { isListed: false } }
      );
      const category = await Category.find({});
      const products = await Product.find({});
      const offers = await Offers.find(searchFilter).skip(skip).limit(limit);
      const count = await Offers.countDocuments(searchFilter);

      res.render("admin/offers", {
        offers: offers,
        query: query,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        searchQuery,
        products,
        category,
      });
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  }

const addOffer = async (req, res) => {
    try {
      res.render("admin/addOffer");
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something error",
      });
    }
  }

const addOfferPost = async (req, res) => {
  try {
    console.log("offers", req.body);

    const { offerName, offerCode, offerType, discount, expiryDate, status } =
      req.body;
    const existOffer = await Offers.findOne({
      offerCode: { $regex: new RegExp(`^${offerCode.trim()}$`, "i") },
    });
    if (existOffer) {
      res.json({
        status: "error",
        message: "offer is already exist",
      });
    } else {
      const offer = new Offers({
        offerName,
        offerCode,
        offerType,
        discount,
        expiryDate,
        status,
      });
      const offerData = await offer.save();

      if (offerData) {
        res.json({
          status: "success",
          message: "offer added successfully",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something wrong",
    });
  }
};

const editOffer = async (req, res) => {
    try {
      const offerid = req.params.id;
      const offer = await Offers.findById({ _id: offerid });
      if (offer) {
        if (offer.expiryDate) {
          offer.expiryDate = offer.expiryDate.toISOString().split("T")[0];
        }
        res.render("admin/editOffer", { offer });
      } else {
        res.json({
          status: "error",
          message: "offer not found",
        });
      }
    } catch (error) {
      console.log(error);
      res.json({
        status: "error",
        message: "something wrong",
      });
    }
  }

const editOfferPost = async (req, res) => {
  try {
    const offerid = req.params.id;
    const { offerName, offerCode, expiryDate, discount, offerType, status } =
      req.body;
      const existOffer = await Offers.findOne({
        offerCode: { $regex: new RegExp(`^${offerCode.trim()}$`, "i") },
        _id: { $ne: offerid },
      });
      
    if (existOffer) {
      res.json({
        status: "error",
        message: "offer already exist",
      });
    } else {
      const editOffer = await Offers.findByIdAndUpdate(
        { _id: offerid },
        { offerName, offerCode, discount, expiryDate, offerType, status },
        { new: true }
      );
      if (editOffer) {
        // const updateProducts = await Product.updateMany(
        //   { "offers.offerId": offerid },
        //   {
        //     $set: {
        //       "offers.$[elem].offerName": offerName,
        //       "offers.$[elem].offerCode": offerCode,
        //       "offers.$[elem].discount": discount,
        //       "offers.$[elem].offerType": offerType,
        //       "offers.$[elem].expiryDate": expiryDate,
        //     },
        //   },
        //   {
        //     arrayFilters: [{ "elem.offerId": offerid }],
        //     multi: true,
        //   }
        // );

        // const updateCategories = await Category.updateMany(
        //   { "offers.offerId": offerid },
        //   {
        //     $set: {
        //       "offers.$[elem].offerName": offerName,
        //       "offers.$[elem].offerCode": offerCode,
        //       "offers.$[elem].discount": discount,
        //       "offers.$[elem].offerType": offerType,
        //       "offers.$[elem].expiryDate": expiryDate,
        //     },
        //   },
        //   {
        //     arrayFilters: [{ "elem.offerId": offerid }], // Only update the matched offer in the `appliedOffers` array
        //     multi: true, // Ensure all matching categories are updated
        //   }
        // );

        res.json({
          status: "success",
          message: "offer edited successfully",
        });
      } else {
        res.json({
          status: "error",
          message: "offer can't edit",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.json({
      status: "error",
      message: "something error",
    });
  }
};

const listOffer = async (req, res) => {
  try {
    const offerid = req.params.id;
    const offer = await Offers.findById({ _id: offerid });
    const updatedoffer = await Offers.findByIdAndUpdate(
      offerid,
      { isListed: !offer.isListed },
      { new: true }
    );
    if (updatedoffer) {
      res.json({
        status: "success",
        message: offer.isListed ? "offer unlisted" : "offer     listed",
      });
    } else {
      res.json({
        status: "error",
        message: "can't update",
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

const applyOfferToProducts = async (req, res) => {
  console.log("applyOfferToProducts", req.body, req.params);

  try {
    const { productIds } = req.body;
    const { id } = req.params;

    // Find the offer by ID
    const offer = await Offers.findById(id);
    if (!offer) {
      return res
        .status(400)
        .json({ status: "error", message: "Offer not found" });
    }

    // Fetch products to check for existing offers
    const products = await Product.find({ _id: { $in: productIds } });

    // Filter out products that already have the offer applied
    const productsToUpdate = products
      .filter(
        (product) =>
          !product.offers.some(
            (existingOffer) =>
              existingOffer.offerId.toString() === offer._id.toString()
          )
      )
      .map((product) => product._id);

    if (productsToUpdate.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Offer is already applied to the selected products",
      });
    }

    // Apply the offer to the filtered products
    await Product.updateMany(
      { _id: { $in: productsToUpdate } },
      {
        $addToSet: {
          offers: {
            offerId: offer._id,
            offerName: offer.offerName,
            offerCode: offer.offerCode,
            discount: offer.discount,
            offerType: offer.offerType,
            expiryDate: offer.expiryDate,
          },
        },
      }
    );

    return res.status(200).json({
      status: "success",
      message: `Offer applied to ${productsToUpdate.length} products`,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Something went wrong" });
  }
};

const applyOfferToCategories = async (req, res) => {
  console.log("applyOfferToCategories", req.body, req.params);

  try {
    const { categoryIds } = req.body;
    const { id } = req.params;

    // Find the offer by ID
    const offer = await Offers.findById(id);
    if (!offer) {
      return res
        .status(400)
        .json({ status: "error", message: "Offer not found" });
    }

    // Fetch categories based on IDs and extract their labels
    const categories = await Category.find({ _id: { $in: categoryIds } });

    // Filter categories that already have the offer applied
    // const categoriesToUpdate = categories.filter(
    //   (category) =>
    //     !category.offers.some(
    //       (existingOffer) =>
    //         existingOffer.offerId.toString() === offer._id.toString()
    //     )
    // );

    const categoryLabelsToUpdate = categories.map(
      (category) => category.label
    );

    if (categories.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "select any category",
      });
    }

    // Apply the offer to the filtered categories
    await Category.updateMany(
      { _id: { $in: categories.map((category) => category._id) } },
      {
        $addToSet: {
          offers: {
            offerId: offer._id,
            offerName: offer.offerName,
            offerCode: offer.offerCode,
            discount: offer.discount,
            offerType: offer.offerType,
            expiryDate: offer.expiryDate,
          },
        },
      }
    );

    // Fetch products belonging to the selected category labels
    const products = await Product.find({
      category: { $in: categoryLabelsToUpdate },
    });

    // Filter out products that already have the offer applied
    const productsToUpdate = products
      .filter(
        (product) =>
          !product.offers.some(
            (existingOffer) =>
              existingOffer.offerId.toString() === offer._id.toString()
          )
      )
      .map((product) => product._id);

    // Apply the offer to the filtered products
    if (productsToUpdate.length > 0) {
      await Product.updateMany(
        { _id: { $in: productsToUpdate } },
        {
          $addToSet: {
            offers: {
              offerId: offer._id,
              offerName: offer.offerName,
              offerCode: offer.offerCode,
              discount: offer.discount,
              offerType: offer.offerType,
              expiryDate: offer.expiryDate,
            },
          },
        }
      );
    }

    return res.status(200).json({
      status: "success",
      message: `Offer applied to ${categories.length} categories and ${productsToUpdate.length} products`,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: "error", message: "Something went wrong" });
  }
};

module.exports={
    offers,
    addOffer,
    addOfferPost,
    editOffer,
    editOfferPost,
    listOffer,
    applyOfferToProducts,
    applyOfferToCategories,
}