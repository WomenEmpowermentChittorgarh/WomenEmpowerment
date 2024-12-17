const express = require('express');
const db = require('../db');
const VerifyUserToken = require('../middleware/VerifyUserToken');
const responseHandler = require('../utils/responseHandler');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

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

// router.get('/', VerifyUserToken, (req, res) => {
router.get('/', (req, res) => {
    const { Month, Year, userId } = req.query;

    if (!Month || !Year || !userId) {
        return res.status(400).json(responseHandler("Bad Request", 400, "Missing required query parameters"));
    }

    const sql = `
        SELECT * FROM sathin_mpr
        WHERE month=? AND year=? AND createdBy=?
    `;

    db.query(sql, [Month, Year, userId],async (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json(responseHandler("Failure", 500, "Database error during fetch"));
        }
        if (results.length === 0) {
            return res.status(404).json(responseHandler("Not Found", 404, "No records found for the provided parameters"));
        }
        // res.status(200).json(responseHandler("Success", 200, "Data fetched successfully", results));
        try {
            // Ensure the 'downloads' directory exists
            const downloadDir = path.join(__dirname, "../downloads");
            if (!fs.existsSync(downloadDir)) {
                fs.mkdirSync(downloadDir, { recursive: true }); // Create the directory if it doesn't exist
            }
            // Create a new workbook and worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sathin MPR');

            const row = worksheet.addRow(['प्रत्येक माह की 05 तारीख तक साथिन प्रकोष्ठ की ई-मेल आईडी पर प्रेषित की जाये।']);
            worksheet.mergeCells(row.number, 1, row.number, 12);
            const mergedCell = worksheet.getCell(row.number, 1); // Get the first cell of the merged range
            mergedCell.alignment = { horizontal: 'center', vertical: 'middle' };

            const row2 = worksheet.addRow([`जिले का नाम चित्तौड़गढ़ साथिन की भौतिक प्रगति वित्तीय वर्ष ${results[0].year} माह ${results[0].month}`]);
            worksheet.mergeCells(row2.number, 1, row2.number, 12);
            const mergedCell2 = worksheet.getCell(row2.number, 1); // Get the first cell of the merged range
            mergedCell2.alignment = { horizontal: 'center', vertical: 'middle' };
            mergedCell2.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };

            const row5 = worksheet.addRow([`क. सं.`,`स्वीकृत साथिनों की कुल संख्या`,`कुल कार्यरत साथिन`,`सामान्य`,`एस.सी.एस.पी`,`टी.एस.पी`,`रिक्त पद`,`मानदेय भुगतान का माह अन्सार`,`नवचयनित साथिनों की संख्या`,`आधारभूत प्रशिक्षण प्राप्त नवचयनित साथिनों की संख्या`,`आधारभूत प्रशिक्षण प्राप्त नहीं ww करने वाली नवचयनित साथिनों की संख्या`,`विशेष विवरण`]);
            row5.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
            for (let col = 1; col <= 12; col++) {
                const cell = worksheet.getCell(row5.number, col);
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            }
            let a =1

            results.map(item=>{
                const row = worksheet.addRow([ a, item.total_approved_sathin, item.total_working_sathin, item.general,item.scsp,item.tsp,item.vacant_post,item.monthly_payment,item.newly_selected_sathin,item.newly_selected_sathin_basic_training,item.newly_selected_sathin_no_training,item.specific_description]);
                row.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
                for (let col = 1; col <= 12; col++) {
                    const cell = worksheet.getCell(row.number, col);
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                }
                a++
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
            const outputPath = path.join(__dirname, "../downloads/Sathin_MPR.xlsx");
            await workbook.xlsx.writeFile(outputPath);

            // Send the file as a response for download
            res.download(outputPath, "Sathin_MPR.xlsx", (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json(responseHandler("Failure", 500, "Error in downloading file"));
                }
            });
        } catch (err) {
            console.log(err);
            
            return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
        }
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
