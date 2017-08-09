

const util = require('util')
var ffmpeg = require('fluent-ffmpeg/index');
var spawn = require('child_process').spawn;
var path = require('path'); 
var fs = require('fs');
var fabric = require('fabric').fabric;
//var fabricUtil = require('fabric').fabric.util;
var GIFEncoder = require('gifencoder');
var encoder;
var Canvas = require('canvas');
global.Image = Canvas.Image;

var mongo = require('mongodb');

var aws = require('aws-sdk');
const S3_BUCKET = 'playloops'; //process.env.S3_BUCKET;
const AWS_ID = 'AKIAJQMULTNLBGQO5VTQ';
const AWS_KEY = 'vj/zdq56oUHkWpTk49n/Q5l9ECrcgUrxWEtCkE6h';

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var server = new Server('ds057476.mlab.com', 57476, {auto_reconnect: true});
db = new Db('heroku_bsmmjq6z', server);

db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'heroku_bsmmjq6z' database");
                db.authenticate("praveen", "m1crog@m3s", function(err, res) {
            if(!err) {
                console.log("Authenticated");
            } else {
                console.log("Error in authentication.");
                console.log(err);
            }
        });
        
        /*
        db.collection('playloops', {strict:true}, function(err, collection) {
            if (err) {
                console.log("The 'playloops' collection doesn't exist. Creating it with sample data...");
                populateDB();
            }
        });
        */
    }
});

exports.signS3 = function(req, res) {
    
    aws.config.update({
            accessKeyId: AWS_ID,
            secretAccessKey: AWS_KEY,
            region: 'us-west-1'
    });


    
    const s3 = new aws.S3();
    const fileName = req.query['file-name'];
    const fileType = req.query['file-type'];
    const contentEncoding = req.query['content-encoding'];
    //const contentLength = req.query['content-length'];
    const callBack = req.query['callback'];

    const s3Params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Expires: 86400,
        ContentType: fileType,
        ContentEncoding: contentEncoding,
        //ContentLength: contentLength,
        ACL: 'public-read'
    };

    s3.getSignedUrl('putObject', s3Params, (err, data) => {
        if(err){
            console.log(err);
            return res.end();
        }
        
        const returnData = {
            signedRequest: data,
            url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
            };
        
    var response = callBack + '(' +  JSON.stringify(returnData) + ')';  
    res.write(response);
    res.end();
  });
}


