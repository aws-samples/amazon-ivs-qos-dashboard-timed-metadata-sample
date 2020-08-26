/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
// Helper function handles the Demo UI deployment into the Source S3 bucket
// Also sets the necessary APIGW endpoint configurations for the player to start pushing the metrics
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

// upload the UI assets. Also modifies the 'js/services/configService.js' file to
// configure the deployment specific resources
// - BUCKET_URL : the S3 bucket where the redirector.json and User interface is deployed.
function uploadUIAssets(event) {
 console.log("In uploadUIAssets :%s", SourceUIFilePath);
 // get the zip file containing the Demo UI
 return S3.getObject({ Bucket: SourceFileBucket, Key: SourceUIFilePath }).promise()
  .then(data => {
   let zip = new AdmZip(data.Body);
   let zipEntries = zip.getEntries();

   // extract the zip contents in the S3 bucket
   zipEntries.forEach(function(zipEntry) {

    if (!zipEntry.isDirectory) {
     let mimeType = mime.getType(zipEntry.name.substring(zipEntry.name.lastIndexOf(".")));
     let fileContents = zipEntry.getData();
     if ((zipEntry.entryName.includes("js/config.js"))) {
      //replace the placeholder with values from the current deployment
      // fileContents = fileContents.toString().replace('DELIVERY_STREAM_NAME', event.ResourceProperties.DeliveryStreamName);
      fileContents = fileContents.toString();
      fileContents = fileContents.replace('PLAYER_SUMMARY_ENDPOINT', event.ResourceProperties.PlayerSummaryEndpoint);
      fileContents = fileContents.replace('ANSWER_SUMMARY_ENDPOINT', event.ResourceProperties.AnswerSummaryEndpoint);
      fileContents = fileContents.replace('PLAYBACK_URL', Playback_URL);
     }

     S3.putObject({
       Body: fileContents,
       Bucket: SourceBucket,
       Key: UIPrefix + "/" + zipEntry.entryName,
       ContentType: mimeType
      }).promise()
      .catch(() => { console.log("Exception while uploading the file into S3 bucket") });
    }
   });
   console.log("Done uploading UI");
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
 });

 request.on("error", function(error) {
  console.log("sendResponse Error:" + error);
 });

 // write data to request body
 request.write(responseBody);
 request.end();
}
