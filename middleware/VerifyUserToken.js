const jwt = require('jsonwebtoken');
const responseHandler = require('../utils/responseHandler'); // Path to responseHandler.js

const UserSecretKey = "WomenEmpowerment@ICDS#"; // Your secret key

/**
 * Middleware function to verify the JWT token.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 */
const VerifyUserToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (typeof token === 'undefined') {
        return res.status(403).json(responseHandler("Forbidden", 403, "Invalid Token"));
    }

    // If token exists, verify it
    jwt.verify(token, UserSecretKey, (err, authData) => {
        if (err) {
            return res.status(403).json(responseHandler("Forbidden", 403, "Invalid Token"));
        } else {
            req.authData = authData; // Add the decoded token data to the request object
            next(); // Proceed to the next middleware or route handler
        }
    });
};

module.exports = VerifyUserToken;
