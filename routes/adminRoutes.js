// adminRoutes.js
const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const { createAdmin } = require('../controllers/authController');
const Product = require('../models/Product');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const xlsx = require('xlsx');
const moment = require('moment');

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
        console.error('Error exporting orders:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error exporting orders to Excel'
        });
    }
});

// Admin dashboard route
router.get('/dashboard', requireAdmin, async (req, res) => {
    try {
        const products = await Product.find({});
        const admin = req.admin;
        
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

        const order = await Order.findByIdAndUpdate(
            req.params.id, 
            { shippingStatus }, 
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
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
// GET /edit-product/:id
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
        
        // Delete main image
        if (product.imageH) {
            await fs.unlink('public' + product.imageH).catch(err => console.error('Error deleting main image:', err));
        }

        // Delete version images
        for (const version of product.versions) {
            for (const img of version.image) {
                await fs.unlink('public' + img).catch(err => console.error('Error deleting version image:', err));
            }
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error deleting product'
        });
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



module.exports = router;