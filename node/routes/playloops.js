

const util = require('util')
var ffmpeg = require('fluent-ffmpeg/index');
var spawn = require('child_process').spawn;
var path = require('path'); 
var fs = require('fs');
var rimraf = require('rimraf');
var fabric = require('fabric').fabric;
//var fabricUtil = require('fabric').fabric.util;
var GIFEncoder = require('gifencoder');

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
    
   var scenes = []; 
   var canvasStr, sceneJSON, sceneObjects;
    
   //extract playloop info
   for(var k = 0; k < 2; k++){   
       var scene = {};
       scene['num'] = k;
       scene['addOnObjs'] = [];
       
       canvasStr = playloop['scenes'][k];
       sceneJSON = JSON.parse(canvasStr);
       scene['width'] = sceneJSON.width;
       scene['height'] = sceneJSON.height;
       sceneObjects = sceneJSON.objects;
        
       for (var i = 0; i < sceneObjects.length; i++) {    
            if (sceneObjects[i].name == "video") {
                var urlText = sceneObjects[i].src;
                var indexTC = urlText.indexOf("#t=");
                var timeCodes = urlText.slice(indexTC+3).split(","); 
                console.log("!!!!!!!!!!!timeCodes: " + timeCodes[0] + " :: " + timeCodes[1]); 
                scene['startTime'] = timeCodes[0]; 
                scene['endTime'] = timeCodes[1];
                
                urlText = urlText.split('mp4')[0];
                urlText = urlText.concat("mp4"); 
                if(urlText.match('^https://')){
                     urlText = urlText.replace("https://","http://")
                } 
                
                scene['movURL'] = urlText; 
                scene['vPosX'] = sceneObjects[i].left; 
                scene['vPosY'] = sceneObjects[i].top; 
                scene['gifH'] = sceneObjects[i].height
            }
            else{
                //if(sceneObjects[i].name == "text" || sceneObjects[i].name == "rect"){
                    scene.addOnObjs.push(sceneObjects[i]);
                //}
            }
       }
       
       scenes.push(scene);
   }
    
   //if temp1 and temp2 exist, delete everything in there
    /*if (fs.existsSync('/app/temp1')) {
       rimraf.sync('/app/temp1');
    }else{*/
       fs.mkdirSync('/app/temp1'); 
   // }
    /*if (fs.existsSync('/app/temp2')) {
       rimraf.sync('/app/temp2');
    }else{*/
       fs.mkdirSync('/app/temp2'); 
    //}
            
    //split up the frames of the two videos from the first 2 scenes
    /*var promisesSplitFrames = []; 
    for (var j = 0; j < 2; j++) {
        var result = splitFrames(scenes[j]); 
        promisesSplitFrames.push(result);
    }

    Promise.all(promisesSplitFrames).
    */
    Promise.resolve()
    .then(() => {
        //get array of promises to execute next
        return splitFrames(scenes[0]);
    }).catch(err => {
        // handle I/O error
        console.error(err);
    })
    .then(() => {
        //get array of promises to execute next
        return splitFrames(scenes[1]);
    }).catch(err => {
        // handle I/O error
        console.error(err);
    })
    .then(() => {
        //get array of promises to execute next
        //return prepGIFS(scenes);
        return setupScene(scenes[0]);
    }).catch(err => {
        // handle I/O error
        console.error(err);
    })
    .then(() => {
        //get array of promises to execute next
        //return prepGIFS(scenes);
        return setupScene(scenes[1]);
    }).catch(err => {
        // handle I/O error
        console.error(err);
    })
    .then(() => {
        //write combined gif to /app/temp1/
        /*fs.readdir("/app/temp1/", function (err, files) {
            console.log("now file number: " + files.length);
        });*/
        //ffmpeg -i 'concat:input1|input2' -codec copy output
        //ffmpeg -f concat -i input.txt -codec copy output.mp4
        var concatString = 'concat:/app/temp1/myanimated.gif|/app/temp2/myanimated.gif';
        //var ffmpeg = spawn('ffmpeg', ['-i', concatString, '-c', 'copy', '/app/temp1/final.gif']);
        var ffmpeg = spawn('ffmpeg', ['-f', 'concat', '-safe', '0', '-protocol_whitelist', 'file,http,https,tcp,tls', '-i', '/app/input.txt', '-c:v', 'libx264', '/app/temp1/final.mp4']);
        ffmpeg.stderr.on('end', function () {
            console.log("final MOVIE made! at temp1/final.mp4");
            //ffmpeg -i input.mp4 output.gif
            var ffmpeg2 = spawn('ffmpeg',['-i', '/app/temp1/final.mp4', '/app/temp1/final.gif']);
            ffmpeg2.stderr.on('end', function () {
                console.log("final GIF made at temp1/final.gif");
                //gifsicle -b -O2 anim.gif  '--use-col=web',
                var gifsicle = spawn('gifsicle', ['-b', '--colors=256', '--color-method=blend-diversity', '-O2','/app/temp1/final.gif']);
                gifsicle.stderr.on('end', function () {
                    console.log("GIF optimized at temp1/final.gif");
                });
                gifsicle.stderr.on('data', function (data) {
                    console.log("WTF is DATA??: " + data.toString());
                });
                gifsicle.stderr.on('exit', function () {
                    console.log('child process exited2');
                });
                gifsicle.stderr.on('close', function() {
                    console.log('...closing time! bye2');
                });
                
            });
            ffmpeg2.stderr.on('data', function (data) {
                console.log("WTF is DATA??: " + data.toString());
            });
            ffmpeg2.stderr.on('exit', function () {
                console.log('child process exited2');
            });

            ffmpeg2.stderr.on('close', function() {
                console.log('...closing time! bye2');
            });
        });
        ffmpeg.stderr.on('data', function (data) {
            console.log("WTF is DATA??: " + data.toString());
        });
        ffmpeg.stderr.on('exit', function () {
            console.log('child process exited2');
        });

        ffmpeg.stderr.on('close', function() {
            console.log('...closing time! bye2');
        });
        
    }).catch(err => {
        // handle I/O error
        console.error(err);
    })
    
    res.send("converted");


}

