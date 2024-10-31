require("dotenv").config();
const express = require("express");
const app = express();
const homepageRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/api/auth');
const accountRoutes = require('./routes/addressRoutes');
const loginRoutes = require('./routes/loginRoutes');
const cartRoutes = require('./routes/cartRoutes');
const {connectDB} = require('./connection/db');
const cookieParser = require('cookie-parser');


connectDB()

app.set('view engine', 'ejs')
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());


//Routes
app.use('/api/auth', authRoutes);
app.use('/', loginRoutes);
app.use('/', homepageRoutes);
app.use('/', accountRoutes);
app.use('/api/cart', cartRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

