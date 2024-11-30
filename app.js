const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const db = require('./db'); // Ensure correct path
const logger = require('./logger');
const responseHandler = require('./utils/responseHandler'); // Utility function

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

// Route imports
const userRoutes = require('./routes/users');
const schemeRoutes = require('./routes/schemes');
const blockRoutes = require('./routes/blocks');
const mprRoutes = require('./routes/mpr');
const tokenRoutes = require('./routes/token');
const otpRoutes = require('./routes/otp');
const sathinMprRoutes = require('./routes/sathinMpr');

// Mount routes
app.use('/users', userRoutes);
app.use('/schemes', schemeRoutes);
app.use('/blocks', blockRoutes);
app.use('/mpr', mprRoutes);
app.use('/token', tokenRoutes);
app.use('/otp', otpRoutes);
app.use('/sathinMpr', sathinMprRoutes);

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
