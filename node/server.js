var express = require('express');
var playloops = require('./routes/playloops');
    //scenes = require ('./routes/scenes')
var aws = require('aws-sdk');
const S3_BUCKET = 'playloops'; //process.env.S3_BUCKET;
const APP_PORT = (process.env.port || 80);

var app = express();

app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    app.use(express.static('..'));
});

//app.get('/playloops', wine.findAll);
app.get("/hello", function(req, res) { res.send("hello world"); });
app.get('/playloops/:id', playloops.findById);
app.post('/playloops', playloops.addPlayloop);
app.put('/playloops/:id', playloops.updatePlayloop);
app.delete('/playloops/:id', playloops.deletePlayloop);
app.get('/playloops-all/', playloops.findAll);



app.get('/playloops-img/sign-s3', playloops.signS3);

app.listen(APP_PORT);
console.log('Listening on port ' + APP_PORT);


