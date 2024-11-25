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

const responseHandler = (status, statusCode, message, payload = null) => {
    return {
        statusCode,
        status,
        message,
        payload
    };
};

//Users API

app.get('/users', (req, res) => {
    logger.log("debug", "Hello, World!"); //debug level as first param
    const sql = 'SELECT * FROM users';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, " Internal Server Error"));
        }
        return res.status(200).json(responseHandler("Success", 200, "Users Fetched successfully", {data: data}));
    });
});

app.get('/user/:id', (req, res) => {
    const userId = req.params.id; // Get 'id' from URL parameters

    // Parameterized query to prevent SQL injection
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, " Internal Server Error"));
        }

        if (data.length === 0) {
            return res.status(404).json(responseHandler("Not Found", 404, " User not found"));
        }
        return res.status(200).json(responseHandler("Success", 200, "User Fetched successfully", {data: data[0]}));
    });
});

app.post('/user_details', (req, res) => {
    const { fullname, phone } = req.body;

    // Check if all required fields are provided
    if (!fullname || !phone) {
        return res.status(400).json(responseHandler("Bad Request", 400, " All fields are required"));
    }

    const findUserSql = 'SELECT * FROM users WHERE Phone = ?';
    const updateUserSql = 'UPDATE users SET FullName = ? WHERE Phone = ?';
    const insertUserSql = 'INSERT INTO users (FullName, Phone, is_worker) VALUES (?, ?, 0)';

    db.query(findUserSql, [phone], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, " Internal Server Error"));
        }

        if (results.length > 0) {
            // User already exists, update details and return userId
            const userId = results[0].id; // Assuming `id` is the primary key column
            db.query(updateUserSql, [fullname, phone], (updateErr) => {
                if (updateErr) {
                    console.error("Update error:", updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Failed to update user details"));
                }
                return res.status(200).json(responseHandler("Success", 200, "User updated successfully", {userId: userId}));
            });
        } else {
            // User does not exist, insert a new user
            db.query(insertUserSql, [fullname, phone], (insertErr, data) => {
                if (insertErr) {
                    console.error("Insert error:", insertErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Failed to add new user"));
                }
                return res.status(200).json(responseHandler("Success", 200, "User added successfully", {userId: data.insertId}));
            });
        }
    });
});


//Schemes API

app.get('/schemes', VerifyUserToken, (req, res) => {
    jwt.verify(req.token, UserSecretKey, (err, authData) => {
        if (err) {
            res.status(403).json(responseHandler("Forbidden", 403, "Invalid Token"));
        } else {
            const sql = 'SELECT * FROM schemes';
            db.query(sql, (err, data) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
                }
                res.status(200).json(responseHandler("Success", 200, "Schemes Fetched successfully", { data }));
            });
        }
    });
});


