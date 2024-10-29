const exress = require('express');
const {register, login} = require('../../controllers/authController')
const router = exress.Router();

router.post('/register', register)
router.post('/login', login)
router.get('/logout', (req, res) => {
  res.clearCookie('token'); // Clear the JWT cookie
  res.redirect('/'); // Redirect to the homepage after logout
});


module.exports = router;
