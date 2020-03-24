const Multer = require('multer');

let storage = Multer.diskStorage({
    destination: function (req, file, cb) { cb(null, './uploads') },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.')[file.originalname.split('.').length - 1];
        cb(null, file.fieldname + '-' + Date.now() + '.' + ext);
    }
});

module.exports.uploadFile = Multer({ storage: storage }).single('file');
module.exports.uploadFiles = Multer({ storage: storage }).array('files', 30);