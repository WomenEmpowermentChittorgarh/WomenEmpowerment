const express = require('express');
const db = require('../db'); // Import the database connection
const responseHandler = require('../utils/responseHandler');

const router = express.Router();

router.get('/get-all-users', (req, res) => {
    // const { userId } = req.query;
    // if (!userId) {
    //     return res.status(400).json(responseHandler("Bad Request", 400, "User ID is required"));
    // }

    const sql = 'SELECT * FROM users';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        return res.status(200).json(responseHandler("Success", 200, "Users Fetched successfully", { data }));
    });
});

router.get('/:id', (req, res) => {
    const userId = req.params.id;
    const sql = 'SELECT * FROM users WHERE id = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        if (data.length === 0) {
            return res.status(404).json(responseHandler("Not Found", 404, "User not found"));
        }
        return res.status(200).json(responseHandler("Success", 200, "User Fetched successfully", { data: data[0] }));
    });
});

router.post('/user_details', (req, res) => {
    const { fullname, phone } = req.body;

    if (!fullname || !phone) {
        return res.status(400).json(responseHandler("Bad Request", 400, "All fields are required"));
    }

    const findUserSql = 'SELECT * FROM users WHERE mobile_number = ?';
    const updateUserSql = 'UPDATE users SET user_name = ? WHERE mobile_number = ?';
    const insertUserSql = 'INSERT INTO users (user_name, mobile_number, is_worker) VALUES (?, ?, 0)';

    db.query(findUserSql, [phone], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        if (results.length > 0) {
            const userId = results[0].id;
            db.query(updateUserSql, [fullname, phone], (updateErr) => {
                if (updateErr) {
                    console.error("Update error:", updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Failed to update user details"));
                }
                return res.status(200).json(responseHandler("Success", 200, "User updated successfully", { userId }));
            });
        } else {
            db.query(insertUserSql, [fullname, phone], (insertErr, data) => {
                if (insertErr) {
                    console.error("Insert error:", insertErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Failed to add new user"));
                }
                return res.status(200).json(responseHandler("Success", 200, "User added successfully", { userId: data.insertId }));
            });
        }
    });
});

router.post('/add-update-user', (req, res) => {
    const { fullname, phone, isWorker, admin_access } = req.body;

    if (!fullname || !phone) {
        return res.status(400).json(responseHandler("Bad Request", 400, "All fields are required"));
    }

    const findUserSql = 'SELECT * FROM users WHERE mobile_number = ?';
    const updateUserSql = 'UPDATE users SET user_name = ?, is_worker = ?, admin_access = ? WHERE mobile_number = ?';
    const insertUserSql = 'INSERT INTO users (user_name, mobile_number, is_worker, admin_access) VALUES (?, ?, ?, ?)';

    db.query(findUserSql, [phone], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        if (results.length > 0) {
            const userId = results[0].id;
            db.query(updateUserSql, [fullname, isWorker, admin_access, phone], (updateErr) => {
                if (updateErr) {
                    console.error("Update error:", updateErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Failed to update user details"));
                }
                return res.status(200).json(responseHandler("Success", 200, "User updated successfully", { userId }));
            });
        } else {
            db.query(insertUserSql, [fullname, phone, isWorker, admin_access], (insertErr, data) => {
                if (insertErr) {
                    console.error("Insert error:", insertErr);
                    return res.status(500).json(responseHandler("Failure", 500, "Failed to add new user"));
                }
                return res.status(200).json(responseHandler("Success", 200, "User added successfully", { userId: data.insertId }));
            });
        }
    });
});

module.exports = router;
