const User = require("../../model/userSchema");
const Product = require("../../model/productsSchema");
const Category = require("../../model/categorySchema");
const Cart = require("../../model/cartSchema");
const Orders = require("../../model/orderSchema");
const Coupons = require("../../model/couponSchema");
const Offers = require("../../model/offerSchema");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const adminLogout = async (req, res) => {
    console.log("adminlogout");
  
    try {
      req.session.destroy((err) => {
        if (err) {
          Server;
          return res.status(500).json({
            status: "error",
            message: "failed to logout",
          });
        }
        res.redirect("/userhome");
      });
    } catch (error) {
      res.send(error.message);
    }
  };

  const adminhome = async (req, res) => {
    try {
      console.log('adminhome');
      const {filter}=req.query;
      console.log('filter',filter);
        
      const date=new Date();
      let startDate;
  
      if (filter === 'monthly') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1); // Start of the month
      } else if (filter === 'weekly') {
        startDate = new Date(date.setDate(date.getDate() - 7)); // Last 7 days
      } else if (filter === 'daily') {
        startDate = new Date(date.setDate(date.getDate()-1)); // Start of the day
      }else {
        startDate = new Date(date.getFullYear(), 0, 1); // Start of the year
      }  
  
      
      const queries = await Promise.all([
        Orders.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              totalSales: { $sum: "$totalPrice" },
              orderCount: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
  
        Orders.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate },
            },
          },
          {
            $group: {
              _id: "$orderStatus",
              count: { $sum: 1 },
            },
          },
        ]),
  
        Orders.aggregate([
          {
            $group: {
              _id: null,
              salesCount: { $sum: 1 },
              totalOrderAmount: { $sum: "$totalPrice" },
              totalDiscount: { $sum: "$discount" },
              totalCoupons: { $sum: "$totalCouponDiscount" },
            },
          },
        ]),
  
        Orders.aggregate([
          {
            $unwind: "$products",
          },
          {
            $group: {
              _id: "$products.productId",
              totalQuantity: { $sum: "$products.quantity" },
            },
          },
          {
            $sort: { totalQuantity: -1 },
          },
          {
            $limit: 1 },
        ]),
  
        Orders.aggregate([
          { $unwind: "$products" },
          {
            $group: {
              _id: "$products.productId",
              totalSold: { $sum: "$products.quantity" },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "products",
              localField: "_id",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
        ]),
  
        Orders.aggregate([
          { $unwind: "$products" },
          {
            $lookup: {
              from: "products",
              localField: "products.productId",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          {
            $group: {
              _id: "$productDetails.category",
              totalSold: { $sum: "$products.quantity" },
            },
          },
          { $sort: { totalSold: -1 } },
          { $limit: 5 },
        ]),
      ]);
  
      const [ordersData, orderStatusData, salesData, mostOrderedProductId, topProducts, topCategories] = queries;
  
      const mostOrderedProduct = mostOrderedProductId.length > 0 ? await Product.findById(mostOrderedProductId[0]._id) : null;
  
      const totalSales = await Orders.countDocuments();     
  
      if (filter) {
        return res.json({
          ordersData,
          orderStatusData,
        });
      }else{
      res.render("admin/sales", {
        filter,
        orderStatusData,
        ordersData,
        topProducts,
        topCategories,
        totalSales,
        salesData,
        totalSalesAmount: salesData[0] ? salesData[0].totalOrderAmount.toFixed(2):0,
        salesReport: salesData[0] || null,
        totalDiscountAmount: salesData[0]?salesData[0].totalDiscount.toFixed(2):0,
        mostOrderedProduct: mostOrderedProduct ? mostOrderedProduct.pname:null,
      })};
    } catch (error) {
      console.log(error);
      res.send(`
        <html>
        <head>
            <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        </head>
        <body>
            <script>
                Swal.fire({
                    icon: 'error',
                    text: 'something error',
                    confirmButtonText: 'OK'
                }).then(() => {
              window.location.href='/admin/adminhome'
              });;
            </script>
        </body>   
    </html>
  `);  }
  };

  const topbar = async (req, res) => {
    try {
        res.render("topbar");
    } catch (error) {
      res.send(error.message);
    }
  }

const sidebar = async (req, res) => {
    try {
      res.render("sidebar");
    } catch (error) {
      res.send(error.message);
    }
  }

