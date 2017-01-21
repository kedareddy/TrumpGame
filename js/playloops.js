    const PLAYLOOPS_SERVER_URL = 'http://www.playloops.io';
    const PLAYLOOPS_SIGN_URL = PLAYLOOPS_SERVER_URL + '/playloops-img/sign-s3';
   
    function addPlayloop (playloop_dict, success_callback, error_callback) {
        const PLAYLOOPS_ADD_URL = PLAYLOOPS_SERVER_URL + "/playloops/";
        
        alert("about to ajax! " + PLAYLOOPS_ADD_URL) ;    
        $.ajax({
            type: 'POST',
            //contentType: "application/json; charset=UTF-8",
            //data: JSON.stringify(playloop_dict),
            data: playloop_dict,
            url: PLAYLOOPS_ADD_URL,
            success : success_callback,
            error : error_callback 
            
        });
        
        return true;
    }

    function getPlayloop (id) {
       const PLAYLOOPS_GET_URL = PLAYLOOPS_SERVER_URL + "/playloops/" + id;
    
       $.get( PLAYLOOPS_GET_URL, function( data ) {
           alert( "Data Loaded: " + data );
        });
        
            
    }
    

    //generates a 26 byte long low-ascii string 
    function generatePlayloopID() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }


    //img_name => foobar.gif
    //img_type => MIME type like "image/gif" or "image/jpeg"
    //img_src => base64 encoded image data
    function uploadImage(img_name, img_type, img_src){
        
             var img_data = img_src.replace('data:image/gif;base64,','');
        
             const img_length = img_data.length;
            
        
             $.ajax({
                dataType: 'jsonp',
                data: `file-name=${img_name}&file-type=${img_type}&content-encoding=base64&content-length=${img_length}`,
                url: _PLAYLOOPS_SIGN_URL,
                success: function (signed_response) {
                    uploadFileToS3(img_data, img_type, signed_response.signedRequest, signed_response.url);
                  
                },
                error: function(retdata) { 
                    alert('Could not get signed URL');
                }
             });

        }
             

        function uploadFileToS3(file, contentType, signedRequest, url){
            const xhr = new XMLHttpRequest();
            sr = signedRequest;
            
            xhr.open('PUT', sr);
            xhr.setRequestHeader('content-type', contentType);
            xhr.setRequestHeader('content-encoding', 'base64');

            xhr.onreadystatechange = () => {
                if(xhr.readyState === 4){
                    if(xhr.status === 200){
                        alert("uploaded file!");
                        //document.getElementById('preview').src = url;
                    }         
                        else{
                            alert('Could not upload file.');
                        }
                    }
                };
                
                xhr.send(file);
            }
        
        
        
        function dataUri2Buffer(dataURI) {
            // from http://stackoverflow.com/questions/12883871/how-to-upload-base64-encoded-image-data-to-s3-using-javascript-only]
            
            var u = dataURI.split(',')[1];
            var b = atob(u);
            var arr = [];

            for (var i = 0; i < b.length; i++) {
                arr.push(b.charCodeAt(i));
            }

            var typedArray = new Uint8Array(arr);

            // now typedArray.buffer can be passed to xhr.send
            
            return typedArray.buffer;
        }
        
    
    
