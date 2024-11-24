require('dotenv').config();

var jwt = require('jsonwebtoken');
const logger = require("./logger");
const express = require('express')
const mysql = require('mysql')
const cors = require('cors')
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { log } = require('console');

const app = express()
// const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }); // 100 requests per 15 minutes

// app.use(limiter);
app.use(cors())
app.use(helmet());
app.use(express.json());
app.use('/schemes', express.static(path.join(__dirname, 'schemes')));

const UserSecretKey = "WomenEmpowerment@ICDS#"


const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
})

// // Multer configuration for storing images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join(__dirname, 'schemes');
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



//Users API

app.get('/users', (req, res) => {
    logger.log("debug", "Hello, World!"); //debug level as first param
    const sql = 'SELECT * FROM users';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json(data);
    });
});

app.get('/user/:id', (req, res) => {
    const userId = req.params.id; // Get 'id' from URL parameters

    // Parameterized query to prevent SQL injection
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (data.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json(data[0]);
    });
});


app.post('/user', (req, res) => {
    const { fullname, phone } = req.body;

    // Check if all required fields are provided
    if (!fullname || !phone ) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const sql = 'INSERT INTO users (FullName, Phone) VALUES (?, ?)';
    db.query(sql, [fullname, phone], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "User Already Exists" });
        }

        return res.status(201).json({ message: "User added successfully", userId: data.insertId });
    });
});

//Schemes API

app.get('/schemes', (req, res) => {
    const sql = 'SELECT * FROM schemes';
    db.query(sql, (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        res.status(200).json(data);
    });
});

app.post('/scheme', upload.single('Image'), (req, res) => {
    const { SchemeName, Description, WebsiteUrl } = req.body;

    // Validate input fields
    if (!SchemeName || !Description || !WebsiteUrl || !req.file) {
        return res.status(400).json({ message: "All fields are required, including Image" });
    }

    // Insert the scheme data into the database
    const sql = 'INSERT INTO schemes (SchemeName, Description, WebsiteUrl, Image) VALUES (?, ?, ?, ?)';
    db.query(sql, [SchemeName, Description, WebsiteUrl, ''], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        const schemeId = data.insertId;

        // Create a folder for the scheme
        const schemeDir = path.join(__dirname, 'schemes', String(schemeId));
        if (!fs.existsSync(schemeDir)) {
            fs.mkdirSync(schemeDir, { recursive: true });
        }

        // Move the image to the scheme's folder
        const newFilePath = path.join(schemeDir, req.file.originalname);
        fs.rename(req.file.path, newFilePath, (renameErr) => {
            if (renameErr) {
                console.error("File rename error:", renameErr);
                return res.status(500).json({ message: "Error moving image" });
            }

            // Construct the relative file path
            const relativeFilePath = path.join('schemes', String(schemeId), req.file.originalname);

            // Update the image path in the database
            const updateSql = 'UPDATE schemes SET Image = ? WHERE id = ?';
            db.query(updateSql, [relativeFilePath, schemeId], (updateErr) => {
                if (updateErr) {
                    console.error("Database update error:", updateErr);
                    return res.status(500).json({ message: "Error updating image path" });
                }

                res.status(201).json({
                    message: "Scheme added successfully",
                    schemeId,
                    Image: relativeFilePath,
                });
            });
        });
    });
});

app.delete('/scheme/:id', (req, res) => {
    const schemeId = req.params.id;

    // Check if the scheme exists and retrieve the image path
    const sqlSelect = 'SELECT Image FROM schemes WHERE id = ?';
    db.query(sqlSelect, [schemeId], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ message: "Scheme not found" });
        }

        const imagePath = result[0].Image;

        // Construct the folder path
        const schemeDir = path.join(__dirname, 'schemes', String(schemeId));

        // Delete the scheme data from the database
        const sqlDelete = 'DELETE FROM schemes WHERE id = ?';
        db.query(sqlDelete, [schemeId], (deleteErr) => {
            if (deleteErr) {
                console.error("Database error during deletion:", deleteErr);
                return res.status(500).json({ message: "Error deleting scheme from database" });
            }

            // Delete the folder containing the image
            fs.rm(schemeDir, { recursive: true, force: true }, (fsErr) => {
                if (fsErr) {
                    console.error("File system error during folder deletion:", fsErr);
                    return res.status(500).json({ message: "Error deleting scheme folder" });
                }

                res.status(200).json({ message: "Scheme deleted successfully" });
            });
        });
    });
});

