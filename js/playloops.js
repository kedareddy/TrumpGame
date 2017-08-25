    const PLAYLOOPS_SERVER_URL = 'https://www.playloops.io';
    const PLAYLOOPS_SIGN_URL = PLAYLOOPS_SERVER_URL + '/playloops-img/sign-s3';
   
    function addPlayloop (playloop_dict) {
        return new Promise( function(resolve, reject) {
            const PLAYLOOPS_ADD_URL = PLAYLOOPS_SERVER_URL + "/playloops/";
        
            console.log(JSON.stringify(playloop_dict));
        
            $.ajax({
                type: 'POST',
                //dataType: 'jsonp',
                data: playloop_dict,
                url: PLAYLOOPS_ADD_URL,
                success : function(data) { resolve(playloop_dict) },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log("Error: Status: "+textStatus+" Message: "+errorThrown);
                    reject("Error: Status:"+textStatus+" Message: "+errorThrown);
                } 
            
            });
        });
        
        
    }

    function getPlayloop (id) {
       const PLAYLOOPS_GET_URL = PLAYLOOPS_SERVER_URL + "/playloops/" + id;
    
       $.get( PLAYLOOPS_GET_URL, function( data ) {
           alert( "Data Loaded: " + data );
        });
        
            
    }
    
    //Kedar's additions
    function createSummaryGIF(playloop_dict){
        return new Promise( function(resolve, reject) {
            
            const PLAYLOOPS_GET_URL = PLAYLOOPS_SERVER_URL + "/createSummaryGIF/";

            $.ajax({
                type: 'POST',
                //dataType: 'jsonp',
                data: playloop_dict,
                url: PLAYLOOPS_GET_URL,
                success : function(data) { 
                    console.log(data);
                    //resolve(playloop_dict); 
                    resolve(data);
                },
                error : function(jqXHR, textStatus, errorThrown) {
                    console.log("Error: Status: "+textStatus+" Message: "+errorThrown);
                    reject("Error: Status:"+textStatus+" Message: "+errorThrown);
                } 
            });
        });    
    }

    /*function pollServer(){
        return new Promise( function(resolve, reject) {
            const PLAYLOOPS_GET_URL = PLAYLOOPS_SERVER_URL + "/pollServer";

            setTimeout(function() {
               $.ajax({ 
                   url: PLAYLOOPS_GET_URL, 
                   success: function(data) {
                        console.log(data);
                        resolve(data);
                   },
                   error : function(jqXHR, textStatus, errorThrown) {
                        console.log("Error: Status: "+textStatus+" Message: "+errorThrown);
                        reject("Error: Status:"+textStatus+" Message: "+errorThrown);
                   }, 
                   complete: poll 
               });
            }, 1000);
        }); 
    }*/

    //generates a 26 byte long low-ascii string 
    function generateUUID() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }



    //img_name => name of 
    function getS3SignedResponse(img_name, img_type) {
        
        //return new Promise( function(resolve, reject) {
        return  $.ajax({
                dataType: 'jsonp',
                data: `file-name=${img_name}&file-type=${img_type}&content-encoding=base64`,
                url: PLAYLOOPS_SIGN_URL,
            });

    }

    function uploadFileToS3(file, contentType, signedRequest){
        
        return new Promise( function (resolve, reject) {
            
            var buffer = dataUri2Buffer(file);
            //console.log("buffer; " + buffer);
            //console.log("buffer.log: " + file);
            const xhr = new XMLHttpRequest();
            

            xhr.open('PUT', signedRequest);
            xhr.setRequestHeader('content-type', contentType);
            xhr.setRequestHeader('content-encoding', 'base64');

            xhr.onreadystatechange = () => {
                if(xhr.readyState === 4){
                    if(xhr.status === 200){

                        resolve(xhr.status);

                    }         
                    else{
                        console.log("yoyo: " + xhr.statusText);
                        console.log("yoyo2: " + xhr.response);
                        //console.log("yoyoy3: " + file );
                        reject(xhr.statusText);
                    }
                }
            };

            xhr.send(buffer);
        });
    }

        
        function dataUri2Buffer(dataURI) {
            // from http://stackoverflow.com/questions/12883871/how-to-upload-base64-encoded-image-data-to-s3-using-javascript-only]
            
            var u = dataURI.split(',')[1];
            //console.log(u);
            var b = atob(u);
            var arr = [];

            for (var i = 0; i < b.length; i++) {
                arr.push(b.charCodeAt(i));
            }

            var typedArray = new Uint8Array(arr);

            // now typedArray.buffer can be passed to xhr.send
            
            return typedArray.buffer;
        }
        
        
    
    
