require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./logger');
const db = require('./db'); // Database connection file
const path = require('path');

const app = express();

app.use(cors());
app.use(helmet());
// app.use(express.json());
app.use(express.json({ limit: '10mb' }));

// Route imports
const userRoutes = require('./routes/users');
const schemeRoutes = require('./routes/schemes');
const blockRoutes = require('./routes/blocks');
const mprRoutes = require('./routes/mpr');
const otpRoutes = require('./routes/user_onboarding');
const sathinMprRoutes = require('./routes/sathinMpr');
const imagesRoutes = require('./routes/images');
const helplineRoutes = require('./routes/helpline');
const locationRoutes = require('./routes/location');

// Mounting routes
app.use('/users', userRoutes);
app.use('/schemes', schemeRoutes);
app.use('/blocks', blockRoutes);
app.use('/mpr', mprRoutes);
app.use('/user-onboarding', otpRoutes);
app.use('/sathin-mpr', sathinMprRoutes);
app.use('/schemesImg', express.static(path.join(__dirname, 'schemesImg')));
app.use('/privacy', express.static(path.join(__dirname,  'privacy')));
app.use('/downloads', express.static(path.join(__dirname,  'downloads')));
app.use('/images', imagesRoutes);
app.use('/imageview', express.static(path.join(__dirname, 'imageview')));
app.use('/helpline', helplineRoutes);
app.use('/location', locationRoutes);


// Error handling for unmatched routes
app.use((req, res) => {
    res.status(404).json({
        statusCode: 404,
        status: "Not Found",
        message: "The requested route does not exist.",
    });
});

// Server configuration
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server started and listening on port ${PORT}`);
});
