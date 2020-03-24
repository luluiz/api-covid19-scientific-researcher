const _ = require('lodash');
const Mongoose = require('mongoose');
const ObjectId = Mongoose.Types.ObjectId;
const Update = Mongoose.model('Update');

module.exports.get = function (req, res) {
    Update.findOne()
        .then(update => {
            res.json({ success: true, message: '', update: update });
        })
        .catch(e => {
            res.json({ success: false, message: 'Error', error: e });
        });
}