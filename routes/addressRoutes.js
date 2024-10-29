// routes/addressRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/authMiddleware');
const AddressController = require('../controllers/addressController');

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

module.exports = router;