var pngCounter = 0;
function setupScene(s){
    return new Promise( function(resolve, reject) {
        var folderPath; 
        var gifPath;
        if(s.num == 0){
            folderPath = '/app/temp1/';
            gifPath = '/app/temp1/myanimated.gif';
        }else{
            folderPath = '/app/temp2/';
            gifPath = '/app/temp2/myanimated.gif';
        }
        console.log("s num: " + s.num + " folderPath: " + folderPath);
        //var files = fs.readdirSync(folderPath);
        fs.readdir(folderPath, function (err, files) {
            if (err) {
                console.log(err);
            }
            
            //calculate frame rate
            var frameRate = 0; 
            var animFrameMarkers; 
            if(s.num == 0){
                frameRate = files.length/(s.endTime - s.startTime);
                animFrameMarkers = [Math.round(frameRate*0.5), Math.round(frameRate*(0.5*.80)), Math.round(frameRate*(0.5*0.60)), Math.round(frameRate*(0.5*0.40)), Math.round(frameRate*(0.5*0.25)), 0]; 
            }
            var delay = ((s.endTime - s.startTime)*1000)/files.length; 
            console.log("difference in time:" + (s.endTime - s.startTime).toString());
            console.log("num of files: " + files.length);

            //setup gif encoder
            var encoder = new GIFEncoder(s.width, s.height);
            encoder.createReadStream().pipe(fs.createWriteStream(gifPath));
            //start gif encoder
            encoder.start();
            encoder.setRepeat(0);   // 0 for repeat, -1 for no-repeat 
            encoder.setDelay(delay);  // frame delay in ms 25fps or 1000/25 ms delay
            encoder.setQuality(15); // image quality. 10 is default. 

            //var encoderPromises = {};
            //var promises = []; 
          
            pngCounter = 0;
            /*for (var j = 0; j < files.length; j++) {
                var extension = path.extname(files[j]);
                console.log("the extension: " + extension);
                if(extension == ".png"){
                    var result = populateFrames(s.width, s.height, files[j], "/", s.addOnObjs, s.vPosX, s.vPosY, pngCounter, encoder, s.num);
                    promises.push(result);
                    pngCounter += 1; 
                }
            }*/
            
            const myPromises = files.map((file, index) => {
              return populateFrames(s.width, s.height, file, s.addOnObjs, s.vPosX, s.vPosY, encoder, s.num, index, files.length, animFrameMarkers);
            });
            
            Promise.all(myPromises).then(() => {
                //encoderPromises.encoder.finish();
                encoder.finish();
                console.log("encoding finished");
                //encoderPromises['encoder'] = encoder; 
                //encoderPromises['promises'] = promises; 
                //resolve(encoderPromises);
                resolve();
                var a = 0; 
                if(a == 1){ reject();}
                
            }).catch(err => {
                // handle I/O error
                console.error(err);
            });

        });
    });
}



