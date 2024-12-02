const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const responseHandler = require('../utils/responseHandler');

const router = express.Router();

const UserSecretKey = "WomenEmpowerment@ICDS#";

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

router.post('/login', (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Phone number is required"));
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const sql = 'INSERT INTO otp_table (phone_number, otp, expires_at) VALUES (?, ?, ?)';
    db.query(sql, [phoneNumber, otp, expiresAt], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Failed to save OTP"));
        }
        console.log(`OTP ${otp} sent to ${phoneNumber}`); // Replace with actual SMS service
        res.status(200).json(responseHandler("Success", 200, "OTP sent successfully"));
    });
});

router.post('/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Phone number and OTP are required", null));
    }

    // Query to verify OTP
    const verifyOtpQuery = `
        SELECT * FROM otp_table
          WHERE phone_number = ? AND otp = ? AND expires_at > NOW()
    `;

    db.query(verifyOtpQuery, [phoneNumber, otp], (err, otpResults) => {
        if (err) {
            console.error('Error verifying OTP:', err);
            return res.status(500).json(responseHandler("Failure", 500, "Failed to verify OTP", null));
        }

        if (otpResults.length === 0) {
            return res.status(400).json(responseHandler("Failure", 400, "Invalid or expired OTP", null));
        }

        // Query to check if user exists
        const getUserQuery = `
            SELECT id AS userId, user_name AS userName, is_worker AS isWorker
            FROM users
            WHERE mobile_number = ?
        `;

        db.query(getUserQuery, [phoneNumber], (err, userResults) => {
            if (err) {
                console.error('Error fetching user details:', err);
                return res.status(500).json(responseHandler("Failure", 400, "Failed to fetch user details", null));
            }

            if (userResults.length === 0) {
                // User does not exist
                return res.status(200).json(responseHandler("Success", 200, "OTP verified", {
                    isExistingUser: 0,
                    message: 'OTP verified, but user not registered'
                }));
            }

            // User exists, return details
            const user = userResults[0];
            res.status(200).json(responseHandler("Success", 200, "Data Fetched", {
                isExistingUser: 1,
                userName: user.userName,
                userId: user.userId,
                isWorker: user.isWorker // Convert to boolean
            }));
        });
    });
});

router.get('/getUserToken', (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json(responseHandler("Bad Request", 400, "User ID is required"));
    }

    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        if (data.length === 0) {
            return res.status(404).json(responseHandler("Not Found", 404, "User not found"));
        }

        jwt.sign({ userId }, UserSecretKey, { expiresIn: '5d' }, (err, token) => {
            if (err) {
                console.error(err);
                return res.status(500).json(responseHandler("Failure", 500, "Token generation failed"));
            }
            res.status(200).json(responseHandler("Success", 200, "Token generated successfully", { token }));
        });
    });
});

module.exports = router;
