'use strict';

const AWS = require('aws-sdk');
let region = process.env.AWS_REGION;
// Create CloudWatch service object
var cw = new AWS.CloudWatch({ apiVersion: '2010-08-01' });

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

        cw.putMetricData(params, function(err, data) {
            if (err) {
                console.log("Error", err);
            }
            else {
                console.log("Success put metric in CW", JSON.stringify(data));
            }
        });

        return {
            recordId: record.recordId,
            result: 'Ok',
        };
    });

    callback(null, {
        records: output,
    });
};
