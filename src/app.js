const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');

const middlewares = require('./middlewares/index').middleware;
const api = require('./api');

const app = express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.redirect('/api/v1')
});

app.use('/api/v1', api);
app.use('/api/v1/animeflv-docs' , express.static('./animeflv-docs'))

app.use(middlewares);

module.exports = app;
