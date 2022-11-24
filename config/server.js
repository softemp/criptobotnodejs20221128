require('dotenv').config()
var express = require('express');
var consign = require('consign');
var bodyParser = require('body-parser');

/* importar o módulo do express-validator */
// const { body, validationResult } = require('express-validator');

var app = express();
app.set('view engine', 'ejs');
app.set('views', './app/views');
app.use(express.static('./app/public'));
app.use(bodyParser.urlencoded({extended: true}));

/* configurar o middleware express-validator */
// app.use(validationResult());
consign()
	.include('app/routes')
	.then('app/models')
	.then('app/controllers')
	.into(app);

/* exportar o objeto app */
module.exports = app;