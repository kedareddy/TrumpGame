var express = require('express');
var cons = require('consolidate');

var aws = require('aws-sdk');

console.log("got through all the requires");

const S3_BUCKET = 'playloops' || process.env.S3_BUCKET;
var APP_PORT = process.env.PORT || CONFIG.port;

//var app = express();
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var playloops = require('./routes/playloops')(io);

server.listen(APP_PORT);

// assign the swig engine to .html files
app.engine('html', cons.swig);

// set .html as the default extension
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
    app.use(express.static(__dirname + '/../'));
    app.use("/view/images", express.static(__dirname + '/images'));
    app.use("/view/js", express.static(__dirname + '/images'));
    app.use("/view/assets", express.static(__dirname + '/images'));
    app.use("/tmp", express.static(__dirname + '/tmp'));
});

console.log("app configured with " + __dirname);

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//app.get('/playloops', wine.findAll);
//app.get("/hello", function(req, res) { res.send("hello world"); });
app.get('/playloops/:id', playloops.findById);
app.post('/playloops', playloops.addPlayloop);
app.put('/playloops/:id', playloops.updatePlayloop);
app.delete('/playloops/:id', playloops.deletePlayloop);
app.get('/playloops-all/', playloops.findAll);
app.post('/createSummaryGIF', playloops.createSummaryGIF);
//app.get('/pollServer', playloops.pollServer);

app.get('/playloops-img/sign-s3', playloops.signS3);

app.get('/view/:id', playloops.renderPlayLoop);



//app.listen(APP_PORT);
//var io = require('socket.io').listen(app.listen(APP_PORT));

io.on('connection', function (socket) {
  console.log("socket io connection golden");
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log("SERVER: got stuff from client: " + data);
  });
});
console.log('Listening on port ' + APP_PORT);


