

const util = require('util')
var ffmpeg = require('fluent-ffmpeg/index');
var spawn = require('child_process').spawn;
var path = require('path'); 
var fs = require('fs');
var fabric = require('fabric').fabric;
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
   var canvasStr = playloop['scenes'][0];
   var sceneJSON = JSON.parse(canvasStr); 
   var sceneObjects = sceneJSON.objects;
   var addOnObjs = []; 
   var vPosX =0;
   var vPosY =0;
   //extract playloop info    
   for (var i = 0; i < sceneObjects.length; i++) {
        var klass = fabric.util.getKlass(sceneObjects[i].type);

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
        }
        else{
            if(sceneObjects[i].name != "cursor"){
                var aObj = klass.fromObject(sceneObjects[i]);
                addOnObjs.push(aObj);
            }
        }
   }
    
    
   //define fabric canvas
    var canvas = fabric.createCanvasForNode(200, 200);
    canvas.setHeight(sceneJSON.height);
    canvas.setWidth(sceneJSON.width);
    
    //ffmpeg -i https://media.giphy.com/media/TLqkzhMIZxAQg/giphy.mp4 -r 0.5 output_%04d.png
    //ffmpeg -framerate 2 -i output_%04d.png output.gif
    //first break up the first scene into frames
    var ffmpeg = spawn('ffmpeg', ['-i',mov1URL, '-r', '0.5', 'output_%04d.png']);
    var ffmpeg2; 

    ffmpeg.stderr.on('data', function (data) {
        console.log("WTF is DATA??: " + data.toString());
        //res.send(data.toString());
    });

    ffmpeg.stderr.on('end', function () {
        //__dirname is where this file is located, process.cwd() is inside the node folder?  
        console.log('file has finished splitting into frames. __dirname: ' + __dirname + ":p:" + process.cwd() );
          var files = fs.readdirSync(path.join(__dirname, '/../../'));
          console.log("where is node looking: " + path.join(__dirname, '/../../')); 
        
          var promises = []; 
          /*const promises = files.map(file => {
            const source = file.path;
            const destination = path.join('/tmp', file.path);
            return copyFile(source, destination);
          });*/
        
          for (var j = 0; j < files.length; j++) {
         
                var extension = path.extname(files[j]);
                console.log("the extension: " + extension);
                if(extension == ".png"){
                    //console.log("file path of png: " + files[j].path + " name: " + path.basename(files[j].path));
                     var result = populateFrames(canvas, files[j], "/", addOnObjs, vPosX, vPosY);
                    promises.push(result);
                    //clear canvas
                    /*canvas.clear();
                    
                    var img = new Image(); 
                    img.onload = function() {
                        //add image
                        canvas.add(new fabric.Image(img));
                        //add other elements
                        for(var p = 0; p < addOnObjs.length; p++){
                            canvas.add(addOnObjs[p]);
                        }
                        //export to file
                        fs.writeFile(files[j].path, canvas.toBuffer());
                    };
                    img.src = files[j];*/
                }
          }
        
        
        Promise.all(promises).then(_ => {
            // do what you want
            console.log('done#$@#$@#$@#$@YAYAYAYA');
        }).catch(err => {
            // handle I/O error
            console.error(err);
        });
        
        /*var stream = canvas.createPNGStream();
            stream.on('data', function(chunk) {
            out.write(chunk);
            fs.createWriteStream()
        });*/
        
        
        
        /*var img = new Image();
        img.src = fs.readFileSync('/path/to/file.png');
        var canvas = fabric.createCanvasForNode(200, 200);
        canvas.add(new fabric.Image(img));*/
        
        
        /*ffmpeg2 = spawn('ffmpeg', ['-framerate', '2', '-i', 'output_%04d.png', 'output.gif']);
        
        ffmpeg2.stderr.on('data', function (data) {
            console.log(data.toString());
            //res.send(data.toString());
        });

        ffmpeg2.stderr.on('end', function () {
            console.log('file2 has been converted succesfully');
        });

        ffmpeg2.stderr.on('exit', function () {
            console.log('child process exited2');
        });

        ffmpeg2.stderr.on('close', function() {
            console.log('...closing time2! bye');
        });*/
    });

    ffmpeg.stderr.on('exit', function () {
        console.log('child process exited');
    });

    ffmpeg.stderr.on('close', function() {
        console.log('...closing time! bye');
    });
    
    res.send("converted");


}

function populateFrames(c, orgImg, orgImgPath, addOnObjs, posX, posY) {
    //const input = fs.createReadStream(source);
    //const output = fs.createWriteStream(destination);
    //clear canvas
    var outputPath = path.join(__dirname, '/../../exp.png');
    c.clear();
    var out = fs.createWriteStream(outputPath);

    return new Promise((resolve, reject) => {
        var img = new Image(); 
        img.onload = function() {
            console.log("image loaded with src");
            //add image
            c.add(new fabric.Image(img));
            c.item(0).left = posX; 
            c.item(0).top = posY;
            c.item(0).setCoords();
            //add other elements
            for(var p = 0; p < addOnObjs.length; p++){
                c.add(addOnObjs[p]);
            }
            c.renderAll(); 
            //export to file
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
            });
            //fs.writeFile(orgImgPath, c.toBuffer());
        };
        img.src = orgImg;
    });
}


exports.stitchGIF = function(req, res){
    
var tempPath = path.resolve() + "/temp/image_%02d.png";
    var tempPath1 = path.resolve() + "/temp/image_001.png";
    var tempPath2 = path.resolve() + "/temp/image_002.png";
    //res.send(tempPath);
   /* var proc = new ffmpeg({ source: tempPath })
      .saveToFile('temp/my.mp4', function(stdout, stderr) {
        //console.log('file has been created with soundtrack succesfully');
          res.send("gif created on server!");
      });
    */
    
/*var proc = new ffmpeg('https://media.giphy.com/media/TLqkzhMIZxAQg/giphy.mp4')
      .saveToFile('temp/my.gif', function(stdout, stderr) {
        //console.log('file has been created with soundtrack succesfully');
          res.send("gif created on server!");
      });*/
    
    var proc = new ffmpeg();

    proc.addInput(tempPath)
    .on('start', function(ffmpegCommand) {
        /// log something maybe
    })
    .on('progress', function(data) {
        /// do stuff with progress data if you want
    })
    .on('end', function() {
        /// encoding is complete, so callback or move on at this point
        res.send("finished!");
    })
    .on('error', function(error) {
        /// error handling
    })
    .output('temp/out.mp4')
    .run();
/*
    .addInputOption('-framerate 20')
    .outputOptions(['-c:v libx264', '-r 30', '-pix_fmt yuv420p'])*/

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
