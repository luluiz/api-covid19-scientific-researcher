const Mongoose = require('mongoose');
const uriLocal = `mongodb://${process.env.DB_HOST}/${process.env.DB_DATABASE}`;

module.exports = Mongoose.connect(uriLocal, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }, function (erro) {
    if (erro) console.error('Erro ao conectar com o DB: ' + erro);
    else console.log('Conectado ao DB: ' + uriLocal);
});