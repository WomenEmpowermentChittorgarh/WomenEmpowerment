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
        const tempDir = path.join(__dirname, '../schemesImg');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      var filename = file.originalname.replace(/ /g,"%20")
        cb(null, `${Date.now()}-${filename}`);
    }
});

const upload = multer({ storage });

router.get('/fetch-schemes', VerifyUserToken, (req, res) => {
    const sql = 'SELECT * FROM schemes';
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        const schemes = data.map(row => ({
           id: row.id,
           scheme_name: row.scheme_name,
           started_date: row.started_date
       }));
        res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", { schemes }));
    });
});

router.get('/get-schemes-carousel', VerifyUserToken, (req, res) => {
    const carouselImages = [
  ];
  res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", { carouselImages }));
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
        const schemeDir = path.join(__dirname, '../schemesImg', String(schemeId));
        if (!fs.existsSync(schemeDir)) {
            fs.mkdirSync(schemeDir, { recursive: true });
        }

        const newFilePath = path.join(schemeDir, req.file.originalname);
        fs.rename(req.file.path, newFilePath, (renameErr) => {
            if (renameErr) {
                console.error("File rename error:", renameErr);
                return res.status(500).json(responseHandler("Failure", 500, "Error moving image"));
            }

            const relativeFilePath = path.join('schemesImg', String(schemeId), req.file.originalname);
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

app.delete('/:id', (req, res) => {
    const schemeId = req.params.id;

    // Check if the scheme exists and retrieve the image path
    const sqlSelect = 'SELECT Image FROM schemes WHERE id = ?';
    db.query(sqlSelect, [schemeId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        if (result.length === 0) {
            return res.status(404).json(responseHandler("Not Found", 404, "Scheme not found"));
        }

        const imagePath = result[0].Image;

        // Construct the folder path
        const schemeDir = path.join(__dirname, 'schemes', String(schemeId));

        // Delete the scheme data from the database
        const sqlDelete = 'DELETE FROM schemes WHERE id = ?';
        db.query(sqlDelete, [schemeId], (deleteErr) => {
            if (deleteErr) {
                console.error("Database error during deletion:", deleteErr);
                return res.status(500).json(responseHandler("Failure", 500, "Error deleting scheme from database"));
            }

            // Delete the folder containing the image
            fs.rm(schemeDir, { recursive: true, force: true }, (fsErr) => {
                if (fsErr) {
                    console.error("File system error during folder deletion:", fsErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Error deleting scheme folder"));
                }

                res.status(200).json(responseHandler("Success", 200, "Scheme deleted successfully"));
            });
        });
    });
});

module.exports = router;
