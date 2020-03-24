const express = require('express');
const router = express.Router();
const Update = require('../../shared/schemas/update.model');
const UpdateService = require('./update.service');

module.exports = function (app) {
    app.use('/api', router);

    router.get('/update', UpdateService.get);

    return router;
};