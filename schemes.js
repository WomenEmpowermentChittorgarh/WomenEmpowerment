const express = require('express');
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
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
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "Schemes fetched successfully", { data }));
    });
});

router.post('/', upload.single('Image'), (req, res) => {
    const { SchemeName, Description, WebsiteUrl } = req.body;

    if (!SchemeName || !Description || !WebsiteUrl || !req.file) {
        return res.status(400).json(responseHandler("Bad Request", 400, "All fields are required"));
    }

    const sql = 'INSERT INTO schemes (SchemeName, Description, WebsiteUrl, Image) VALUES (?, ?, ?, ?)';
    db.query(sql, [SchemeName, Description, WebsiteUrl, ''], (err, data) => {
        if (err) {
            console.error(err);
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
                console.error(renameErr);
                return res.status(500).json(responseHandler("Failure", 500, "Error moving image"));
            }

            const relativeFilePath = path.join('schemes', String(schemeId), req.file.originalname);

            const updateSql = 'UPDATE schemes SET Image = ? WHERE id = ?';
            db.query(updateSql, [relativeFilePath, schemeId], (updateErr) => {
                if (updateErr) {
                    console.error(updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Error updating image path"));
                }

                res.status(201).json(responseHandler("Success", 201, "Scheme added successfully", { schemeId, Image: relativeFilePath }));
            });
        });
    });
});

module.exports = router;