//Blocks API

app.get('/blocks', (req, res) => {
    logger.log("debug", "Hello, World!"); //debug level as first param
    const sql = 'SELECT * FROM blocks ORDER BY name';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json(data);
    });
});

app.post('/block', (req, res) => {
    const { Name } = req.body;

    // Check if all required fields are provided
    if (!Name ) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const sql = 'INSERT INTO blocks (name) VALUES (?)';
    db.query(sql, [Name], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: err });
        }

        return res.status(201).json({ message: "Block added successfully", blockId: data.insertId });
    });
});

//MPR API

app.get('/getallMPR', (req, res) => {
    logger.log("debug", "Hello, World!"); //debug level as first param
    const sql = 'SELECT * FROM MonthlyProgressReport';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json(data);
    });
});

app.get('/MPR', (req, res) => {
    const { StartMonth, EndMonth, StartYear, EndYear } = req.body;
    if (!StartMonth || !EndMonth || !StartYear || !EndYear ) {
        return res.status(400).json({ message: "All fields are required" });
    }
    logger.log("debug", "Hello, World!"); //debug level as first param
    const sql = 'SELECT * FROM `MonthlyProgressReport` WHERE StartMonth=? AND EndMonth=? AND StartYear=? AND EndYear=?';
    db.query(sql, [StartMonth, EndMonth, StartYear, EndYear], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Internal Server Error" });
        }
        return res.status(200).json(data);
    });
});

app.post('/MPR', (req, res) => {
    const { StartMonth, EndMonth, StartYear, EndYear, Block, PreviousMonthCasesRecieved, CurrentMonthCasesRecieved, TotalCasesRecieved, PreviousMonthCasesResolved, CurrentMonthCasesResolved, TotalCasesResolved, CasesWithFir, MedicalAssistance, ShelterHomeAssistance, DIRAssistance, Other, PromotionalActivitiesNumber, NumberOfMeetingsOfDistrictMahilaSamadhanSamiti, Comments } = req.body;

    // Check if all required fields are provided
    if (!StartMonth || !EndMonth || !StartYear || !EndYear || !Block || !PreviousMonthCasesRecieved || !CurrentMonthCasesRecieved || !TotalCasesRecieved || !PreviousMonthCasesResolved || !CurrentMonthCasesResolved || !TotalCasesResolved || !CasesWithFir || !MedicalAssistance || !ShelterHomeAssistance || !DIRAssistance || !Other || !PromotionalActivitiesNumber || !NumberOfMeetingsOfDistrictMahilaSamadhanSamiti || !Comments) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const sql = 'INSERT INTO MonthlyProgressReport (StartMonth, EndMonth, StartYear, EndYear, Block, PreviousMonthCasesRecieved, CurrentMonthCasesRecieved, TotalCasesRecieved, PreviousMonthCasesResolved, CurrentMonthCasesResolved, TotalCasesResolved, CasesWithFir, MedicalAssistance, ShelterHomeAssistance, DIRAssistance, Other, PromotionalActivitiesNumber, NumberOfMeetingsOfDistrictMahilaSamadhanSamiti, Comment) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    db.query(sql, [ StartMonth, EndMonth, StartYear, EndYear, Block, PreviousMonthCasesRecieved, CurrentMonthCasesRecieved, TotalCasesRecieved, PreviousMonthCasesResolved, CurrentMonthCasesResolved, TotalCasesResolved, CasesWithFir, MedicalAssistance, ShelterHomeAssistance, DIRAssistance, Other, PromotionalActivitiesNumber, NumberOfMeetingsOfDistrictMahilaSamadhanSamiti, Comments ], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: err });
        }

        return res.status(201).json({ message: "MPR added successfully", blockId: data.insertId });
    });  
});


//Token API
app.get('/GetUserToken', (req, res) => {
    const { UserId } = req.body;
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [UserId], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ message: "Internal Server Error" });
        }

        if (data.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }

        jwt.sign({UserId},UserSecretKey,{expiresIn:'432000s'},(err,token)=>{
            if(err){
                res.json(err)
            }
            else{
                res.json({
                    token
                })
            }
        })
    });
});


const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Server started and listening on port ${PORT}`);
});
