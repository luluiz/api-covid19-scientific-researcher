const Mongoose = require('mongoose');

const updateSchema = new Mongoose.Schema({
    pathfile: { type: String },
    qty_articles: { type: Number },
    authors: [{ type: String }],
    journals: [{ type: String }],
    tags: [{ type: String }],
    created: { type: Date, default: Date.now },
    updated: { type: Date, default: Date.now },
});

module.exports = Mongoose.model('Update', updateSchema);