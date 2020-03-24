var CronJob = require('cron').CronJob;
var MongoBackup = require('./task_backup_mongodb');

// Backup do MongoDB: Diariamente as 03:00.
new CronJob('0 3 * * *', function () {
    MongoBackup.dbAutoBackUp();
}, null, true, 'Brazil/East');

// Atualiza Cotações de A_ORCAR para ORCADO: A cada 5 min.
// new CronJob('1 * * * *', function () {
//     TaskCotacoes.atualizaOrcados();
// }, null, true, 'Brazil/East');

