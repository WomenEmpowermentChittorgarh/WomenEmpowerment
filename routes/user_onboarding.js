const express = require('express');
const db = require('../db');
const jwt = require('jsonwebtoken');
const responseHandler = require('../utils/responseHandler');
const axios = require('axios');

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

router.post('/verify-otp', async(req, res) => {

    const { accessToken } = req.body;
    const authkey = '435917AeGqWKgcy6751eecfP1'

    if (!accessToken) {
        return res.status(400).json({ error: 'accessToken is required' });
      }

      try {
        const response = await axios.post(
          'https://control.msg91.com/api/v5/widget/verifyAccessToken',
          {
            authkey,
            'access-token': accessToken,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
    
        // Respond with the API response
        res.status(response.status).json(response.data);
        const fullNumber = response.data.message;
        const numberWithoutCountryCode = fullNumber.startsWith('91')
        ? fullNumber.slice(2) // Remove the first two characters
        : fullNumber;

        const getUserQuery = `
              SELECT id AS userId, user_name AS userName, is_worker AS isWorker
              FROM users
              WHERE mobile_number = ?
          `;

          db.query(getUserQuery, [numberWithoutCountryCode], (err, userResults) => {
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
                  isWorker: user.isWorker,
                  admin_access: user.admin_access // Convert to boolean
              }));
          });


      } catch (error) {
        console.error('Error:', error.response?.data || error.message);
        res
          .status(error.response?.status || 500)
          .json({ error: error.response?.data || 'Internal Server Error' });
      }
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
