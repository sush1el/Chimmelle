// routes/addressRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const AddressController = require('../controllers/addressController');
const Order = require('../models/Order');

// Routes
router.post('/account/addresses',
    authenticateUser, 
    AddressController.addAddress.bind(AddressController)
);

router.put('/account/addresses/:index', 
    authenticateUser, 
    AddressController.updateAddress.bind(AddressController)
);

router.delete('/account/addresses/:index',
    authenticateUser, 
    AddressController.deleteAddress.bind(AddressController)
);

router.get('/account/addresses', 
    authenticateUser, 
    AddressController.getAddresses.bind(AddressController)
);

router.put('/account/addresses/:index/default', 
    authenticateUser, 
    AddressController.setDefaultAddress.bind(AddressController)
);

router.put('/api/orders/:orderId/receive', authenticateUser, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.orderId,
            user: req.user._id,
            shippingStatus: 'shipped'
        });

        if (!order) {
            return res.status(400).json({ message: 'Cannot mark order as received' });
        }

        order.shippingStatus = 'received';
        order.receivedAt = new Date();
        await order.save();

        res.json({ message: 'Order marked as received', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;