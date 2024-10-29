const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  try {
      // Validation checks...
      if (!firstName || !lastName || !email || !password) {
          return res.status(400).json({ msg: 'All fields are required' });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
          return res.status(400).json({ msg: 'Invalid email format' });
      }

      let user = await User.findOne({ email });
      if (user) {
          return res.status(400).json({ msg: 'User already exists' });
      }

      user = new User({
          firstName,
          lastName,
          email,
          password
      });
      
      await user.save();
      res.status(201).json({ msg: 'User created successfully' });
      
  } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ msg: 'Server error during registration' });
  }
};
 
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await User.findOne({ email }).select('+password');
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
          return res.status(400).json({ msg: 'Invalid credentials' });
      }

      // Generate a JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
          expiresIn: '24h',
      });

      // Set the JWT as a cookie
      res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });

      res.redirect('/');
  } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ msg: 'Server error during login' });
  }
};



