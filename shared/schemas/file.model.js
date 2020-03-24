const Mongoose = require('mongoose');

const fileSchema = new Mongoose.Schema({
    originalname: String,
    filename: String,
    destination: String,
    size: Number,
    path: String,
})

module.exports = {
    schema: fileSchema,
    model: Mongoose.model('File', fileSchema)
}