app.post('/scheme', upload.single('Image'), (req, res) => {
    const { SchemeName, Description, WebsiteUrl } = req.body;

    // Validate input fields
    if (!SchemeName || !Description || !WebsiteUrl || !req.file) {
        res.status(400).json(responseHandler("Alert", 400, " All fields are required, including Image"));
        return res.status(400).json(responseHandler("Alert", 400, " All fields are required, including Image"));
    }

    // Insert the scheme data into the database
    const sql = 'INSERT INTO schemes (SchemeName, Description, WebsiteUrl, Image) VALUES (?, ?, ?, ?)';
    db.query(sql, [SchemeName, Description, WebsiteUrl, ''], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
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
                res.status(500).json(responseHandler("Failure", 500, "Error moving image"));
                return res.status(500).json(responseHandler("Failure", 500, "Error moving image"));
            }

            // Construct the relative file path
            const relativeFilePath = path.join('schemes', String(schemeId), req.file.originalname);

            // Update the image path in the database
            const updateSql = 'UPDATE schemes SET Image = ? WHERE id = ?';
            db.query(updateSql, [relativeFilePath, schemeId], (updateErr) => {
                if (updateErr) {
                    console.error("Database update error:", updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Error updating image path"));
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

//Blocks API

app.get('/blocks', VerifyUserToken, (req, res) => {
    jwt.verify(req.token, UserSecretKey, (err, authData)=>{
        if (err){
            res.status(403).json({
                result:'Invalid Token'
            })
        }
        else{
            const sql = 'SELECT * FROM blocks ORDER BY name';
            db.query(sql, (err, data) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
                }
                return res.status(200).json(responseHandler("Success", 200, "Blocks Fetched Successfully", {data}));
            });
        }
    })
});

app.post('/block', (req, res) => {
    jwt.verify(req.token, UserSecretKey, (err, authData)=>{
        if (err){
            res.status(403).json({
                result:'Invalid Token'
            })
        }
        else{
            const { Name } = req.body;
            
            // Check if all required fields are provided
            if (!Name ) {
                return res.status(400).json(responseHandler("Bad Request", 400, "All fields are required"));
            }
        
            const sql = 'INSERT INTO blocks (name) VALUES (?)';
            db.query(sql, [Name], (err, data) => {
                if (err) {
                    console.error("Database error:", err);
                    return res.status(500).json(responseHandler("Failure", 500, "Database error"));
                }
                return res.status(200).json(responseHandler("Success", 200, "Block added successfully"));
                // return res.status(201).json({ message: "Block added successfully", blockId: data.insertId });
            });
        }
    })
});

//MPR API

app.get('/getallMPR', (req, res) => {
    logger.log("debug", "Hello, World!"); //debug level as first param
    const sql = 'SELECT * FROM MonthlyProgressReport';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }        
        return res.status(200).json(responseHandler("Success", 200, "MPR's Fetched Successfully", {data}));
    });
});

app.get('/MPR', (req, res) => {
    const { StartMonth, EndMonth, StartYear, EndYear } = req.body;
    if (!StartMonth || !EndMonth || !StartYear || !EndYear ) {        
        return res.status(400).json(responseHandler("Bad Request", 400, "All fields are required"));
    }
    logger.log("debug", "Hello, World!"); //debug level as first param
    const sql = 'SELECT * FROM `MonthlyProgressReport` WHERE StartMonth=? AND EndMonth=? AND StartYear=? AND EndYear=?';
    db.query(sql, [StartMonth, EndMonth, StartYear, EndYear], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        return res.status(200).json(responseHandler("Success", 200, "MPR Fetched Successfully", {data}));
    });
});

app.post('/MPR', (req, res) => {
    const { StartMonth, EndMonth, StartYear, EndYear, Block, PreviousMonthCasesRecieved, CurrentMonthCasesRecieved, TotalCasesRecieved, PreviousMonthCasesResolved, CurrentMonthCasesResolved, TotalCasesResolved, CasesWithFir, MedicalAssistance, ShelterHomeAssistance, DIRAssistance, Other, PromotionalActivitiesNumber, NumberOfMeetingsOfDistrictMahilaSamadhanSamiti, Comments } = req.body;

    // Check if all required fields are provided
    if (!StartMonth || !EndMonth || !StartYear || !EndYear || !Block || !PreviousMonthCasesRecieved || !CurrentMonthCasesRecieved || !TotalCasesRecieved || !PreviousMonthCasesResolved || !CurrentMonthCasesResolved || !TotalCasesResolved || !CasesWithFir || !MedicalAssistance || !ShelterHomeAssistance || !DIRAssistance || !Other || !PromotionalActivitiesNumber || !NumberOfMeetingsOfDistrictMahilaSamadhanSamiti || !Comments) {
        return res.status(500).json(responseHandler("Bad Request", 500, "All fields are required"));
    }
    const sql = 'INSERT INTO MonthlyProgressReport (StartMonth, EndMonth, StartYear, EndYear, Block, PreviousMonthCasesRecieved, CurrentMonthCasesRecieved, TotalCasesRecieved, PreviousMonthCasesResolved, CurrentMonthCasesResolved, TotalCasesResolved, CasesWithFir, MedicalAssistance, ShelterHomeAssistance, DIRAssistance, Other, PromotionalActivitiesNumber, NumberOfMeetingsOfDistrictMahilaSamadhanSamiti, Comment) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    db.query(sql, [ StartMonth, EndMonth, StartYear, EndYear, Block, PreviousMonthCasesRecieved, CurrentMonthCasesRecieved, TotalCasesRecieved, PreviousMonthCasesResolved, CurrentMonthCasesResolved, TotalCasesResolved, CasesWithFir, MedicalAssistance, ShelterHomeAssistance, DIRAssistance, Other, PromotionalActivitiesNumber, NumberOfMeetingsOfDistrictMahilaSamadhanSamiti, Comments ], (err, data) => {
        if (err) {
            console.error("Database error:", err);            
            return res.status(500).json(responseHandler("Failure", 500, "Database error"));
        }
        return res.status(200).json(responseHandler("Success", 200, "MPR added successfully", { blockId: data.insertId }));
        // return res.status(201).json({ message: "MPR added successfully", blockId: data.insertId });
    });  
});


