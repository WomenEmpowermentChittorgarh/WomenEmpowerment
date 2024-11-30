const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');

const router = express.Router();

router.get('/all', (req, res) => {
    const sql = 'SELECT * FROM monthly_progress_report';
    db.query(sql, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "MPRs Fetched Successfully", { data }));
    });
});

router.get('/byUserId', VerifyUserToken, (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json(responseHandler("Bad Request", 400, "User ID is required"));
    }

    const sql = 'SELECT * FROM monthly_progress_report WHERE createdBy = ?';
    db.query(sql, [userId], (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "MPR Fetched Successfully", { data }));
    });
});

router.post('/save', VerifyUserToken, (req, res) => {
    const {
        start_month, end_month, start_year, end_year, block,
        previous_month_cases_recieved, current_month_cases_recieved, total_cases_recieved,
        previous_month_cases_resolved, current_month_cases_resolved, total_cases_resolved,
        cases_with_fir, medical_assistance, shelter_home_assistance, dir_assistance,
        other, promotional_activities_number, number_of_meetings_of_district_mahila_samadhan_samiti,
        comments, created_by, updated_by, created_at, updated_at
    } = req.body;

    if (!start_month || !end_month || !start_year || !end_year || !block || !created_by || !updated_by || !created_at || !updated_at) {
        return res.status(400).json(responseHandler("Bad Request", 400, "All fields are required"));
    }

    const sql = `
        INSERT INTO monthly_progress_report 
        (StartMonth, EndMonth, StartYear, EndYear, Block, PreviousMonthCasesRecieved, 
        CurrentMonthCasesRecieved, TotalCasesRecieved, PreviousMonthCasesResolved, 
        CurrentMonthCasesResolved, TotalCasesResolved, CasesWithFir, MedicalAssistance, 
        ShelterHomeAssistance, DIRAssistance, Other, PromotionalActivitiesNumber, 
        NumberOfMeetingsOfDistrictMahilaSamadhanSamiti, Comment, createdBy, createdAt, updatedBy, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        start_month, end_month, start_year, end_year, block,
        previous_month_cases_recieved, current_month_cases_recieved, total_cases_recieved,
        previous_month_cases_resolved, current_month_cases_resolved, total_cases_resolved,
        cases_with_fir, medical_assistance, shelter_home_assistance, dir_assistance,
        other, promotional_activities_number, number_of_meetings_of_district_mahila_samadhan_samiti,
        comments, created_by, created_at, updated_by, updated_at
    ];

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
        res.status(200).json(responseHandler("Success", 200, "MPR added successfully", { id: result.insertId }));
    });
});

module.exports = router;
