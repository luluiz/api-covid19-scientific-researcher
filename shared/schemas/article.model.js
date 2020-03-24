const Mongoose = require('mongoose');

const articleSchema = new Mongoose.Schema({
    title: { type: String },
    authors: { type: String },
    authors_array: [{ type: String }],
    abstract: { type: String },
    published_year: { type: Number },
    published_month: { type: Number },
    journal: { type: String },
    volume: { type: String },
    issue: { type: String },
    pages: { type: String },
    accession: { type: String },
    doi: { type: String },
    ref: { type: String },
    covidence: { type: String },
    study: { type: String },
    notes: { type: String },
    tags: { type: String },
    tags_array: [{ type: String }],
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
});

module.exports = Mongoose.model('Article', articleSchema);