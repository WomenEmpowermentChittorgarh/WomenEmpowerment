const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');

const router = express.Router();

router.get('/all', VerifyUserToken, (req, res) => {
    const sql = 'SELECT * FROM sathin_mpr';
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Database error during fetch"));
        }
        res.status(200).json(responseHandler("Success", 200, "Data fetched successfully", results));
    });
});

router.post('/save-sathin_mpr', VerifyUserToken, (req, res) => {
    const {
        formid, block, total_approved_sathin, total_working_sathin, general, scsp, tsp,
        vacant_post, monthly_payment, newly_selected_sathin, newly_selected_sathin_basic_training,
        newly_selected_sathin_no_training, specific_description, createdBy, createdAt, updatedAt,
        updatedBy, month, year
    } = req.body;

    if (!block || !total_approved_sathin || !total_working_sathin || !general || !scsp || !tsp ||
        !vacant_post || !monthly_payment || !createdBy || !createdAt || !updatedAt || !updatedBy || !month || !year) {
        return res.status(400).json(responseHandler("Bad Request", 400, "All fields are required"));
    }

    if (formid) {
        const updateSql = `
            UPDATE sathin_mpr
            SET block = ?, total_approved_sathin = ?, total_working_sathin = ?, general = ?, scsp = ?, tsp = ?, 
                vacant_post = ?, monthly_payment = ?, newly_selected_sathin = ?, 
                newly_selected_sathin_basic_training = ?, newly_selected_sathin_no_training = ?, 
                specific_description = ?, updatedAt = ?, updatedBy = ?, month = ?, year = ?
            WHERE id = ?
        `;

        const updateValues = [
            block, total_approved_sathin, total_working_sathin, general, scsp, tsp, vacant_post,
            monthly_payment, newly_selected_sathin, newly_selected_sathin_basic_training,
            newly_selected_sathin_no_training, specific_description, updatedAt, updatedBy, month, year, formid
        ];

        db.query(updateSql, updateValues, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json(responseHandler("Failure", 500, "Database error during update"));
            }
            res.status(200).json(responseHandler("Success", 200, "Data updated successfully"));
        });
    } else {
        const insertSql = `
            INSERT INTO sathin_mpr (block, total_approved_sathin, total_working_sathin, general, scsp, tsp, vacant_post, 
                monthly_payment, newly_selected_sathin, newly_selected_sathin_basic_training, 
                newly_selected_sathin_no_training, specific_description, createdBy, createdAt, 
                updatedAt, updatedBy, month, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertValues = [
            block, total_approved_sathin, total_working_sathin, general, scsp, tsp, vacant_post,
            monthly_payment, newly_selected_sathin, newly_selected_sathin_basic_training,
            newly_selected_sathin_no_training, specific_description, createdBy, createdAt, updatedAt, updatedBy, month, year
        ];

        db.query(insertSql, insertValues, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json(responseHandler("Failure", 500, "Database error during insert"));
            }
            res.status(201).json(responseHandler("Success", 201, "Data inserted successfully", { id: result.insertId }));
        });
    }
});

router.get('/', VerifyUserToken, (req, res) => {
    const { StartMonth, EndMonth, StartYear, EndYear } = req.query;

    if (!StartMonth || !EndMonth || !StartYear || !EndYear) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Missing required query parameters"));
    }

    const sql = `
        SELECT * FROM sathin_mpr
        WHERE month BETWEEN ? AND ? AND year BETWEEN ? AND ?
    `;

    db.query(sql, [StartMonth, EndMonth, StartYear, EndYear], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Database error during fetch"));
        }
        if (results.length === 0) {
            return res.status(404).json(responseHandler("Not Found", 404, "No records found for the provided parameters"));
        }
        res.status(200).json(responseHandler("Success", 200, "Data fetched successfully", results));
    });
});

router.get('/fetchSathinReportByUserId', VerifyUserToken, (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json(responseHandler("Bad Request", 400, "User ID is required"));
    }

    const sql = 'SELECT * FROM sathin_mpr WHERE createdBy = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "Sathin MPR Fetched Successfully", { data }));
    });
});

module.exports = router;
