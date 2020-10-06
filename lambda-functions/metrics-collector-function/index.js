'use strict';
/**
 * This shows how to use standard Apollo client on Node.js
 */
/**
 * This shows how to use standard Apollo client on Node.js
 */

const AWS = require('aws-sdk');

// Create CloudWatch service object
var cw = new AWS.CloudWatch({ apiVersion: '2010-08-01' });
var ivs = new AWS.IVS();

console.log('Loading function');
exports.handler = (event, context, callback) => {
    console.log("Event :%j", event);
    var params = {
    };
    ivs.listStreams(params, function(err, data) {
        if (err){
          console.log(err, err.stack); // an error occurred
          callback(err,"Error");
        }
        else{
          console.log(data); // successful response
          callback(null, data);
        }
    });
};
