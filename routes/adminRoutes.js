// adminRoutes.js
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { createAdmin } = require('../controllers/authController');
const User = require('../models/User');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const xlsx = require('xlsx');
const moment = require('moment');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_HOST,
    port: process.env.MAILTRAP_PORT,
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS
    }
  });

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/resources/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    }
});

router.get('/export-orders', requireAdmin, async (req, res) => {
    try {
        // Fetch completed orders with populated product details
        const completedOrders = await Order.find({ 
            $or: [
                { status: 'confirmed' },
                { paymentStatus: 'paid' }
            ]
        }).populate('items.product');

        // Prepare data for Excel export
        const exportData = completedOrders.map(order => {
            // Flatten order details for easy Excel export
            return {
                'Order ID': order._id.toString(),
                'Customer Name': order.customerName.firstName + ' ' + order.customerName.lastName,
                'Email': order.customerEmail,
                'Total Amount': order.totalAmount,
                'Payment Status': order.paymentStatus,
                'Shipping Status': order.shippingStatus,
                'Order Date': moment(order.createdAt).format('YYYY-MM-DD HH:mm:ss'),
                'Items': order.items.map(item => 
                    `${item.product.name} (${item.version}) x ${item.quantity}`
                ).join('; '),
                'Shipping Address': [
                    order.shippingAddress.street,
                    order.shippingAddress.city,
                    order.shippingAddress.state,
                    order.shippingAddress.zipCode,
                    order.shippingAddress.country
                ].filter(Boolean).join(', '),
                'Phone Number': order.shippingAddress.phone
            };
        });

        // Create a new workbook and worksheet
        const worksheet = xlsx.utils.json_to_sheet(exportData);
        const workbook = xlsx.utils.book_new();
        
        // Add the worksheet to the workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Completed Orders');

        // Generate a filename with current date
        const filename = `completed_orders_${moment().format('YYYYMMDD_HHmmss')}.xlsx`;

        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

        // Send the Excel file
        const excelBuffer = xlsx.write(workbook, { 
            type: 'buffer', 
            bookType: 'xlsx' 
        });
        res.send(excelBuffer);

    } catch (error) {
        console.error('Detailed error updating order status:', error.message, error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating order status',
            errorDetails: error.message 
        });
    }
});

// Admin dashboard route
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find({isDeleted: false});
        const admin = req.admin;

        const blacklistedProducts = await Product.find({isDeleted: true});
        
        let admins = [];
        let orders = [];
        
        if (admin.role === 'super_admin') {
            admins = await Admin.find({}, '-password');
        }
        
        // Fetch paid and confirmed orders with populated product details
        orders = await Order.find({ 
            $or: [
                { status: 'confirmed' },
                { paymentStatus: 'paid' }
            ]
        }).populate('items.product');
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        
        res.render('adminDash', {
            admin: {
                _id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                lastLogin: admin.lastLogin
            },
            products: products,
            admins: admins,
            orders: orders,
            blacklistedProducts: blacklistedProducts,
            title: 'Admin Dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', { 
            message: 'Error loading admin dashboard'
        });
    }
});

// Add product form route
router.get('/add-product', requireAdmin, async (req, res) => {
    try {
        const admin = req.admin;
        res.render('addProduct', {
            admin: {
                username: admin.username,
                email: admin.email,
                role: admin.role,
                lastLogin: admin.lastLogin
            },
            title: 'Add Product'
        });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).render('error', { 
            message: 'Error loading add product form'
        });
    }
});

