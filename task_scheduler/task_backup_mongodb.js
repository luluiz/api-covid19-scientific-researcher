var FS = require('fs');
var _ = require('lodash');
var Exec = require('child_process').exec;
const Moment = require('moment-timezone');

let dbOptions = {
    user: null,
    pass: null,
    host: 'localhost',
    port: 27017,
    database: 'db_hubbi',
    auto_backup: true,
    delete_backup_antigo: true,
    dias_manter_backup: 10,
    path: '/var/www/mongo_backup/'
    // path: 'C:/Users/luiz1/Documents/mongo_backup/'
};

/**
 * Script de backup automático.
 */
module.exports.dbAutoBackUp = function () {
    if (dbOptions.auto_backup) {
        let hoje = Moment().format('DD-MM-YYYY');
        let path_backup = dbOptions.path + 'mongodump-' + hoje;
        let path_backup_antigo;

        // Deleta backup antigo de acordo com a quantidade de dias limite para manter os backups antigos.
        if (dbOptions.delete_backup_antigo) {
            let data_delete = Moment().subtract(dbOptions.dias_manter_backup, 'days').format('DD-MM-YYYY');
            path_backup_antigo = dbOptions.path + 'mongodump-' + data_delete; // old backup(after keeping # of days)
        }

        let cmd = getCmd(path_backup);
        Exec(cmd, function (error, stdout, stderr) {
            if (empty(error) && dbOptions.delete_backup_antigo && FS.existsSync(path_backup_antigo))
                Exec("rm -rf " + path_backup_antigo, function (err) { });
        });
    }
}

/**
 * Verifica se a variável é nula.
 * @param {any} mixedVar
 */
function empty(mixedVar) {
    let undef, key, i, len;
    let emptyValues = [undef, null, false, 0, '', '0'];
    for (i = 0, len = emptyValues.length; i < len; i++) {
        if (mixedVar === emptyValues[i]) {
            return true;
        }
    }
    if (typeof mixedVar === 'object') {
        for (key in mixedVar) {
            return false;
        }
        return true;
    }
    return false;
};

/**
 * Retorna o comando mongodump que faz o backup do MongoDB.
 * @param {string} path_backup Caminho para salvar o backup.
 */
function getCmd(path_backup) {
    let cmd = 'mongodump';
    if (dbOptions.host) cmd = cmd + ' --host ' + dbOptions.host;
    if (dbOptions.port) cmd = cmd + ' --port ' + dbOptions.port;
    if (dbOptions.user) cmd = cmd + ' --username ' + dbOptions.user;
    if (dbOptions.pass) cmd = cmd + ' --password ' + dbOptions.pass;
    if (dbOptions.database) cmd = cmd + ' --db ' + dbOptions.database;

    // console.log('CMD: ', cmd + ' --out ' + path_backup);
    return cmd + ' --out ' + path_backup;
}