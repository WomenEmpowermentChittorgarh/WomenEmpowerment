const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const responseHandler = require('../utils/responseHandler');

const router = express.Router();
const UserSecretKey = "WomenEmpowerment@ICDS#";

router.get('/getUserToken', (req, res) => {
    const { userId } = req.query;
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        if (data.length === 0) {
            return res.status(404).json(responseHandler("Not Found", 404, "User not found"));
        }

        jwt.sign({ userId }, UserSecretKey, { expiresIn: '432000s' }, (err, token) => {
            if (err) {
                console.error(err);
                return res.status(500).json(responseHandler("Failure", 500, "Token generation failed"));
            }
            res.status(200).json(responseHandler("Success", 200, "Token generated successfully", { token }));
        });
    });
});

module.exports = router;
