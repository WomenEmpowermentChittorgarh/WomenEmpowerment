const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const writeXlsxFile = require('write-excel-file');

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

router.get('/fetchMonthlyReportByUserId', VerifyUserToken, (req, res) => {
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

router.post('/save-progress-report', VerifyUserToken, (req, res) => {
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

// router.get('/downloadMonthlyReport', VerifyUserToken, async (req, res) => {
    router.get('/downloadMonthlyReport', async (req, res) => {
    const sql = 'SELECT * FROM monthly_progress_report';

    db.query(sql, async (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        try {
            // Get dynamic start month, end month, start year, and end year
            const startMonth = req.query.startMonth || 'January';
            const endMonth = req.query.endMonth || 'March';
            const startYear = req.query.startYear || '2024';
            const endYear = req.query.endYear || '2025';

            // Static Rows (1st to 6th rows)
            const staticRows = [
                [{ value: 'कार्यालय महिला अधिकारिता, चित्तौड़गढ़' }],    // Row 1
                [{ value: 'महिला सुरक्षा एवं सलाह केन्द्र' }],            // Row 2
                [{ value: 'मासिक प्रगति रिपोर्ट' }],                      // Row 3
                [{ value: `रिपोटिंग माह ${startMonth}-${endMonth} तक (वित्तीय वर्ष ${startYear}-${endYear})` }], // Row 4
                [{ value: '' }],                                           // Row 5 (Placeholder)
                [{ value: '' }]                                            // Row 6 (Placeholder)
            ];

            // Map database results to rows (7th to 15th rows)
            const dynamicData = data.map(report => ([
                { value: report.block_name },
                { value: report.PreviousMonthCasesRecieved },
                { value: report.CurrentMonthCasesRecieved },
                { value: report.TotalCasesRecieved },
                { value: report.PreviousMonthCasesResolved },
                { value: report.CurrentMonthCasesResolved },
                { value: report.TotalCasesResolved },
                { value: report.CasesWithFir },
                { value: report.MedicalAssistance },
                { value: report.ShelterHomeAssistance },
                { value: report.DIRAssistance },
                { value: report.Other },
                { value: report.PromotionalActivitiesNumber },
                { value: report.NumberOfMeetingsOfDistrictMahilaSamadhanSamiti },
                { value: report.Comment },
                { value: report.createdBy },
                { value: new Date(report.createdAt).toISOString() },
                { value: new Date(report.updatedAt).toISOString() },
                { value: report.updatedBy },
                { value: report.createdByName },
                { value: report.updatedByName }
            ]));

            // Combine static rows and dynamic data
            const excelData = [...staticRows, ...dynamicData];

            // Generate the Excel file
            const filePath = path.join(__dirname, 'monthly_progress_report.xlsx');
            await writeXlsxFile(excelData, { filePath });

            // Send the generated file for download
            res.download(filePath);
        } catch (error) {
            console.error(error);
            res.status(500).json(responseHandler("Failure", 500, "Error generating report"));
        }
    });
});

module.exports = router;
