## Overview

This guide describes how to integrate the metrics collection SDK with your own Amazon Interactive Video Service channels. 

## Assumptions

It is assumed you have deployed the IVS Quality of Service solution into an AWS account. 

It is assumed you have created an IVS channel and integrated the IVS Video Player with your website or application. 

For information on how the IVS Quality of Service solution collects and stores metrics, please see the [Architecture] guide. 

## Integrating the SDK with your IVS web video player

The IVS Quality of Service solution includes an additional SDK which performs the functions of collecting performance data from the video player and delivering these periodically to the solution hosted in AWS. 

The SDK is included in this code repository in the folder web/IVSplayer/js/ and consists of the files:

* ivs.js - Contains the metrics capture and posting functions
* config.js - Configuration settings for the metrics capture process

To integrate with your own web video player:

1. In the AWS CloudFormation Management Console, select the CloudFormation stack you deployed the IVS Quality of Service solution under. Navigate to the Outputs section. 
2. Open the config.js file and copy and paste the values from the CloudFormation Outputs to the appropriate values in the JSON data structure within this file. 
3. Save the config.js file and add this file and the ivs.js file to your web application code. 
4. Modify the HTML containing your IVS Video Player to include the following tag at the end of the file:

  \<script type="module" src="./js/ivs.js">\</script>

For an example, see the sample index.html file included in the web/IVSplayer/ folder.

5. Upload the updated HTML and the Quality of Service JS files to your web host. 

## Testing the SDK

To validate the SDK is operating as expected:

1. Start a stream to your IVS channel
2. Load the web site containing your IVS Video Player and observe the stream
3. In your browser, open the Developer Tools function and navigate to the Network tab
4. Periodically, you will see PUT requests to an API Gateway hosted URL matching that configured in the config.js file. 
5. If the requests are being accepted, the browser will show these requests complete with a 200 OK response code. 

## Next Steps

