const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const writeXlsxFile = require('write-excel-file')

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

    const { start_month, end_month, start_year, end_year, userId } = req.query;

    const sql = 'SELECT * FROM monthly_progress_report WHERE StartMonth =? AND EndMonth=? AND StartYear=? AND EndYear=? AND createdBy=?';

    const values = [
        start_month, end_month, start_year, end_year, userId
    ]

    db.query(sql, values, async (err, data) => {
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

            const row = worksheet.addRow(['कार्यालय महिला अधिकारिता, चित्तौड़गढ़']);
            worksheet.mergeCells(row.number, 1, row.number, 15);
            const mergedCell = worksheet.getCell(row.number, 1); // Get the first cell of the merged range
            mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };
            mergedCell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            const row2 = worksheet.addRow(['महिला सुरक्षा एवं सलाह केन्द्र']);
            worksheet.mergeCells(row2.number, 1, row2.number, 15);
            const mergedCell2 = worksheet.getCell(row2.number, 1); // Get the first cell of the merged range
            mergedCell2.alignment = { horizontal: 'center', vertical: 'middle' };
            mergedCell2.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            const row3 = worksheet.addRow(['मासिक प्रगति रिपोर्ट']);
            worksheet.mergeCells(row3.number, 1, row3.number, 15);
            const mergedCell3 = worksheet.getCell(row3.number, 1); // Get the first cell of the merged range
            mergedCell3.alignment = { horizontal: 'center', vertical: 'middle' };
            mergedCell3.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            const row4 = worksheet.addRow([`रिपोटिंग माह ${data[0].StartMonth}-${data[0].EndMonth} तक ( वित्तीय वर्ष ${data[0].StartYear}-${data[0].EndYear})`]);
            worksheet.mergeCells(row4.number, 1, row4.number, 15);
            const mergedCell4 = worksheet.getCell(row4.number, 1); // Get the first cell of the merged range
            mergedCell4.alignment = { horizontal: 'center', vertical: 'middle' };
            mergedCell4.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            const row5 = worksheet.addRow([`जिला/ब्लॉक`,`पिछले माह (${data[0].StartMonth}-${data[0].EndMonth}) तक प्राप्त प्रकरण`,`इस माह ${data[0].EndMonth} में प्राप्त प्रकरण`,`कुल प्राप्त प्रकरण (1+2)`,`पिछले माह (${data[0].StartMonth}-${data[0].EndMonth}) तक निस्तारित प्रकरण`,`इस माह ${data[0].EndMonth} में निस्तारित प्रकरण`,`कुल निस्तारित प्रकरण (4+5)`,`प्रकरण जिसमें पुलिस मे FIR दर्ज करवाई गयी`,`मेडिकल मुआयना कराने में सहयोग`,`आश्रयगृह मे प्रवेश दिलाने में सहयोग`,`घरेलू घटना रिपोर्ट DIR बनाने और न्यायालय में प्रस्तुत करने में सहयोग`,`अन्य`,`प्रचार-प्रसार की गतिविधियों की संख्या`,`ज़िला महिला समाधान समिति की बैठकों की संख्या`,`टिप्पणी`]);
            row5.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
            for (let col = 1; col <= 15; col++) {
                const cell = worksheet.getCell(row5.number, col);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }

            data.map(item=>{
                const row = worksheet.addRow([item.block_name, item.PreviousMonthCasesRecieved, item.CurrentMonthCasesRecieved, item.TotalCasesRecieved,item.PreviousMonthCasesResolved,item.CurrentMonthCasesResolved,item.TotalCasesResolved,item.CasesWithFir,item.MedicalAssistance,item.ShelterHomeAssistance,item.DIRAssistance,item.Other,item.PromotionalActivitiesNumber,item.NumberOfMeetingsOfDistrictMahilaSamadhanSamiti,item.Comment]);
                row.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
                for (let col = 1; col <= 15; col++) {
                    const cell = worksheet.getCell(row.number, col);
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
            })
            // worksheet.addRow(['ID', 'Name', 'Age']);

            worksheet.getColumn(1).width = 10; // Adjust the width for column 2 as needed
            worksheet.getColumn(2).width = 10;
            worksheet.getColumn(3).width = 10;
            worksheet.getColumn(4).width = 10;
            worksheet.getColumn(5).width = 10;
            worksheet.getColumn(6).width = 10;
            worksheet.getColumn(7).width = 10;
            worksheet.getColumn(8).width = 10;
            worksheet.getColumn(9).width = 10;
            worksheet.getColumn(10).width = 10;
            worksheet.getColumn(11).width = 10;
            worksheet.getColumn(12).width = 10;
            worksheet.getColumn(13).width = 10;
            worksheet.getColumn(14).width = 10;
            worksheet.getColumn(15).width = 10;

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
            return res.status(500).json(responseHandler("Failure", 500, err));
        }
    });
});

module.exports = router;
