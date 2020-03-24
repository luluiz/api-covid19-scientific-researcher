const Multer = require('multer');
const Moment = require('moment-timezone');
Moment.locale('pt-br');
const Mongoose = require('mongoose');
const _ = require('lodash');
const ObjectId = Mongoose.Types.ObjectId;
const Article = Mongoose.model('Article');
const Update = Mongoose.model('Update');
const Utils = require('../../shared/utils.service');
const UploadService = require('../../shared/upload-file.service');
const csv = require('csvtojson');

module.exports.import = function (req, res) {
    UploadService.uploadFile(req, res, async function (erro) {
        // console.log('file', req.file);
        if (erro instanceof Multer.MulterError) console.error(erro);
        else if (erro) console.error(erro);
        else {
            // let file = req.file;
            // let filePath = './uploads/CSV as at 23 March 2020-Full database.csv';
            let filePath = './uploads/' + req.file.filename;

            let articlesJson = await csv().fromFile(filePath);
            let articles = [];
            let authors = [];
            let journals = [];
            let tags = [];
            articlesJson.forEach(it => {
                let doi = getDOI(it['DOI']);
                let tags_array = getTagsArray(it['Tags']);
                let authors_array = getAuthorsArray(it['Authors']);

                authors = _.concat(authors, authors_array);
                tags = _.concat(tags, tags_array);
                journals.push(it['Journal']);

                if (doi) {
                    let article = new Article(it);
                    article._id = ObjectId();
                    article.title = it['Title'];
                    article.authors = it['Authors'];
                    article.authors_array = authors_array;
                    article.abstract = it['Abstract'];
                    article.published_year = it['Published Year'];
                    article.published_month = it['published Month'];
                    article.journal = it['Journal'];
                    article.volume = it['Volume'];
                    article.issue = it['Issue'];
                    article.pages = it['Pages'];
                    article.accession = it['Accession Number'];
                    article.doi = doi;
                    article.ref = it['Ref'];
                    article.covidence = it['Covidence #'];
                    article.study = it['Study'];
                    article.notes = it['Notes'];
                    article.tags = it['Tags'];
                    article.tags_array = tags_array;
                    articles.push(article);
                }
            });

            await Article.deleteMany();
            Article.insertMany(articles)
                .then(async _articles => {
                    await createOrRefreshUpdate(req.file, articles, authors, journals, tags);
                    res.json({ success: true, message: 'Articles imported successfully.', articles: _articles });
                })
                .catch(e => {
                    res.json({ success: false, message: 'Error importing file.' });
                });
        }
    });
}

/**
 * Create or update the Upload document. Also order and distinct the arrays of authors, journals and tags.
 * @param {File} file database file
 * @param {Array} articles array of articles
 * @param {Array} authors array of authors
 * @param {Array} journals array of journals
 * @param {Array} tags array of journals
 */
async function createOrRefreshUpdate(file, articles, authors, journals, tags) {
    let new_update = {
        pathfile: file.path,
        qty_articles: articles.length,
        authors: _.orderBy([... new Set(authors)]),
        journals: _.orderBy([... new Set(journals)]),
        tags: _.orderBy([... new Set(tags)]),
    };

    return await Update.findOneAndUpdate('', new_update, { upsert: true, new: true });
}

/**
 * return an array with tags.
 * @param {string} tags 
 */
function getTagsArray(tags) {
    let tagsArray = [];

    let split = tags.split('*');
    for (let i = 1; i < split.length; i++) {
        var it = split[i];
        if (i == 1) {
            var _tags = it.trim().split(',');
            for (let j = 0; j < _tags.length; j++) {
                var it2 = _tags[j];
                if (j == 0) {
                    it2 = it2.trim();
                    if (it2.includes(';')) {
                        var _tags_ = it2.split(';');
                        for (let k = 0; k < _tags_.length; k++) {
                            var it3 = _tags_[k];
                            tagsArray.push(it3.toUpperCase().trim());
                        }
                    } else
                        tagsArray.push(it2.toUpperCase().replace('Opinion piece;', '').trim());
                } else {
                    it2 = it2.trim();
                    if (it2.includes(';')) {
                        var _tags_ = it2.split(';');
                        for (let k = 0; k < _tags_.length; k++) {
                            var it3 = _tags_[k];
                            tagsArray.push(it3.toUpperCase().trim());
                        }
                    } else
                        tagsArray.push(it2.toUpperCase());
                }
            }
        } else {
            var _tags = it.trim().split(',');
            for (let j = 0; j < _tags.length; j++) {
                var it2 = _tags[j];
                if (j == 0) {
                    it2 = it2.trim();
                    if (it2.includes(';')) {
                        var _tags_ = it2.split(';');
                        for (let k = 0; k < _tags_.length; k++) {
                            var it3 = _tags_[k];
                            tagsArray.push(it3.toUpperCase().trim());
                        }
                    } else tagsArray.push(it2.toUpperCase().replace('Opinion piece;', '').trim());
                }
                else {
                    it2 = it2.trim();
                    if (it2.includes(';')) {
                        var _tags_ = it2.split(';');
                        for (let k = 0; k < _tags_.length; k++) {
                            var it3 = _tags_[k];
                            tagsArray.push(it3.toUpperCase().trim());
                        }
                    } else tagsArray.push(it2.toUpperCase());
                }
            }
        }
    }
    return tagsArray;
}