//Token API
app.get('/getUserToken', (req, res) => {
    const { userId } = req.body;
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        if (data.length === 0) {            
            return res.status(404).json(responseHandler("not found", 404, "User not found"));
        }

        jwt.sign({userId},UserSecretKey,{expiresIn:'432000s'},(err,token)=>{
            if(err){
                res.json(err)
            }
            else{
                res.status(200).json(responseHandler("Success", 200, "Token Generated Succesfully", {token}));
                // res.json({
                //     token
                // })
            }
        })
    });
});

function VerifyUserToken(req,res,next ){
    const bearerHeader = req.headers['userauthtoken']
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(' ')
        const token = bearer[1]
        req.token = token
        next()
    }
    else{
        res.status(403).json(responseHandler("Forbidden", 403, "Invalid Token"));
    }
}


//OTP API
app.post('/login', (req, res) => {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Phone number is required"));
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP expires in 5 minutes

    // Store OTP in MySQL
    const query = `
        INSERT INTO otp_table
        (phone_number, otp, expires_at)
        VALUES (?, ?, ?)
    `;

    db.query(query, [phoneNumber, otp, expiresAt], (err, result) => {
        if (err) {
            console.error('Error saving OTP:', err);
            return res.status(500).json(responseHandler("Failure", 500, "Failed to save OTP", null));
        }

        // Mock sending OTP (replace with an actual SMS service)
        console.log(`Sending OTP ${otp} to ${phoneNumber}`);

        res.status(200).json(responseHandler("Success", 200, "OTP sent successfully", {
            phoneNumber
        }));
    });
});


const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
};

app.post('/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Phone number and OTP are required", null));
    }

    // Query to verify OTP
    const verifyOtpQuery = `
        SELECT * FROM otp_table
        WHERE phone_number = ? AND otp = ? AND expires_at > NOW()
    `;

    db.query(verifyOtpQuery, [phoneNumber, otp], (err, otpResults) => {
        if (err) {
            console.error('Error verifying OTP:', err);
            return res.status(500).json(responseHandler("Failure", 500, "Failed to verify OTP", null));
        }

        if (otpResults.length === 0) {
            return res.status(400).json(responseHandler("Failure", 400, "Invalid or expired OTP", null));
        }

        // Query to check if user exists
        const getUserQuery = `
            SELECT id AS userId, fullname AS userName, is_worker AS isWorker
            FROM users
            WHERE phone = ?
        `;

        db.query(getUserQuery, [phoneNumber], (err, userResults) => {
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
                isExistingUser: true,
                userName: user.userName,
                userId: user.userId,
                isWorker: user.isWorker // Convert to boolean
            }));
        });
    });
});


const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
    console.log(`Server started and listening on port ${PORT}`);
});
