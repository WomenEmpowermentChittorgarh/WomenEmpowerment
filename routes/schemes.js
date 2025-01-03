const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const responseHandler = require('../utils/responseHandler');
const VerifyUserToken = require('../middleware/VerifyUserToken');

// express.use(bodyParser.json());

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
        var filename = file.originalname.replace(/ /g, "%20")
        cb(null, `${Date.now()}-${filename}`);
    }
});

const upload = multer({ storage });

// router.get('/fetch-schemes', VerifyUserToken, (req, res) => {
//     const sql = 'SELECT * FROM schemes';
//     db.query(sql, (err, data) => {
//         if (err) {
//             console.error("Database error:", err);
//             return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
//         }
//         const schemes = data.map(row => ({
//            id: row.id,
//            scheme_name: row.scheme_name,
//            started_date: row.started_date
//        }));
//         res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", { schemes }));
//     });
// });

// router.get('/getSchemeById', VerifyUserToken, (req, res) => {
//   const { id } = req.query;
//     const sql = 'SELECT * FROM schemes WHERE id = ?';
//     db.query(sql, [id], (err, data) => {
//         if (err) {
//             console.error("Database error:", err);
//             return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
//         }
//         res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", { data }));
//     });
// });


// router.get('/get-schemes-carousel', VerifyUserToken, (req, res) => {
//     const carouselImages = [
//   ];
//   res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", { carouselImages }));
// });


router.post('/', upload.single('document'), (req, res) => {
    const { scheme_name, department_name, started_date, introduction, objective, process, apply_mode, website_url, apply_website } = req.body;

    if (!scheme_name || !department_name || !started_date || !introduction || !objective || !process || !apply_mode || !apply_website || !website_url || !req.file) {
        return res.status(400).json(responseHandler("Alert", 400, "All fields are required, including Image"));
    }

    const sql = `
    INSERT INTO schemes 
(scheme_name, department_name, started_date, introduction, objective, process, apply_mode, website_url, document_url, apply_website) 
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [scheme_name, department_name, started_date, introduction, objective, process, apply_mode, website_url, '', apply_website], (err, data) => {
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

            let relativeFilePath = path.join('schemesImg', String(schemeId), req.file.originalname);
            relativeFilePath = relativeFilePath.replace(/ /g, '%20'); // Replace spaces with %20
            const updateSql = 'UPDATE schemes SET document_url = ? WHERE id = ?';
            db.query(updateSql, [relativeFilePath, schemeId], (updateErr) => {
                if (updateErr) {
                    console.error("Database update error:", updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Error updating image path"));
                }

                res.status(201).json(responseHandler("Success", 201, "Scheme added successfully", { schemeId, document_url: relativeFilePath }));
            });
        });
    });
});

// router.delete('/:id', (req, res) => {
//     const schemeId = req.params.id;

//     // Check if the scheme exists and retrieve the image path
//     const sqlSelect = 'SELECT Image FROM schemes WHERE id = ?';
//     db.query(sqlSelect, [schemeId], (err, result) => {
//         if (err) {
//             console.error("Database error:", err);
//             return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
//         }

//         if (result.length === 0) {
//             return res.status(404).json(responseHandler("Not Found", 404, "Scheme not found"));
//         }

//         const imagePath = result[0].Image;

//         // Construct the folder path
//         const schemeDir = path.join(__dirname, 'schemes', String(schemeId));

//         // Delete the scheme data from the database
//         const sqlDelete = 'DELETE FROM schemes WHERE id = ?';
//         db.query(sqlDelete, [schemeId], (deleteErr) => {
//             if (deleteErr) {
//                 console.error("Database error during deletion:", deleteErr);
//                 return res.status(500).json(responseHandler("Failure", 500, "Error deleting scheme from database"));
//             }

//             // Delete the folder containing the image
//             fs.rm(schemeDir, { recursive: true, force: true }, (fsErr) => {
//                 if (fsErr) {
//                     console.error("File system error during folder deletion:", fsErr);
//                     return res.status(500).json(responseHandler("Failure", 500, "Error deleting scheme folder"));
//                 }

//                 res.status(200).json(responseHandler("Success", 200, "Scheme deleted successfully"));
//             });
//         });
//     });
// });

// POST API to create a new scheme
// app.post("/api/schemes", upload.single("document"), (req, res) => {
//     const {
//       scheme_name,
//       department_name,
//       started_date,
//       introduction,
//       objective,
//       process,
//       apply_mode,
//       document_url,
//       apply_website,
//     } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ error: "Document file is required" });
//     }

//     const fileName = req.file.filename;
//     const website_url = `https://domainname.in/schemesImg/${fileName}`;

//     const sql = `
//       INSERT INTO schemes 
//       (scheme_name, department_name, started_date, introduction, objective, process, apply_mode, website_url, document_url, apply_website) 
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//     db.query(
//       sql,
//       [
//         scheme_name,
//         department_name,
//         started_date,
//         introduction,
//         objective,
//         process,
//         apply_mode,
//         website_url,
//         document_url,
//         apply_website,
//       ],
//       (err, result) => {
//         if (err) {
//           console.error(err);
//           return res.status(500).json({ error: "Failed to insert data into the database" });
//         }

//         res.status(201).json({
//           message: "Scheme created successfully",
//           schemeId: result.insertId,
//           website_url,
//         });
//       }
//     );
//   });

module.exports = router;