/**
 * return an array with authors.
 * @param {string} authors 
 */
function getAuthorsArray(authors) {
    let authorsArray = [];

    let split = authors.trim().split(';');
    for (let i = 0; i < split.length; i++)
        authorsArray.push(split[i]);

    return authorsArray;
}

/**
 * return doi
 * @param {string} doi 
 */
function getDOI(doi) {
    if (doi.startsWith('https://doi.org/')) return doi.replace('https://doi.org/', '');
    else if (doi.startsWith('doi:https://doi.org/')) return doi.replace('doi:https://doi.org/', '');
    else return doi;
}

module.exports.get = function (req, res) {
    let query = filterQuery(req.query);

    Article.find(query)
        .sort(getSort(req.query.sort, req.query.direction))
        .limit(Number(req.query.limit))
        .skip(Number(req.query.skip))
        .then(async articles => {
            let length = await Article.countDocuments(query);
            Utils.res(res, true, '', null, { articles: articles, length: length });
        })
        .catch(e => {
            Utils.res(res, false, 'Error querying articles', e);
        });
}

module.exports.count = function (req, res) {
    let query = filterQuery(req.query);
    Article.countDocuments(query)
        .then(count => Utils.res(res, true, '', null, { count: count }))
        .catch(count => Utils.res(res, false, 'Error counting articles', e))
}

function filterQuery(_query) {
    let query = {};
    // { $regex: req.query.ano_fab, $options: '-i' };
    if (_query && _query._id) query._id = ObjectId(_query._id);
    if (_query && _query.title) query.title = { $regex: _query.title, $options: '-i' };
    if (_query && _query.authors) query.authors = { $regex: _query.authors, $options: '-i' };
    // if (_query && _query.authors) query.authors_array = { $in: [_query.authors] };
    if (_query && _query.abstract) query.abstract = { $regex: _query.abstract, $options: '-i' };
    // if (_query && _query.published_year) query.published_year = Number(_query.published_year);
    // if (_query && _query.published_month) query.published_month = Number(_query.published_month);
    if (_query && _query.journal) query.journal = { $regex: _query.journal, $options: '-i' };
    if (_query && _query.volume) query.volume = { $regex: _query.volume, $options: '-i' };
    if (_query && _query.issue) query.issue = { $regex: _query.issue, $options: '-i' };
    if (_query && _query.pages) query.pages = { $regex: _query.pages, $options: '-i' };
    if (_query && _query.accession) query.accession = { $regex: _query.accession, $options: '-i' };
    if (_query && _query.doi) query.doi = { $regex: _query.doi, $options: '-i' };
    if (_query && _query.ref) query.ref = { $regex: _query.ref, $options: '-i' };
    if (_query && _query.covidence) query.covidence = { $regex: _query.covidence, $options: '-i' };
    if (_query && _query.study) query.study = { $regex: _query.study, $options: '-i' };
    if (_query && _query.notes) query.notes = { $regex: _query.notes, $options: '-i' };
    // if (_query && _query.tags) query.tags = { $regex: _query.tags, $options: '-i' };
    if (_query && _query.tags_array) query.tags_array = { $in: _query.tags_array };
    if (_query && _query.created_from && _query.created_to)
        query.created = {
            $gte: Moment(new Date(_query.created_from)).startOf('day').toDate(),
            $lte: Moment(new Date(_query.created_to)).endOf('day').toDate()
        }

    // console.log(query)
    return query;
}

function getSort(active, direction) {
    if (direction == 'asc') return { [active]: 1 };
    else if (direction == 'desc') return { [active]: -1 };
    else return null;
}