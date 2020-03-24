require('./env-config');

const app = require('./app');

require('./server');
require('./database');
require('./routes')(app);
require('../modulos/updates/update.route')(app);
require('../modulos/articles/article.route')(app);

require('./loader_scheduler');