//Kedar's additions
exports.createSummaryGIF = function(req, res){
   var playloop = req.body;
   var tempPath = __dirname + "/../tmp";   
   
   var mov1URL; 
   var gifH; 
   var canvasStr = playloop['scenes'][0];
   var sceneJSON = JSON.parse(canvasStr); 
   var sceneObjects = sceneJSON.objects;
   var addOnObjs = []; 
   var vPosX =0;
   var vPosY =0;
    
   //setup gif encoder
   encoder = new GIFEncoder(sceneJSON.width, sceneJSON.height);
   encoder.createReadStream().pipe(fs.createWriteStream('myanimated.gif'));

   //extract playloop info    
   for (var i = 0; i < sceneObjects.length; i++) {
        //var klass = fabric.util.getKlass(sceneObjects[i].type);
        if (sceneObjects[i].name == "video") {
            
            var urlText = sceneObjects[i].src;
            /*var indexTC = urlText.indexOf("#t=");
            var timeCodes = urlText.slice(indexTC+3).split(","); 
            console.log("!!!!!!!!!!!timeCodes: " + timeCodes[0] + " :: " + timeCodes[1]); 
            var startTime = timeCodes[0]; 
            var endTime = timeCodes[1];*/
            urlText = urlText.split('mp4')[0];
            
            mov1URL = urlText.concat("mp4"); 
            if(mov1URL.match('^https://')){
                 mov1URL = mov1URL.replace("https://","http://")
            } 
            vPosX = sceneObjects[i].left; 
            vPosY = sceneObjects[i].top;
            console.log("in video!" + mov1URL);
            gifH = sceneObjects[i].height;
        }
        else{
            //if(sceneObjects[i].name != "cursor"){
            if(sceneObjects[i].name == "text" || sceneObjects[i].name == "rect"){
                //var aObj = klass.fromObject(sceneObjects[i]);
                //addOnObjs.push(aObj);
                addOnObjs.push(sceneObjects[i]);
            }
        }
   }
    
    //ffmpeg -i https://media.giphy.com/media/TLqkzhMIZxAQg/giphy.mp4 -r 0.5 output_%04d.png
    //ffmpeg -framerate 2 -i output_%04d.png output.gif
    //first break up the first scene into frames
    var scaleParam = "scale=-1:"+gifH;
    console.log("scaleParam: " + scaleParam);
    // '-r', '0.5',
    var ffmpeg = spawn('ffmpeg', ['-y', '-i', mov1URL, '-filter:v', scaleParam , 'output_%04d.png']);
    var ffmpeg2; 
    
    
    var ffprobe = spawn('ffprobe', ['-v', '0', '-of', 'compact=p=0', scaleParam , '-select_streams', '0', '\-show_entries', 'stream=r_frame_rate', mov1URL]);
    ffprobe.stdout.on('data', function (data) {
        console.log('framerate: ' + data);
    });
    ffprobe.stderr.on('data', function (data) {
        console.log('framerateERR: ' + data);
    });
     ffprobe.stderr.on('end', function () {
        console.log('framerateERREND');
    });
    //ffprobe -v 0 -of compact=p=0 -select_streams 0 \-show_entries stream=r_frame_rate 'The Master (2012).mp4'
    
    
    

    ffmpeg.stderr.on('data', function (data) {
        //console.log("WTF is DATA??: " + data.toString());
    });

    ffmpeg.stderr.on('end', function () {
        //__dirname is where this file is located, process.cwd() is inside the node folder?  
        console.log('file has finished splitting into frames. __dirname: ' + __dirname + ":p:" + process.cwd() );
          var files = fs.readdirSync(path.join(__dirname, '/../../'));
          console.log("where is node looking: " + path.join(__dirname, '/../../'));
        
            //start gif encoder
        encoder.start();
        encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat 
        encoder.setDelay(40);  // frame delay in ms 25fps or 1000/25 ms delay
        encoder.setQuality(10); // image quality. 10 is default. 
        
          var promises = []; 
          var pngCounter = 0; 
          for (var j = 0; j < files.length; j++) {
                var extension = path.extname(files[j]);
                console.log("the extension: " + extension);
                if(extension == ".png"){
                    var result = populateFrames(sceneJSON.width, sceneJSON.height, files[j], "/", addOnObjs, vPosX, vPosY, pngCounter);
                    promises.push(result);
                    pngCounter += 1; 
                }
          }
        
        try {
          var stats = fs.statSync("/app/output.gif");
          console.log('it exists');
          fs.unlinkSync("/app/output.gif");   
        }
        catch(err) {
            console.log('it does not exist');
        }
        
        Promise.all(promises).then(_ => {
            // do what you want
            console.log('done#$@#$@#$@#$@YAYAYAYA');
            //stich the final GIF together
            //ffmpeg -framerate 2 -i output_%04d.png output.gif
            //'-pix_fmt', 'yuv420p', '-f', 'png', 
           /* var ffmpeg2 = spawn('ffmpeg', [ '-y', '-f', 'image2', '-c:v', 'png', '-framerate', '2', '-pix_fmt', 'rgba', '-s', '300x200', '-i', 'exp_%04d.png', '-t', '2', 'output.gif']);
            ffmpeg2.stderr.on('end', function () {
                console.log("final GIF made! at output.gif");
            });
            ffmpeg2.stderr.on('data', function (data) {
                console.log("WTF is DATA??: " + data.toString());
            });
            ffmpeg2.stderr.on('exit', function () {
                console.log('child process exited2');
            });

            ffmpeg2.stderr.on('close', function() {
                console.log('...closing time! bye2');
            });*/
            
            encoder.finish();

        }).catch(err => {
            // handle I/O error
            console.error(err);
        }); 
        
        

    });

    ffmpeg.stderr.on('exit', function () {
        console.log('child process exited');
    });

    ffmpeg.stderr.on('close', function() {
        console.log('...closing time! bye');
    });
    
    res.send("converted");


}

