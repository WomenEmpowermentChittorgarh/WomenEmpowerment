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
        const tempDir = path.join(__dirname, '../ImageView');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        var filename = file.originalname.replace(/ /g, "%20")
        cb(null, `${Date.now()}-${filename}`);
    }
});

const upload = multer({ storage });

router.get('/test', (req, res) => {
    const sql = 'SELECT * FROM images';
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", data));
    });
});

router.post('/post_image', VerifyUserToken, upload.single('document'), (req, res) => {
    const { type } = req.body;

    if (!type || !req.file) {
        return res.status(400).json(responseHandler("Alert", 400, "All fields are required, including Image"));
    }

    const sql = `INSERT INTO images (image, type) VALUES (?, ?)`;

    db.query(sql, [type], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        const imageId = data.insertId;
        const imageDir = path.join(__dirname, '../imageview', String(imageId));
        if (!fs.existsSync(imageDir)) {
            fs.mkdirSync(imageDir, { recursive: true });
        }

        const newFilePath = path.join(imageDir, req.file.originalname);
        fs.rename(req.file.path, newFilePath, (renameErr) => {
            if (renameErr) {
                console.error("File rename error:", renameErr);
                return res.status(500).json(responseHandler("Failure", 500, "Error moving image"));
            }

            let relativeFilePath = path.join('imageview', String(imageId), req.file.originalname);
            relativeFilePath = relativeFilePath.replace(/ /g, '%20'); // Replace spaces with %20
            const updateSql = 'UPDATE images SET image = ? WHERE id = ?';
            db.query(updateSql, [`https://sakhi-empowerment.in/${relativeFilePath}`, imageId], (updateErr) => {
                if (updateErr) {
                    console.error("Database update error:", updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Error updating image path"));
                }

                res.status(201).json(responseHandler("Success", 201, "Scheme added successfully", { type, image: 'https://sakhi-empowerment.in/'+relativeFilePath }));
            });
        });
    });
});

module.exports = router;