router.put('/update-order-status/:id', requireAdmin, async (req, res) => {
    try {
        const { shippingStatus } = req.body;

        // Validate shipping status
        const validStatuses = ['preparing', 'shipped'];
        if (!validStatuses.includes(shippingStatus)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid shipping status' 
            });
        }

        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Update shipping status
        order.shippingStatus = shippingStatus;
        await order.save();

        // If status is shipped, send an email notification
        if (shippingStatus === 'shipped') {
            const user = await User.findById(order.user); // Get user details
            if (user) {
                const emailHtml = `
                      <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    <meta name='viewport' content='width=device-width, initial-scale=1'>

    <script src='https://kit.fontawesome.com/a076d05399.js' crossorigin='anonymous'></script>
    <title>Order Receipt - Chimelle Shop</title>
    <style>
        body {
            font-family: 'Montserrat';
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff0f5;
        }
        .receipt-container {
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            padding: 30px;
        }
        h1, h2, h3 {
            color: #da9e9f;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 20px;
        }
        h2 {
            font-size: 22px;
            border-bottom: 2px solid #da9e9f;
            padding-bottom: 10px;
            margin-top: 30px;
        }
        h3 {
            font-size: 18px;
            margin-top: 25px;
        }
        p {
            margin-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            border: 1px solid #da9e9f;
            padding: 12px;
            text-align: left;
        }
        th {
            background-color:#da9e9f;
            color: #ffffff;
        }
        .total {
            font-weight: bold;
            font-size: 18px;
            color: #da9e9f;
            font-style: italic ;
            margin-bottom: 40px;
        
        }
        .thank-you {
            text-align: center;
            margin-top: 10px;
            margin-bottom: 10px;
            font-style: italic;
            color:#da9e9f;
        }

     

.social-links {
    display: flex; 
    justify-content: center; 
    align-items: center; 
    gap: 20px; 
}

.social-links a {
    color: #da9e9f;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
}

.social-icon {
    font-size: 24px;
    transition: transform 0.3s ease, color 0.3s ease;
}

.social-icon:hover {
    color: #da9e9f;
    transform: scale(1.2); 
}

    </style>
</head>
<body>

  
    <div class="receipt-container">
        
       <h1>Dear ${user.firstName},</h1>
            <p>Your order <strong>${order._id}</strong> has been shipped.</p>
            <p>You can expect delivery soon. Thank you for shopping with us!</p>

        <div class = "footer">


        <p class="thank-you"> Thank you for shopping with Chimelle Shop!</p>

        <div class="social-links">
            <a href="https://www.facebook.com/chimelleshop" aria-label="Visit our Facebook page" target="_blank" rel="noopener noreferrer">
                <i class="fa-brands fa-facebook social-icon"></i>
            </a>
            <a href="https://x.com/chimelleshop" aria-label="Visit our Twitter page" target="_blank" rel="noopener noreferrer">
                <i class="fa-brands fa-twitter social-icon"></i>
            </a>
        </div>
        </div>
    </div>
</body>
      `;
                await transporter.sendMail({
                    from: '"Chimelle Shop" <noreply@chimelleshop.com>',
                    to: user.email,
                    subject: 'Your Order has been Shipped!',
                    html: emailHtml,
                });

                console.log(`Shipping email sent to ${user.email}`);
            }
        }
        res.json({ success: true, order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error updating order status' });
    }
});


// Handle product creation
router.post('/add-product', requireAdmin, upload.any(), async (req, res) => {
    try {
        const productData = JSON.parse(req.body.productData);
        
        // Process main image
        const mainImage = req.files.find(file => file.fieldname === 'imageH');
        if (!mainImage) {
            throw new Error('Main image is required');
        }
        productData.imageH = '/resources/' + mainImage.filename;

        // Process version images
        productData.versions = productData.versions.map((version, index) => {
            // Find all images for this version
            const versionImages = req.files
                .filter(file => file.fieldname === `versionImages_${index}`)
                .map(file => '/resources/' + file.filename);
            
            if (versionImages.length === 0) {
                throw new Error(`Images are required for version ${index + 1}`);
            }
            
            return {
                ...version,
                image: versionImages
            };
        });

        const product = new Product(productData);
        await product.save();

        res.json({ success: true, message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Error adding product'
        });
    }
});


