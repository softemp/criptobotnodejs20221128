var app = require('./config/server');
const EventEmitter = require('node:events');
const logger = require('./app/src/utils/logger');
class MyEmitter extends EventEmitter {}
const myEmitter = new MyEmitter();
myEmitter.setMaxListeners(0)

app.cache = new Object()
app.events = myEmitter

logger('system', 'Inicializando o Criptobot...');
const appServer = require('./app/src/app-server')
appServer(app)

app.listen(process.env.PORT, function(){
	console.log('Servidor online, porta:', process.env.PORT);
	logger('system', 'O servidor Node estão sendo executado na porta: ' + process.env.PORT);
})