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
const PLAYLOOPS_SERVER_URL = 'https://www.playloops.io';
const PLAYLOOPS_SIGN_URL = PLAYLOOPS_SERVER_URL + '/playloops-img/sign-s3';

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;

var server = new Server('ds057476.mlab.com', 57476, {auto_reconnect: true});
db = new Db('heroku_bsmmjq6z', server);

// define constructor function that gets `io` sent to it
module.exports = function(io) {
    var module = {}; 


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



    io.on('connection', function(socket) {
      console.log("socket io connection golden");
      socket.emit('news', { hello: 'world' });
      socket.on('my other event', function (data) {
        console.log("SERVER: got stuff from client: " + data);
      });
    });



    module.signS3 = function(req, res) {

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
    
    function getS3SignedResponse(img_name, img_type) {
        
        //return new Promise( function(resolve, reject) {
        return  $.ajax({
                dataType: 'jsonp',
                data: `file-name=${img_name}&file-type=${img_type}&content-encoding=base64`,
                url: PLAYLOOPS_SIGN_URL,
            });

    }
    
    //was trying to upload file to directly from server to s3
    function directUploadToS3(id){
        
        fs.readFile('/app/temp1/final.gif', function (err, data) {
            if (err) throw err; // Something went wrong!
            
            aws.config.update({
                accessKeyId: AWS_ID,
                secretAccessKey: AWS_KEY,
                region: 'us-west-1'
            });

            const s3 = new aws.S3({params: {Bucket: S3_BUCKET}});
            const fileName = id + ".gif"; // req.query['file-name'];
            const fileType = "image/gif"; //req.query['file-type'];
            //const contentEncoding = req.query['content-encoding'];
            //const contentLength = req.query['content-length'];
            //const callBack = req.query['callback'];

            /*const s3Params = {
                Bucket: S3_BUCKET,
                Key: fileName,
                Body: data,
                Expires: 86400,
                ContentType: fileType,
                //ContentEncoding: contentEncoding,
                //ContentLength: contentLength,
                ACL: 'public-read'
            };*/

            const s3Params = {
                Bucket: S3_BUCKET,
                Key: fileName, 
                Body: data,
                ContentType: fileType, 
                ACL: 'public-read'
            };
            s3.putObject(s3Params, function(err, data){
                if (err) { 
                  console.log('Error uploading data: ' + data); 
                } else {
                  console.log('succesfully uploaded the image!');
                }
            });
            
            /*s3.getSignedUrl('putObject', s3Params, (err, data) => {
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
            });*/
            
            
            //var s3bucket = new AWS.S3({params: {Bucket: 'mybucketname'}});
            /*s3bucket.createBucket(function () {
                var params = {
                    Key: file.originalFilename, //file.name doesn't exist as a property
                    Body: data
                };
                s3bucket.upload(params, function (err, data) {
                    // Whether there is an error or not, delete the temp file
                    fs.unlink(file.path, function (err) {
                        if (err) {
                            console.error(err);
                        }
                        console.log('Temp File Delete');
                    });

                    console.log("PRINT FILE:", file);
                    if (err) {
                        console.log('ERROR MSG: ', err);
                        res.status(500).send(err);
                    } else {
                        console.log('Successfully uploaded data');
                        res.status(200).end();
                    }
                });
            });*/
        });
    }

    module.createSummaryGIF = function(req, res){
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
                console.log("obj is: " + sceneObjects[i].name + " scenenum: " + k + " numberofOBjs: " + sceneObjects.length);
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
        if (fs.existsSync('/app/temp1')) {
           rimraf.sync('/app/temp1');
        }
        fs.mkdirSync('/app/temp1'); 

        if (fs.existsSync('/app/temp2')) {
           rimraf.sync('/app/temp2');
        }
        fs.mkdirSync('/app/temp2'); 


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
                        io.sockets.emit('news', { hello: 'great cummunitacing!' });
                        console.log("playloop unique id: " + playloop['_id']);
                        directUploadToS3(playloop['_id']);
                    });
                    gifsicle.stderr.on('data', function (data) {
                        //console.log("WTF is DATA??: " + data.toString());
                    });
                    gifsicle.stderr.on('exit', function () {
                       // console.log('child process exited2');
                    });
                    gifsicle.stderr.on('close', function() {
                        //console.log('...closing time! bye2');
                    });   
                });
                ffmpeg2.stderr.on('data', function (data) {
                    //console.log("WTF is DATA??: " + data.toString());
                });
                ffmpeg2.stderr.on('exit', function () {
                    //console.log('child process exited2');
                });
                ffmpeg2.stderr.on('close', function() {
                    //console.log('...closing time! bye2');
                });
            });
            ffmpeg.stderr.on('data', function (data) {
                //console.log("WTF is DATA??: " + data.toString());
            });
            ffmpeg.stderr.on('exit', function () {
                //console.log('child process exited2');
            });
            ffmpeg.stderr.on('close', function() {
                //console.log('...closing time! bye2');
            });
        }).catch(err => {
            // handle I/O error
            console.error(err);
        })


        //res.status(200).send("all done. heard back from server.");
        res.send("all done. heard back from server.");
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


                var delay = ((s.endTime - s.startTime)*1000)/files.length; 
                //console.log("difference in time:" + (s.endTime - s.startTime).toString());
                //console.log("num of files: " + files.length);
                //calculate frame rate
                var frameRate = 0; 
                var animFrameMarkers; 
                if(s.num == 0){
                    frameRate = files.length/(s.endTime - s.startTime);
                    animFrameMarkers = [Math.round(frameRate*1), Math.round(frameRate*(1*.87)), Math.round(frameRate*(1*0.77)), Math.round(frameRate*(1*0.57)), Math.round(frameRate*(1*0.37)), 0]; 

                    //extend length of first clip to at least 1 sec if less than that
                    if((s.endTime - s.startTime) < 1){
                        //number of times to duplicate the first gif/movie
                        var numCopies = Math.ceil(1/(s.endTime - s.startTime));
                        console.log("number of times extended: " + numCopies);
                        var additionalFiles = []; 
                        for(var m = 0; m < numCopies; m++){
                            additionalFiles= additionalFiles.concat(files);
                        }
                        files = files.concat(additionalFiles);
                    }
                }

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
                var myPromises = []; 
                for (var j = 0; j < files.length; j++) {
                    var result = populateFrames(s.width, s.height, files[j], s.addOnObjs, s.vPosX, s.vPosY, encoder, s.num, j, files.length, animFrameMarkers);
                    myPromises.push(result);
                }

                /*const myPromises = files.map((file, index) => {
                  return populateFrames(s.width, s.height, file, s.addOnObjs, s.vPosX, s.vPosY, encoder, s.num, index, files.length, animFrameMarkers);
                });*/

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
            //console.log("inside populateFrames");
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
            //console.log("outputPath: " + outputPath);
            //console.log("img src: " + imgAddress);
            //var out = fs.createWriteStream(outputPath);
            console.log("index: " + index + " numFrames: " + numFrames);
            //make canvas
            var c = fabric.createCanvasForNode(200, 200);
            c.setHeight(cH);
            c.setWidth(cW);

            var img = new Image(); 
            img.onload = function() {
                //console.log("image loaded with src");
                //add image
                fabImg = new fabric.Image(img);
                c.add(fabImg);
                fabImg.set({ left: posX, top: posY });
                //add other elements
                for(var p = 0; p < addOnObjs.length; p++){
                   // console.log("name of object: " + addOnObjs[p].name + " numofobjs: " + addOnObjs.length);
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

                    //if(addOnObjs[p].name == "cursor"){
                    if(p == (addOnObjs.length - 1) ){
                        console.log("in cursor" + " sceneNum: " + sceneNum);
                        var cursorAllowed = false; 
                        if(sceneNum == 1){
                            cursorAllowed = true; 
                        }
                        if(sceneNum == 0){
                            console.log("frame index: " + index + " point of cursor:" + (numFrames - animationFrames[0]).toString());
                            if(index >= (numFrames - animationFrames[0])){
                               cursorAllowed = true; 
                            }
                        }

                        if(cursorAllowed == true){                        
                            var cursorImg = new Image(); 
                            cursorImg.onload = function(){
                                //console.log("in second image loaded cursor" + " index: " + index + " totalFrames:" + numFrames);
                                //assign end positions to initialize
                                var cImg = new fabric.Image(cursorImg, {
                                    left: 0.5*cW, 
                                    top: 0.85*cH, 
                                    scaleX: 0.5, 
                                    scaleY: 0.5,
                                    originX: "center", 
                                    originY: "center"
                                });

                                 c.add(cImg);
                                //var cursorOrgW =  0.33*cW;
                                //var cursorOrgH = 0.33*cH;
                                var cursorFullSize = true; 
                                if(sceneNum == 0){
                                    if(index >= (numFrames - animationFrames[0]) && index < (numFrames - animationFrames[1]) ){
                                       //show cursor in far right position
                                        cImg.set({ left: 0.96*cW, top: 0.65*cH});
                                    }else if(index >= (numFrames - animationFrames[1]) && index < (numFrames - animationFrames[2]) ){
                                       //show cursor almost near final position
                                        cImg.set({ left: .575*cW, top: .75*cH});
                                    }else if(index >= (numFrames - animationFrames[2]) && index < (numFrames - animationFrames[3]) ){
                                       //show cursor at final location
                                        //cImg.set({ left: 0.5*cW, top: 0.67*cH});
                                    }else if(index >= (numFrames - animationFrames[3]) && index < (numFrames - animationFrames[4]) ){
                                       //shrink cursor size
                                        cImg.set({ scaleX: 0.35, scaleY: 0.35});
                                        //cursorFullSize = false; 
                                    }else if(index >= (numFrames - animationFrames[4]) && index < (numFrames - animationFrames[5]) ){
                                       //show cursor at full size
                                        //cImg.set({ left: 0.5*cW, top: 0.67*cH );
                                    }      
                                }
                                else{
                                    //show cursor at final location at full size
                                }

                                c.renderAll(); 

                                var ctx = c.getContext('2d');
                                enGIF.addFrame(ctx);

                                console.log("resolving!");
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
                            }
                            cursorImg.src = "/app/images/cursor.png"; 
                        }
                        else{
                            console.log("resolving empty frame. SHIT WORKS!!!!!");
                            //add non-cursor frames to the encoder
                            c.renderAll();     
                            var ctx = c.getContext('2d');
                            enGIF.addFrame(ctx);
                            resolve();    
                            var a = 0; 
                            if(a == 1){ reject();}
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


    module.findById = function(req, res) {
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

    module.findAll = function(req, res) {
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

    module.addPlayloop = function(req, res) {
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

    module.updatePlayloop = function(req, res) {
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

    module.deletePlayloop = function(req, res) {
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


    module.renderPlayLoop = function(req,res) {

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

    module.renderTempImage = function(req,res) {

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
    
    return module; 
//end of module.exports
};
