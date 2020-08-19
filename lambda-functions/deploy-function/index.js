'use strict';

const AWS = require("aws-sdk");
const S3 = new AWS.S3({
 signatureVersion: 'v4',
});

const path = require('path');
const AdmZip = require('adm-zip');
const mime = require('mime/lite');
const https = require("https");
const url = require("url");
const readline = require('readline');

const SourceBucket = process.env.SourceBucket;
const SourceFileBucket = process.env.SourceFileBucket;
const SourceUIFilePath = process.env.SourceUIFilePath;
const UIPrefix = process.env.UIPrefix;
const PlayerSummaryEndpoint = process.env.PlayerSummaryEndpoint;
const AnswerSummaryEndpoint = process.env.AnswerSummaryEndpoint;
const Playback_URL = process.env.Playback_URL;

exports.handler = function(event, context) {

 console.log("REQUEST RECEIVED: %j", event);
 console.log("Source bucket :%s", SourceBucket);

 // For Delete requests, immediately send a SUCCESS response.
 if (event.RequestType == "Delete") {
  sendResponse(event, context, "SUCCESS");
  return;
 }

 let responseStatus = "SUCCESS";
 let responseData = {};

 if (event.RequestType == "Create") {

  let jobs = Promise.all([uploadUIAssets(event)]);

  jobs.then(args => {

   sendResponse(event, context, responseStatus, responseData);
  });
 }
 else {
  sendResponse(event, context, responseStatus, responseData);
 }
};

//upload the UI assets. Also modifies the 'js/services/configService.js' file to
//configure the deployment specific resources
// - BUCKET_URL : the S3 bucket where the redirector.json and User interface is deployed.
function uploadUIAssets(event) {
 console.log("In uploadUIAssets :%s", SourceUIFilePath);

 return S3.getObject({ Bucket: SourceFileBucket, Key: SourceUIFilePath }).promise()
  .then(data => {
   let zip = new AdmZip(data.Body);
   let zipEntries = zip.getEntries();

   zipEntries.forEach(function(zipEntry) {

    if (!zipEntry.isDirectory) {
     let mimeType = mime.getType(zipEntry.name.substring(zipEntry.name.lastIndexOf(".")));
     let fileContents = zipEntry.getData();
     // console.log('File Name: ', zipEntry.entryName);

     if ((zipEntry.entryName.includes("js/config.js"))) {
      // console.log("Kinesis Stream name :%s",event.ResourceProperties.KinesisStreamName);

      fileContents = fileContents.toString().replace('DELIVERY_STREAM_NAME', event.ResourceProperties.DeliveryStreamName);
      fileContents = fileContents.replace('PLAYER_SUMMARY_ENDPOINT', event.ResourceProperties.PlayerSummaryEndpoint);
      fileContents = fileContents.replace('ANSWER_SUMMARY_ENDPOINT', event.ResourceProperties.AnswerSummaryEndpoint);
      fileContents = fileContents.replace('PLAYBACK_URL', Playback_URL);
     }

     S3.putObject({
       // ACL: 'public-read',
       Body: fileContents,
       Bucket: SourceBucket,
       Key: UIPrefix + "/" + zipEntry.entryName,
       // Key: zipEntry.entryName,
       ContentType: mimeType
      }).promise()
      .catch(() => { console.log("Exception while uploading the file into S3 bucket") });
    }
   });
   console.log("Done uploading UI");
   // return new Promise((resolve, reject) => { // (*)
   //  resolve('Done uploading UI');
   // });
  });
}

// Send response to the pre-signed S3 URL
function sendResponse(event, context, responseStatus, responseData) {

 let responseBody = JSON.stringify({
  Status: responseStatus,
  Reason: "See the details in CloudWatch Log Stream: " + context.logStreamName,
  PhysicalResourceId: context.logStreamName,
  StackId: event.StackId,
  RequestId: event.RequestId,
  LogicalResourceId: event.LogicalResourceId,
  Data: responseData
 });

 console.log("RESPONSE BODY:\n", responseBody);

 let parsedUrl = url.parse(event.ResponseURL);
 let options = {
  hostname: parsedUrl.hostname,
  port: 443,
  path: parsedUrl.path,
  method: "PUT",
  headers: {
   "content-type": "",
   "content-length": responseBody.length
  }
 };

 console.log("SENDING RESPONSE...\n");

 let request = https.request(options, function(response) {
  console.log("STATUS: " + response.statusCode);
  console.log("HEADERS: " + JSON.stringify(response.headers));
  // Tell AWS Lambda that the function execution is done
  // context.done();
 });

 request.on("error", function(error) {
  console.log("sendResponse Error:" + error);
  // Tell AWS Lambda that the function execution is done
  // context.done();
 });

 // write data to request body
 request.write(responseBody);
 request.end();
}
