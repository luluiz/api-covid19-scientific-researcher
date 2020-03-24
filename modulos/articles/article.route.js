const express = require('express');
const router = express.Router();
const Article = require('../../shared/schemas/article.model');
const ArticleService = require('./article.service');

module.exports = function (app) {
    app.use('/api', router);

    router.post('/article/import', ArticleService.import);
    router.get('/article', ArticleService.get);
    router.get('/article/count', ArticleService.count);

    return router;
};