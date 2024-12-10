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
    
                // Define the schema for the dynamic data
const schema = [
    { column: 'Block Name', type: String },
    { column: 'Previous Month Cases Received', type: Number },
    { column: 'Current Month Cases Received', type: Number },
    { column: 'Total Cases Received', type: Number },
    { column: 'Previous Month Cases Resolved', type: Number },
    { column: 'Current Month Cases Resolved', type: Number },
    { column: 'Total Cases Resolved', type: Number },
    { column: 'Cases With FIR', type: Number },
    { column: 'Medical Assistance', type: Number },
    { column: 'Shelter Home Assistance', type: Number },
    { column: 'DIR Assistance', type: Number },
    { column: 'Other', type: Number },
    { column: 'Promotional Activities Number', type: Number },
    { column: 'Number of Meetings', type: Number },
    { column: 'Comment', type: String },
    { column: 'Created By', type: String },
    { column: 'Created At', type: Date },
    { column: 'Updated At', type: Date },
    { column: 'Updated By', type: String },
    { column: 'Created By Name', type: String },
    { column: 'Updated By Name', type: String }
];

// Map database results to match the schema
const dynamicData = data.map(report => [
    { value: report.block_name },
    { value: report.PreviousMonthCasesRecieved || 0 },
    { value: report.CurrentMonthCasesRecieved || 0 },
    { value: report.TotalCasesRecieved || 0 },
    { value: report.PreviousMonthCasesResolved || 0 },
    { value: report.CurrentMonthCasesResolved || 0 },
    { value: report.TotalCasesResolved || 0 },
    { value: report.CasesWithFir || 0 },
    { value: report.MedicalAssistance || 0 },
    { value: report.ShelterHomeAssistance || 0 },
    { value: report.DIRAssistance || 0 },
    { value: report.Other || 0 },
    { value: report.PromotionalActivitiesNumber || 0 },
    { value: report.NumberOfMeetingsOfDistrictMahilaSamadhanSamiti || 0 },
    { value: report.Comment || '' },
    { value: report.createdBy || '' },
    { value: new Date(report.createdAt) },
    { value: new Date(report.updatedAt) },
    { value: report.updatedBy || '' },
    { value: report.createdByName || '' },
    { value: report.updatedByName || '' }
]);
    
                // Combine static rows and dynamic data
                const excelData = [...staticRows, ...dynamicData];
    
                // File path for the generated Excel file
                const filePath = path.join(__dirname, 'monthly_progress_report.xlsx');

// Write the Excel file with the schema and data
await writeXlsxFile(dynamicData, {
    schema,
    filePath
});
    
                // Send the generated file for download
                res.download(filePath, 'monthly_progress_report.xlsx', (downloadErr) => {
                    if (downloadErr) {
                        console.error(downloadErr);
                        return res.status(500).json(responseHandler("Failure", 500, "Error sending the file"));
                    }
    
                    // Optionally delete the file after sending
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) {
                            console.error('Error deleting the file:', unlinkErr);
                        }
                    });
                });
    
            } catch (error) {
                console.error(error);
                res.status(500).json(responseHandler("Failure", 500, "Error generating report"));
            }
        });
    });
    

module.exports = router;
