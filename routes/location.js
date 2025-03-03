const express = require('express');
const db = require('../db');
const responseHandler = require('../utils/responseHandler');
const VerifyUserToken = require('../middleware/VerifyUserToken');

const router = express.Router();

router.post('/post_location', VerifyUserToken, (req, res) => {
    const { name, address, number, latitude, longitude } = req.body;
        const sql = 'INSERT INTO location(name, address, number, latitude, longitude) VALUES (?, ?, ?, ?, ?)';
        db.query(sql, [name, address, number, latitude, longitude], (err, data) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
            }
            res.status(200).json(responseHandler("Success", 200, "Helpline Number Posted Successfully"));
        });
});

router.get('/get_location', VerifyUserToken, (req, res) => {
      const sql = 'SELECT * FROM location';
      db.query(sql, (err, data) => {
          if (err) {
              console.error("Database error:", err);
              return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
          }
          res.status(200).json(responseHandler("Success", 200, "Helpline Numbers Fetched Successfully", { data }));
      });
  });

module.exports = router;