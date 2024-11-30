const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');

const router = express.Router();

router.get('/', VerifyUserToken, (req, res) => {
    const sql = 'SELECT * FROM blocks ORDER BY name';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "Blocks fetched successfully", { data }));
    });
});

router.post('/', VerifyUserToken, (req, res) => {
    const { Name } = req.body;

    if (!Name) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Name field is required"));
    }

    const sql = 'INSERT INTO blocks (name) VALUES (?)';
    db.query(sql, [Name], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Block already exists"));
        }
        res.status(200).json(responseHandler("Success", 200, "Block added successfully"));
    });
});

module.exports = router;
