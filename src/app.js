require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const { NODE_ENV } = require('../config');
const winston = require('winston');
const { v4: uuid } = require('uuid');
const app = express();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'info.log' })
  ]
});

if (NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const morganOption = (NODE_ENV === 'production') ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use(function validateBearerToken(req, res, next) {
  const apiToken = process.env.API_TOKEN;
  const authToken = req.get('Authorization');

  if (!authToken || authToken.split(' ')[1] !== apiToken) {
    logger.error(`Unauthorized request to path: ${req.path}`);
    return res.status(401).json({ error: 'Unauthorized request'});
  }
  next();
});


app.use(function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === 'production') {
    response = { error: { message: 'server error' } };
  } else {
    console.error(error);
    response = { message: error.message, error };
  }
  res.status(500).json(response);
});

app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.get('/bookmarks', (req, res) => {
  res
    .json(store);
});
app.get('/bookmarks/:id', (req, res) => {
  const {id} = req.params;
  const bookmark = store.find(b => b.id == id);

  if (!bookmark) {
    logger.error(`Bookmark with id ${id} not found.`);
    return res
      .status(404)
      .send('Bookmark Not Found');
  }
  res.json(bookmark);
});

app.post('/bookmarks', (req, res) => {
  const { title, URL, rating} = req.body;
  if (!title) {
    logger.error('Title is required');
    return res
      .status(400)
      .send('Invalid data');
  }
  
  if (!URL) {
    logger.error('URL is required');
    return res
      .status(400)
      .send('Invalid data');
  }
  const id = uuid();
  const bookmark = {
    id,
    title, 
    URL,
    rating 
  };
  store.push(bookmark);

  logger.info(`Bookmark with id ${id} created`);

  res
    .status(201)
    .location(`http://localhost:8000/bookmarks/${id}`)
    .json(bookmark);

});

app.delete('/bookmarks/:id', (req, res) => {
  const { id } = req.params;

  const storeIndex = store.findIndex(b => b.id == id);

  if (storeIndex === -1) {
    logger.error(`List with id ${id} not found.`);
    return res
      .status(404)
      .send('Not Found');
  }

  store.splice(storeIndex, 1);

  logger.info(`bookmark with id ${id} deleted.`);
  res
    .status(204)
    .end();
});

const store = [{
  id: 1,
  title: 'Google',
  URL: 'www.google.com',
  rating: 4
},
{
  id: 2,
  title: 'Facebook',
  URL: 'www.facebook.com',
  rating: 3
},
{
  id: 3,
  title: 'Pinterest',
  URL: 'www.pinterest.com',
  rating: 2
}];

module.exports = app;
