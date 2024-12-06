const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');
const ExcelJS = require('exceljs');
const path = require('path');

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

router.get('/downloadMonthlyReport', VerifyUserToken, async (req, res) => {
    const sql = 'SELECT * FROM monthly_progress_report';
    
    db.query(sql, async (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }

        try {
             // Ensure the 'downloads' directory exists
             const downloadDir = path.join(__dirname, "../downloads");
             if (!fs.existsSync(downloadDir)) {
                 fs.mkdirSync(downloadDir, { recursive: true }); // Create the directory if it doesn't exist
             }
            // Create a new workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Monthly Progress Report');

            // Define headers
            worksheet.columns = [
                { header: "Start Month", key: "StartMonth", width: 20 },
                { header: "End Month", key: "EndMonth", width: 20 },
                { header: "Start Year", key: "StartYear", width: 15 },
                { header: "End Year", key: "EndYear", width: 15 },
                { header: "Block", key: "Block", width: 10 },
                { header: "Previous Month Cases Received", key: "PreviousMonthCasesRecieved", width: 30 },
                { header: "Current Month Cases Received", key: "CurrentMonthCasesRecieved", width: 30 },
                { header: "Total Cases Received", key: "TotalCasesRecieved", width: 25 },
                { header: "Previous Month Cases Resolved", key: "PreviousMonthCasesResolved", width: 30 },
                { header: "Current Month Cases Resolved", key: "CurrentMonthCasesResolved", width: 30 },
                { header: "Total Cases Resolved", key: "TotalCasesResolved", width: 25 },
                { header: "Cases with FIR", key: "CasesWithFir", width: 15 },
                { header: "Medical Assistance", key: "MedicalAssistance", width: 20 },
                { header: "Shelter Home Assistance", key: "ShelterHomeAssistance", width: 25 },
                { header: "DIR Assistance", key: "DIRAssistance", width: 15 },
                { header: "Other", key: "Other", width: 20 },
                { header: "Promotional Activities Number", key: "PromotionalActivitiesNumber", width: 30 },
                { header: "Number of Meetings of District Mahila Samadhan Samiti", key: "NumberOfMeetingsOfDistrictMahilaSamadhanSamiti", width: 50 },
                { header: "Comment", key: "Comment", width: 30 },
                { header: "Created By", key: "createdByName", width: 25 },
                { header: "Updated By", key: "updatedByName", width: 25 },
                { header: "Block Name", key: "block_name", width: 25 },
            ];

            // Add rows to worksheet
            worksheet.addRows(data);

            // Write to file
            const outputPath = path.join(__dirname, "../downloads/Monthly_Progress_Report.xlsx");
            await workbook.xlsx.writeFile(outputPath);

            // Send the file as a response for download
            res.download(outputPath, "Monthly_Progress_Report.xlsx", (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json(responseHandler("Failure", 500, "Error in downloading file"));
                }
            });
        } catch (err) {
            console.error(err);
            // return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
    });
});

module.exports = router;
