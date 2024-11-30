const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');

const router = express.Router();

router.get('/get_all_sathin_mpr', VerifyUserToken, (req, res) => {
    const sql = 'SELECT * FROM sathin_mpr';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Database error"));
        }
        res.status(200).json(responseHandler("Success", 200, "Data fetched successfully", results));
    });
});

module.exports = router;
