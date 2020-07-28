'use strict';
/**
 * This shows how to use standard Apollo client on Node.js
 */
/**
 * This shows how to use standard Apollo client on Node.js
 */

require('es6-promise').polyfill();
require('isomorphic-fetch');
const URL = require('url');
const AWS = require('aws-sdk');
var path = require('path');
let region = process.env.AWS_REGION;
// Create CloudWatch service object
var cw = new AWS.CloudWatch({ apiVersion: '2010-08-01' });
var ivs = new AWS.IVS();

/* == Globals == */
var esDomain = {
    region: region,
    endpoint: 'search-quizanswerdomain-ii3n6jopm6ya3zfmnhxgxam6oq.eu-west-1.es.amazonaws.com',
    index: 'quiz_summary',
    doctype: 'question'
};
var endpoint = new AWS.Endpoint(esDomain.endpoint);
/*
 * The AWS credentials are picked up from the environment.
 * They belong to the IAM role assigned to the Lambda function.
 * Since the ES requests are signed using these credentials,
 * make sure to apply a policy that allows ES domain operations
 * to the role.
 */
var creds = new AWS.EnvironmentCredentials('AWS');
const auth = "Basic " + new Buffer('admin' + ":" + 'Admin@123').toString("base64");

const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT;
const DASHBOARD_NAME = process.env.DASHBOARD_NAME;

console.log('Loading function');
exports.handler = (event, context, callback) => {
    let success = 0;
    let failure = 0;
    console.log("Event :%j", event);

    const output = event.records.map((record) => {
        /* Data is base64 encoded, so decode here */
        console.log("record :%j", record);
        const recordData = Buffer.from(record.data, 'base64');
        const jsonData = JSON.parse(recordData);
        console.log("data :%j", jsonData);

        // const uri = URL.parse(GRAPHQL_ENDPOINT);
        // console.log(uri.href);
        // console.log("Region ", process.env.AWS_REGION);

        // postToES(JSON.stringify(jsonData), context);

        // Create parameters JSON for putMetricData
        // var params = {
        //     MetricData: [{
        //         MetricName: jsonData.QUESTION.trim(),
        //         Dimensions: [
        //         //     {
        //         //     Name: 'ChannelName',
        //         //     Value: jsonData.CHANNEL_WATCHED,
        //         // },
        //         {
        //             Name: 'Answer',
        //             Value: jsonData.ANSWER.trim()
        //         } ],
        //         // 'Timestamp': new Date().toISOString(),
        //         Unit: 'Count',
        //         Value: jsonData.SUMMARY
        //     }, ],
        //     Namespace: DASHBOARD_NAME+'/QuizSummary'
        // };

        console.log("Creds :%j",AWS.config.credentials);

        let payload = {
          channelArn: "arn:aws:ivs:eu-west-1:444603092185:channel/tbHb69cdvlbk",
          metadata:jsonData
        };

        // const uri = URL.parse("https://ivs.eu-west-1.amazonaws.com/PutMetadata");
        //     console.log(uri.href);
        //     console.log("Region ",process.env.AWS_REGION);
        //     const httpRequest = new AWS.HttpRequest(uri.href, process.env.AWS_REGION);
        //     httpRequest.headers.host = uri.host;
        //     httpRequest.headers['Content-Type'] = 'application/json';
        //     httpRequest.method = 'POST';
        //     httpRequest.body = JSON.stringify(payload);
        //     console.log("Body :%j",httpRequest.body);
        //
        //     AWS.config.credentials.get(err => {
        //         const signer = new AWS.Signers.V4(httpRequest, "ivs", true);
        //         signer.addAuthorization(AWS.config.credentials, AWS.util.date.getDate());
        //
        //         const options = {
        //             method: httpRequest.method,
        //             body: httpRequest.body,
        //             headers: httpRequest.headers
        //         };
        //
        //         fetch(uri.href, options)
        //             .then(res => res.json())
        //             .then(json => {
        //                 console.log(`JSON Response = ${JSON.stringify(json, null, 2)}`);
        //                 callback(null, event);
        //             })
        //             .catch(err => {
        //                 console.error(`FETCH ERROR: ${JSON.stringify(err, null, 2)}`);
        //                 callback(err);
        //             });
        //     });
//         var params = {
//   DashboardName: 'sfqos4-QoS-QuizSummaryDashboard' /* required */
// };
// cw.getDashboard(params, function(err, data) {
//   if (err) console.log(err, err.stack); // an error occurred
//   else     console.log("dashboard :%j",data);           // successful response
// });

        // cw.putMetricData(params, function(err, data) {
        //     if (err) {
        //         console.log("Error", err);
        //     }
        //     else {
        //         console.log("Success put metric in CW", JSON.stringify(data));
        //     }
        // });

        return {
            recordId: record.recordId,
            result: 'Ok',
        };
    });

    callback(null, {
        records: output,
    });
};
//
// function postToES(doc, context) {
//     console.log("In postToES :%s",doc);
//     var req = new AWS.HttpRequest(endpoint);
//
//     req.method = 'POST';
//     req.path = path.join('/', esDomain.index, esDomain.doctype);
//     req.region = esDomain.region;
//     req.headers['presigned-expires'] = false;
//     req.headers['Host'] = endpoint.host;
//     req.headers['Content-type'] = "application/json";
//     req.headers['Authorization'] =  auth;
//
//     req.body = doc;
//
//     // var signer = new AWS.Signers.V4(req , 'es');  // es: service code
//     // signer.addAuthorization(creds, new Date());
//
//     var send = new AWS.NodeHttpClient();
//     send.handleRequest(req, null, function(httpResp) {
//         var respBody = '';
//         httpResp.on('data', function (chunk) {
//             respBody += chunk;
//         });
//         httpResp.on('end', function (chunk) {
//             console.log('Response: ' + respBody);
//             // context.succeed('Lambda added document ' + doc);
//         });
//     }, function(err) {
//         console.log('Error in lambda : ' + err);
//         // context.fail('Lambda failed with error ' + err);
//     });
// }
