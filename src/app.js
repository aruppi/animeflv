const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const version = require('./../package.json').version;

const middlewares = require('./middlewares/index').middleware;
const api = require('./api');

const app = express();

app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.redirect('/api/')
});
app.get('/api/', (req, res) => {
  // dont cache answer 'cause we can check upstream version
  res.set('Cache-Control', 'no-store');
  res.json({
    title: 'AnimeFLV API',
    version: version,
    source: 'https://github.com/aruppi/animeflv',
    description: 'This is a custom API that has the entire catalog of the animeflv.net website',
  });
});

app.use('/api/v1', api);
app.use('/api/v1/animeflv-docs' , express.static('./animeflv-docs'))

app.use(middlewares);

module.exports = app;