function splitFrames(scene){
    return new Promise(function(resolve, reject) {
        var outputAddress; 
        if(scene.num == 0){
            outputAddress = '/app/temp1/output_%04d.png';
        }else{
            outputAddress = '/app/temp2/output_%04d.png';
        }
        var scaleParam = "scale=-1:"+ scene.gifH;
        console.log("scaleParam: " + scaleParam);// '-r', '0.5',
        var ffmpeg = spawn('ffmpeg', ['-y', '-i', scene.movURL, '-filter:v', scaleParam , outputAddress]);

        ffmpeg.stderr.on('data', function (data) {
            //console.log("WTF is DATA??: " + data.toString());
        });

        ffmpeg.stderr.on('end', function () {
            resolve();
            console.log("finished splitting");
        });
        
        ffmpeg.stderr.on('exit', function () {
            console.log('child process exited2');
        });

        ffmpeg.stderr.on('close', function() {
            console.log('...closing time! bye2');
        });
    });
}


function populateFrames(cW, cH, orgImg, addOnObjs, posX, posY, enGIF, sceneNum, index, numFrames, animationFrames) {

    return new Promise( function(resolve, reject) {
        console.log("inside populateFrames");
        var folderPath; 
        var imgAddress; 
        if(sceneNum == 0){
            folderPath = "/app/temp1/exp_";
            imgAddress = "/app/temp1/"+orgImg; 
        }else{
            folderPath = "/app/temp2/exp_";
            imgAddress = "/app/temp2/"+orgImg; 
        }
        pngCounter +=1;
        var num = pad(pngCounter, 4); 
       
        var outputPath = folderPath+num+".png";
        console.log("outputPath: " + outputPath);
        console.log("img src: " + imgAddress);
        //var out = fs.createWriteStream(outputPath);
        //make canvas
        var c = fabric.createCanvasForNode(200, 200);
        c.setHeight(cH);
        c.setWidth(cW);
        
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
                
                if(addOnObjs[p].name == "cursor"){
                    var cursorAllowed = false; 
                    if(sceneNum == 1){
                        cursorAllowed = true; 
                    }
                    if(sceneNum == 0){
                        if(index >= (numFrames - animationFrames[0])){
                           cursorAllowed = true; 
                        }
                    }
                    
                    if(cursorAllowed){
                        console.log("image source is: " + addOnObjs[p].getSrc()); 
                        var cursorImg = new Image(); 
                        cursorImg.onload = function(){
                            var cImg = new fabric.Image(cursorImg);
                            c.add(cImg);
                            cImg.set({ left: addOnObjs[p].left, top: addOnObjs[p].top, width: addOnObjs[p].width, height: addOnObjs[p].height, name: 'cursor' });
                            if(sceneNum == 0){
                                if(index >= (numFrames - animationFrames[0]) && index < (numFrames - animationFrames[1]) ){
                                   //show cursor in far right position
                                }else if(index >= (numFrames - animationFrames[1]) && index < (numFrames - animationFrames[2]) ){
                                   //show cursor almost near final position  
                                }else if(index >= (numFrames - animationFrames[2]) && index < (numFrames - animationFrames[3]) ){
                                   //show cursor at final location
                                }else if(index >= (numFrames - animationFrames[3]) && index < (numFrames - animationFrames[4]) ){
                                   //shrink cursor size
                                }else if(index >= (numFrames - animationFrames[4]) && index < (numFrames - animationFrames[5]) ){
                                   //show cursor at full size
                                }      
                            }
                            else{
                                //show cursor at final location
                            }

                            c.renderAll(); 
                            var ctx = c.getContext('2d');
                            enGIF.addFrame(ctx);
                            
                            if(index == (numFrames - 1)){
                                resolve();    
                            }
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
                        }
                        cursorImg.src = addOnObjs[p].getSrc(); //object._originalElement.currentSrc;
                    }
                }
            }

        };
        img.src = imgAddress;
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
