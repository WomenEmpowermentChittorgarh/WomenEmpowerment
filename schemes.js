const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const responseHandler = require('../utils/responseHandler');
const VerifyUserToken = require('../middleware/VerifyUserToken');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, '../schemes');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

router.get('/', VerifyUserToken, (req, res) => {
    const sql = 'SELECT * FROM schemes';
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", { data }));
    });
});

router.post('/', upload.single('Image'), (req, res) => {
    const { schemeName, description, website_url } = req.body;

    if (!schemeName || !description || !website_url || !req.file) {
        return res.status(400).json(responseHandler("Alert", 400, "All fields are required, including Image"));
    }

    const sql = 'INSERT INTO schemes (scheme_name, description, website_url, image) VALUES (?, ?, ?, ?)';
    db.query(sql, [schemeName, description, website_url, ''], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        const schemeId = data.insertId;
        const schemeDir = path.join(__dirname, '../schemes', String(schemeId));
        if (!fs.existsSync(schemeDir)) {
            fs.mkdirSync(schemeDir, { recursive: true });
        }

        const newFilePath = path.join(schemeDir, req.file.originalname);
        fs.rename(req.file.path, newFilePath, (renameErr) => {
            if (renameErr) {
                console.error("File rename error:", renameErr);
                return res.status(500).json(responseHandler("Failure", 500, "Error moving image"));
            }

            const relativeFilePath = path.join('schemes', String(schemeId), req.file.originalname);
            const updateSql = 'UPDATE schemes SET image = ? WHERE id = ?';
            db.query(updateSql, [relativeFilePath, schemeId], (updateErr) => {
                if (updateErr) {
                    console.error("Database update error:", updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Error updating image path"));
                }

                res.status(201).json(responseHandler("Success", 201, "Scheme added successfully", { schemeId, Image: relativeFilePath }));
            });
        });
    });
});

module.exports = router;