const _header = async (req, res) => {
  try {
      res.render("_header");
  } catch (error) {
    res.send(error.message);
  }
};
const salesReport = async (req, res) => {
    try {
      
      console.log('salesreport',req.query);
      
      const { reportType, startDate, endDate, format } = req.query;
  
      // Date filtering logic
      let filter = {};
      if (reportType === "custom" && startDate && endDate) {
        filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      } else if (reportType === "daily") {
        const today = new Date();
        filter.createdAt = {
          $gte: new Date(today.setHours(0, 0, 0)),
          $lte: new Date(today.setHours(23, 59, 59)),
        };
      } else if (reportType == "weekly") {
        const today = new Date();
        const weekStart = new Date(
          today.setDate(today.getDate() - today.getDay())
        );
        filter.createdAt = {
          $gte: new Date(weekStart.setHours(0, 0, 0)),
          $lte: new Date(),
        };
      } else if (reportType === "monthly") {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        filter.createdAt = { $gte: monthStart, $lte: new Date() };
      }
  
      const orders = await Orders.find(filter)
        .populate("userId") 
        .populate("products.productId") 
        .lean();
  
        console.log('orderaddress',orders);
        
  
      if (orders.length<0) {
        return res.json({
          status:'error',
          message:"No orders found for the selected period."
      })}
  
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);    
  
      // Generate Report based on format
      if (format === "pdf") {
        const doc = new PDFDocument({ margin: 30 });
        const fileName = `sales-report-${reportType}.pdf`;
      
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
        doc.pipe(res);
      
        // PDF Header
        const currentDate = new Date();
        const dateAndTime = currentDate.toLocaleString();
        doc.fontSize(18).text("Sales Report", { align: "center" }).moveDown();
        doc.fontSize(15).text("E-store", { align: "center" })
        doc.fontSize(13).text("Online fashion store", { align: "center" })
  
  
        doc.fontSize(14).text(`Report Type: ${reportType}`);
        if(reportType=='custom'){
          doc.text(`Start Date: ${startDate}`);
          doc.text(`End Date: ${endDate}`);
        }
        doc.text(`Total Orders: ${totalOrders}`);
        doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`).moveDown();
        doc.text(`Date: ${dateAndTime}`);
  
      
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      
        // Adjusted column widths
        const columnWidths = [
          pageWidth * 0.15, // Order ID
          pageWidth * 0.10, // User Name
          pageWidth * 0.17, // Payment Method
          pageWidth * 0.35, // Products
          pageWidth * 0.12, // Discount
          pageWidth * 0.11, // Total Price
        ];
      
        const startX = doc.page.margins.left;
        let currentY = doc.y;
      
        const tableHeaders = [
          "Order ID",
          "User Name",
          "Payment Method",
          "Products",
          "Discount",
          "Total Price",
        ];
      
        // Function to calculate row height dynamically
        const calculateRowHeight = (columns, columnWidths, fontSize) => {
          const padding = 10;
          return columns.reduce((maxHeight, text, index) => {
            const columnWidth = columnWidths[index] - padding;
            const lines = doc.heightOfString(text, { width: columnWidth, fontSize });
            return Math.max(maxHeight, lines);
          }, 0) + padding;
        };
      
        // Function to draw rows
        const drawRow = (y, columns, isHeader = false) => {
          const fontSize = isHeader ? 12 : 10;
          const rowHeight = calculateRowHeight(columns, columnWidths, fontSize);
      
          let x = startX;
      
          columns.forEach((text, index) => {
            const columnWidth = columnWidths[index];
      
            // Draw cell border
            doc
              .rect(x, y, columnWidth, rowHeight)
              .stroke();
      
            // Add text inside cell
            doc
              .fontSize(fontSize)
              .text(text, x + 5, y + 5, { width: columnWidth - 10, align: "left" });
      
            x += columnWidth;
          });
      
          return y + rowHeight; // Return the new Y position
        };
      
        // Draw Table Header
        currentY = drawRow(currentY, tableHeaders, true);
      
        // Table Body
        orders.forEach((order) => {        
          if (currentY > doc.page.height - 50) {
            doc.addPage();
            currentY = 50; // Reset Y position for new page
            currentY = drawRow(currentY, tableHeaders, true); // Redraw header
          }
      
          // Combine product details into a single string
          const productDetails = order.products
            .map(
              (product) =>
                `${product.productId.pname} (Qty: ${product.quantity}, ₹${product.price.toFixed(
                  2
                )})`
            )
            .join("\n");
      
          // Order Row with dynamic row height
          currentY = drawRow(currentY, [
            order._id,
            order.userId.name,
            order.paymentMethod,
            productDetails,
            `₹${order.discount || 0}`, // Discount column
            `₹${order.totalPrice.toFixed(2)}`, // Total Price column
          ]);
        });
      
        doc.end();
      }
      
       else if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Sales Report");
  
        // Excel Header
        worksheet.columns = [
          { header: "Order ID", key: "_id", width: 30 },
          { header: "User Name", key: "userName", width: 20 },
          { header: "Payment method", key: "PaymentMethod", width: 25 },
          { header: "Products", key: "Products", width: 30 },
          { header: "Discount", key: "discount", width: 15 },
          { header: "Total Price (₹)", key: "totalPrice", width: 15 },
          { header: "Created At", key: "createdAt", width: 20 },
        ];
  
        // Adding rows
        orders.forEach((order) => {
          worksheet.addRow({
            _id: order._id,
            userName: order.userId.name,
            PaymentMethod: order.paymentMethod,
            Products: order.products.map((product) => product.productId.pname).join(", "),
            totalPrice: `₹${order.totalPrice}`,
            discount: order.discount || "N/A",
            createdAt: order.createdAt.toISOString(),
          });
  
         
        });
  
        // Total Summary Row
        worksheet.addRow({});
        worksheet.addRow({ _id: "Total Orders:", totalPrice: totalOrders });
        worksheet.addRow({ _id: "Total Revenue:", totalPrice: `₹${totalRevenue.toFixed(2)}` });
  
        const fileName = `sales-report-${reportType}.xlsx`;
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
  
        await workbook.xlsx.write(res);
      
        res.end();
      } else {
        res.status(400).send("Invalid format specified.");
      }
    } catch (err) {
      console.log("Error generating sales report:", err);
      res.json({
        status:'error',
        message:"An error occurred while generating the sales report."
  
    })
  }
  }

  module.exports = {
    adminLogout,
    adminhome,
    topbar,
    sidebar,
    _header,
    salesReport,

  }
