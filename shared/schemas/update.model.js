const Mongoose = require('mongoose');
const File = require('./file.model');

const updateSchema = new Mongoose.Schema({
    file: File.schema,
    qty_articles: { type: Number },
    created: [{ type: Date, default: Date.now }],
    updated: [{ type: Date, default: Date.now }],
});

module.exports = Mongoose.model('Update', updateSchema);