function populateFrames(cW, cH, orgImg, orgImgPath, addOnObjs, posX, posY, counter) {
    //console.log("counter is: " + counter);
    var num = pad(counter, 4); 
    var outputPath = "/app/exp_"+num+".png";
    console.log("outputPath: " + outputPath);
    var out = fs.createWriteStream(outputPath);
    //make canvas
    var c = fabric.createCanvasForNode(200, 200);
    c.setHeight(cH);
    c.setWidth(cW);
    
    return new Promise((resolve, reject) => {
        var img = new Image(); 
        img.onload = function() {
            console.log("image loaded with src");
            //add image
            fabImg = new fabric.Image(img);
            c.add(fabImg);
            fabImg.set({ left: posX, top: posY });
            //add other elements
            for(var p = 0; p < addOnObjs.length; p++){
                if(addOnObjs[p].name == "rect"){
                    var shape = new fabric.Rect({
                        left: addOnObjs[p].left,
                        top: addOnObjs[p].top,
                        fill: 'rgba(0,0,0,0.4)',
                        width: addOnObjs[p].width,
                        height: addOnObjs[p].height, 
                        name: 'rect'
                    });
                    c.add(shape);
                }else if(addOnObjs[p].name == "text"){
                   var iText =new fabric.IText(addOnObjs[p].text, {
                        textAlign: 'center',
                        left: addOnObjs[p].left,
                        top: addOnObjs[p].top,
                        fill: 'rgba(250,250,250,0.7)',
                        name: 'text'
                    });
                    c.add(iText);      
                }
            }
            c.renderAll(); 
            var ctx = c.getContext('2d');
            
            encoder.addFrame(ctx);
            resolve();
            var a = 0; 
            if(a == 1){ reject();}
            /*//Export to PNG
            var stream = c.createPNGStream();
            stream.on('data', function(chunk) {
                out.write(chunk);
            });
            stream.on('end', function() {
                console.log("finished writing final png");
                resolve();
            });
            stream.on('error', function() {
                reject();
            });*/
        };
        img.src = orgImg;
    });
}


//get a padded number
function pad(num, size) {
    var s = "000000000" + num;
    return s.substr(s.length-size);
}


exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving playloop: ' + id);
    db.collection('playloops', function(err, collection) {
        //collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, item) {
        collection.find({'_id': id}).limit(1).next( 
            function(err, item) {
            res.send(item);
        });
    });
};

exports.findAll = function(req, res) {
    db.collection('playloops', function(err, collection) {
        collection.find().toArray(function(err, items) {
            if (err) {
                console.log("error has occured: " + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log(items);
                res.send(items);
            }
        });
    });
};

exports.addPlayloop = function(req, res) {
    var playloop = req.body;

    console.log('Adding playloop: ' + JSON.stringify(playloop));
    
    db.collection('playloops', function(err, collection) {
        collection.insert(playloop, {safe:true}, function(err, result) {
            if (err) {
                console.log("error has occured: " + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('Success: ' + JSON.stringify(result[0]));
                res.send(result[0]);
            }
        });
    });
}

exports.updatePlayloop = function(req, res) {
    var id = req.params.id;
    var wine = req.body;
    console.log('Updating playloop: ' + id);
    console.log(JSON.stringify(wine));
    db.collection('playloops', function(err, collection) {
        collection.update({'_id':new BSON.ObjectID(id)}, playloop, {safe:true}, function(err, result) {
            if (err) {
                console.log('Error updating playloop: ' + err);
                res.send({'error':'An error has occurred'});
            } else {
                console.log('' + result + ' document(s) updated');
                res.send(wine);
            }
        });
    });
}

exports.deletePlayloop = function(req, res) {
    var id = req.params.id;
    console.log('Deleting playloop: ' + id);
    db.collection('playloops', function(err, collection) {
        collection.remove({'_id':new BSON.ObjectID(id)}, {safe:true}, function(err, result) {
            if (err) {
                res.send({'error':'An error has occurred - ' + err});
            } else {
                console.log('' + result + ' document(s) deleted');
                res.send(req.body);
            }
        });
    });
}


exports.renderPlayLoop = function(req,res) {

    var id = req.params.id;
    
    var playloop;
    
    console.log('Retrieving playloop: ' + id);
    db.collection('playloops', function(err, collection) {
        collection.find({'_id': id}).limit(1).next( 
            function(err, item) {
            	console.log("got item: " + item);
            	console.log("scene name is : " + item['scene_name']);
            	res.render(item['scene_name'], item ); 
 	    }
   	);
                
    });

}



exports.renderTempImage = function(req,res) {

    var id = req.params.id;
    
    var mime = {
    html: 'text/html',
    txt: 'text/plain',
    css: 'text/css',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    js: 'application/javascript'
};
    
    var file = 'https://www.playloops.io/tmp/' + id;
    //var type = mime[path.extname(file).slice(1)] || 'text/plain';
    
    var s = fs.createReadStream(file);
    s.on('open', function () {
        res.setHeader('Content-Type', type);
        s.pipe(res);
    });

}
