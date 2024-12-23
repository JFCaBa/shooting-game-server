const express = require('express');
const router = express.Router();
const geoObjectController = require('../controllers/geoObjectController');
const serviceAuthMiddleware = require('../middleware/serviceAuthMiddleware');


// Protected route for adding a geo object
router.post('/geo-objects/assign', serviceAuthMiddleware, geoObjectController.addGeoObject);

module.exports = router;