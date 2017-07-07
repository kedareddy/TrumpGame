

const util = require('util')

var ffmpeg = require('fluent-ffmpeg/index');
var path = require('path'); 
var fs = require('fs');

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
   
    console.log("in the function!!@!@!");
    
    var tempPath = path.resolve() + "/temp";
    
    /*ffmpeg.ffprobe('https://media.giphy.com/media/3rgXBvnbXtxwaWmhr2/giphy.mp4',function(err, metadata) {
       var textt = require('util').inspect(metadata, false, null);
       res.send(textt);
    });*/
    
      // setup event handlers
  /*.on('filenames', function(filenames) {
      var fileNs = 'screenshots are ' + filenames.join(', ') +  path.resolve();
      res.send(fileNs);
  })*/
    
  /*  var proc = ffmpeg('https://media.giphy.com/media/TLqkzhMIZxAQg/giphy.mp4')
  .on('end', function() {
    console.log('screenshots were saved');
  })
  .on('error', function(err) {
    console.log('an error happened: ' + err.message);
      res.send(err.message);
  })
  // take 2 screenshots at predefined timemarks and size
  .takeScreenshots({ count: 2, timemarks: [ '00:00:00.000', '00:00:00.100' ], size: '150x100', filename: 'image_00%i.png'}, tempPath, function(err, filenames) {
    console.log('file has been converted succesfully');
      res.send(filenames);
  });
    */
    var tempPath1 = path.resolve() + "/temp/image_001.png";
     var tempPath2 = path.resolve() + "/temp/target.gif";
 var proc = ffmpeg('http://musicresourcecenter.org/wp-content/uploads/2016/04/Dance-Image.png')
  // loop for 5 seconds
  .loop(1)
  // using 25 fps
  .fps(12)
  // setup event handlers
  .on('end', function() {
    console.log('file has been converted succesfully');
      res.send("finished");
  })
  .on('error', function(err) {
    console.log('an error happened: ' + err.message);
  })
  // save to file
  .save(tempPath2);
    

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
    
    var file = 'https://www.playloops.io/' + id;
    //var type = mime[path.extname(file).slice(1)] || 'text/plain';
    
    var s = fs.createReadStream(file);
    s.on('open', function () {
        res.setHeader('Content-Type', type);
        s.pipe(res);
    });

}