// Update/Replace the edit product route
router.put('/edit-product/:id', requireAdmin, upload.any(), async (req, res) => {
    try {
        const productData = JSON.parse(req.body.productData);
        const oldProduct = await Product.findById(req.params.id);

        if (!oldProduct) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Handle main image deletion or update
        if (req.body.mainImageDeleted === 'true') {
            // Delete old main image if it exists
            if (oldProduct.imageH) {
                try {
                    await fs.unlink('public' + oldProduct.imageH);
                } catch (err) {
                    console.error('Error deleting old main image:', err);
                }
                // Set main image to null or empty string
                productData.imageH = '';
            }
        } else if (req.files && req.files.find(file => file.fieldname === 'imageH')) {
            // If a new main image is uploaded
            const mainImage = req.files.find(file => file.fieldname === 'imageH');
            // Delete old image if it exists
            if (oldProduct.imageH) {
                try {
                    await fs.unlink('public' + oldProduct.imageH);
                } catch (err) {
                    console.error('Error deleting old image:', err);
                }
            }
            productData.imageH = '/resources/' + mainImage.filename;
        }

        // Handle version images 
        productData.versions = await Promise.all(productData.versions.map(async (version, index) => {
            const oldVersion = oldProduct.versions[index];
            
            // Check if version exists in old product
            if (!oldVersion) return version;

            // Check if specific images were deleted
            const versionDeletedImages = req.body[`versions[${index}][deletedImages]`];
            
            if (versionDeletedImages) {
                // Delete specific images from the version
                await Promise.all(oldVersion.image.map(async (img) => {
                    try {
                        await fs.unlink('public' + img);
                    } catch (err) {
                        console.error('Error deleting old version image:', err);
                    }
                }));
                
                // Reset version images
                version.image = [];
            }

            // Check for new images uploaded
            const newImages = req.files ? req.files.filter(file => file.fieldname === `versionImages_${index}`) : [];

            if (newImages.length > 0) {
                // Add new images
                version.image = newImages.map(file => '/resources/' + file.filename);
            }

            return version;
        }));

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            productData,
            { new: true }
        );

        res.json({
            success: true,
            message: 'Product updated successfully',
            product: updatedProduct
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error updating product'
        });
    }
});

// PUT /edit-product/:id
router.put('/edit-product', requireAdmin, upload.fields([
    { name: 'imageH', maxCount: 1 },
    { name: 'versionImages', maxCount: 10 }
]), async (req, res) => {
    try {
        const { productId, productData } = req.body;
        const oldProduct = await Product.findById(productId);

        // Handle main image update
        if (req.files['imageH']) {
            // Delete old image
            if (oldProduct.imageH) {
                await fs.unlink('public' + oldProduct.imageH).catch(err => console.error('Error deleting old image:', err));
            }
            productData.imageH = '/resources/' + req.files['imageH'][0].filename;
        }

        // Handle version images update
        if (req.files['versionImages']) {
            productData.versions = productData.versions.map((version, index) => {
                const versionImages = req.files['versionImages']
                    .filter(img => img.fieldname === `versions[${index}][image]`)
                    .map(img => '/resources/' + img.filename);
                
                // Delete old version images
                if (oldProduct.versions[index]) {
                    oldProduct.versions[index].image.forEach(async (img) => {
                        await fs.unlink('public' + img).catch(err => console.error('Error deleting old version image:', err));
                    });
                }
                
                return {
                    ...version,
                    image: versionImages
                };
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            JSON.parse(productData),
            { new: true }
        );

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating product'
        });
    }
});

// Add this to the existing routes in adminRoutes.js
router.delete('/cancel-order/:id', requireAdmin, async (req, res) => {
    try {
        const { emergencyPassword } = req.body;

        // Validate emergency password (you should store this securely, 
        // ideally in an environment variable)
        const EMERGENCY_PASSWORD = process.env.EMERGENCY_ORDER_CANCEL_PASSWORD;

        if (!emergencyPassword || emergencyPassword !== EMERGENCY_PASSWORD) {
            return res.status(403).json({
                success: false,
                message: 'Invalid emergency password'
            });
        }

        // Find the order first to ensure it exists
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Delete the order
        await Order.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Order canceled and deleted successfully'
        });
    } catch (error) {
        console.error('Error canceling order:', error);
        res.status(500).json({
            success: false,
            message: 'Error canceling order'
        });
    }
});

// Delete product
router.delete('/delete-product/:id', requireAdmin, async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      product.isDeleted = true;
      await product.save();
  
      res.json({ success: true, message: 'Product blacklisted successfully' });
    } catch (error) {
      console.error('Error blacklisting product:', error);
      res.status(500).json({ success: false, message: 'Error blacklisting product' });
    }
  });

  router.put('/restore-product/:id', requireAdmin, async (req, res) => {
    try {
      const product = await Product.findById(req.params.id);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      product.isDeleted = false;
      await product.save();
  
      res.json({ success: true, message: 'Product restored successfully' });
    } catch (error) {
      console.error('Error restoring product:', error);
      res.status(500).json({ success: false, message: 'Error restoring product' });
    }
  });
  
// Get product for editing
router.get('/edit-product/:id', requireAdmin, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).render('error', { 
                message: 'Product not found'
            });
        }
        res.render('editProduct', { product });
    } catch (error) {
        res.status(500).render('error', { 
            message: 'Error loading product'
        });
    }
});

