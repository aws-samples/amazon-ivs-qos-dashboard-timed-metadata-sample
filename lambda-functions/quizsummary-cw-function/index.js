'use strict';
/**
 * This shows how to use standard Apollo client on Node.js
 */
/**
 * This shows how to use standard Apollo client on Node.js
 */

require('es6-promise').polyfill();
require('isomorphic-fetch');
const AWS = require('aws-sdk');
let region = process.env.AWS_REGION;
// Create CloudWatch service object
var cw = new AWS.CloudWatch({ apiVersion: '2010-08-01' });
var path = require('path');

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

        console.log("Region ", process.env.AWS_REGION);

        // postToES(JSON.stringify(jsonData), context);

        // Create parameters JSON for putMetricData
        var params = {
            MetricData: [{
                MetricName: jsonData.QUESTION.trim(),
                Dimensions: [
                //     {
                //     Name: 'ChannelName',
                //     Value: jsonData.CHANNEL_WATCHED,
                // },
                {
                    Name: 'Answer',
                    Value: jsonData.ANSWER.trim()
                } ],
                // 'Timestamp': new Date().toISOString(),
                Unit: 'Count',
                Value: jsonData.SUMMARY
            }, ],
            Namespace: DASHBOARD_NAME+'/QuizSummary'
        };

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
