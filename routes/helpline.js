const express = require('express');
const db = require('../db');
const responseHandler = require('../utils/responseHandler');
const VerifyUserToken = require('../middleware/VerifyUserToken');

const router = express.Router();

router.post('/post_helpline', VerifyUserToken, (req, res) => {
    const { name, number } = req.body;
        const sql = 'INSERT INTO helpline_numbers(name, number) VALUES (?, ?)';
        db.query(sql, [name, number], (err, data) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
            }
            res.status(200).json(responseHandler("Success", 200, "Helpline Number Posted Successfully", data));
        });
});

router.get('/get_helpline', VerifyUserToken, (req, res) => {
      const sql = 'SELECT * FROM helpline_numbers';
      db.query(sql, (err, data) => {
          if (err) {
              console.error("Database error:", err);
              return res.status(500).json(responseHandler("Failure", 500, "Internal Server Error"));
          }
          res.status(200).json(responseHandler("Success", 200, "Helpline Numbers Fetched Successfully", { data }));
      });
  });

  module.exports = router;