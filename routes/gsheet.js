const express = require('express')
const router = express.Router()

router.route('/sheet/:id')
    .get((req, res) => {
        validateID(req.params.spreadsheetId);
        res.send('data' + req.params.username)
    })
    .post((req, res) => {
        processData(req.params.range);
        res.send('data updated')
    })

module.exports = router;