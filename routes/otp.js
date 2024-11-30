const express = require('express');
const db = require('../db');
const responseHandler = require('../utils/responseHandler');

const router = express.Router();

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

router.post('/verify', (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Phone number and OTP are required"));
    }

    const sql = 'SELECT * FROM otp_table WHERE phone_number = ? AND otp = ? AND expires_at > NOW()';
    db.query(sql, [phoneNumber, otp], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Database error"));
        }
        if (results.length === 0) {
            return res.status(400).json(responseHandler("Failure", 400, "Invalid or expired OTP"));
        }
        res.status(200).json(responseHandler("Success", 200, "OTP verified successfully"));
    });
});

module.exports = router;
