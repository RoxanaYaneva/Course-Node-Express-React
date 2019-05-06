const express = require('express');
const path  = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

const router = require('./routes/router');

const rootPath = path.normalize(__dirname);

const app = express();

app.set('app', path.join(rootPath, 'app'));
app.use(logger('dev'));
app.use(bodyParser.json({limit: '20mb'}));

app.use('/api/users', router);

app.use(function(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: err.error || err | {}
    });
});

const dburl = 'mongodb://localhost:27017/cooking';
const port = 9000;

MongoClient.connect(dburl, { useNewUrlParser: true }).then( db => {
    // if (err) throw err;
    console.log("Database connected!");
    var dbo = db.db('cooking');
    app.locals.db = dbo;
    dbo.createCollection('users', function(err, res) {
        if(err) throw err;
        console.log("Collection users created");
    });
    dbo.createCollection('recipes', function(err, res) {
        if(err) throw err;
        console.log("Collection recipes created");
    });
    app.listen( port, err => {
        if(err) throw err;
        console.log(`Cooking Recipes API is listening on port ${port}`);
    });
}).catch(err => { 
    console.error("Error: MongoDB not available. Check that it is started on port 27017.")
    throw err
});