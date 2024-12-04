const express = require('express');
const router = express.Router();
const hallOfFameController = require('../controllers/hallOfFameController');

router.get('/halloffame/kills', hallOfFameController.getByKills);
router.get('/halloffame/hits', hallOfFameController.getByHits);

module.exports = router;