// Update product
router.put('/edit-product/:id', requireAdmin, upload.fields([
    { name: 'imageH', maxCount: 1 },
    { name: 'versionImages', maxCount: 10 }
]), async (req, res) => {
    try {
        const productData = JSON.parse(req.body.productData);
        const oldProduct = await Product.findById(req.params.id);

        // Handle main image update
        if (req.files['imageH']) {
            // Delete old image
            if (oldProduct.imageH) {
                await fs.unlink('public' + oldProduct.imageH).catch(err => console.error('Error deleting old image:', err));
            }
            productData.imageH = '/resources/' + req.files['imageH'][0].filename;
        }

        // Handle version images update
        if (req.files['versionImages']) {
            productData.versions = productData.versions.map((version, index) => {
                const versionImages = req.files['versionImages']
                    .filter(img => img.fieldname === `versions[${index}][image]`)
                    .map(img => '/resources/' + img.filename);
                
                // Delete old version images
                if (oldProduct.versions[index]) {
                    oldProduct.versions[index].image.forEach(async (img) => {
                        await fs.unlink('public' + img).catch(err => console.error('Error deleting old version image:', err));
                    });
                }
                
                return {
                    ...version,
                    image: versionImages
                };
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            productData,
            { new: true }
        );

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error updating product'
        });
    }
});

router.post('/create-admin', requireAdmin, async (req, res) => {
    try {
      await createAdmin(req, res);
    } catch (error) {
      console.error('Create admin route error:', error);
      res.status(500).json({ msg: 'Server error in create admin route' });
    }
  });

router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find({});
        const admin = req.admin;
        
        let admins = [];
        let orders = [];
        
        if (admin.role === 'super_admin') {
            admins = await Admin.find({}, '-password');
            console.log('Super admin role:', admin.role);
            console.log('Admins found:', admins.length);
            console.log('Admin details:', admin);
        }
        
        // Fetch orders with populated product details
        orders = await Order.find({ 
            $or: [
                { status: 'confirmed' },
                { paymentStatus: 'paid' }
            ]
        }).populate('items.product');
        
        res.render('adminDash', {
            admin: {
                _id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                lastLogin: admin.lastLogin
            },
            products: products,
            admins: admins,
            orders: orders,
            title: 'Admin Dashboard'
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', { 
            message: 'Error loading admin dashboard'
        });
    }
});

// Delete admin (only accessible by super_admin)
router.delete('/delete-admin/:id', requireAdmin, async (req, res) => {
    try {
        // Check if the requester is a super_admin
        if (req.admin.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only super administrators can delete admin accounts'
            });
        }

        // Prevent super_admin from deleting their own account
        if (req.admin._id.toString() === req.params.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        // Find and delete the admin
        const adminToDelete = await Admin.findById(req.params.id);
        if (!adminToDelete) {
            return res.status(404).json({
                success: false,
                message: 'Administrator not found'
            });
        }

        await Admin.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'Administrator account deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting administrator account'
        });
    }
});

router.put('/update-homepage-section/:id', requireAdmin, async (req, res) => {
    let { homepageSection } = req.body;

    try {
        // Convert an empty string to null
        if (homepageSection === '') {
            homepageSection = null;
        }

        // Validate the section value
        const validSections = ['new arrivals', 'best sellers', 'trending', 'featured', null];
        if (!validSections.includes(homepageSection)) {
            return res.status(400).json({ success: false, message: 'Invalid homepage section' });
        }

        // Update the product
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { homepageSection },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, product });
    } catch (error) {
        console.error('Error updating homepage section:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// In your admin routes
router.post('/update-announcement', async (req, res) => {
    try {
        const { productId, isEnabled, message, buttonText } = req.body;
        
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }
        
        product.announcementConfig = {
            isAnnouncement: isEnabled,
            message: isEnabled ? message : '',
            buttonText: isEnabled ? buttonText : 'Pre-order →'
        };
        
        await product.save();
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/remove-announcement', async (req, res) => {
    try {
        const { productId } = req.body;
        
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.json({ success: false, message: 'Product not found' });
        }
        
        product.announcementConfig = {
            isAnnouncement: false,
            message: '',
            buttonText: 'Pre-order →'
        };
        
        await product.save();
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});



module.exports = router;