from __future__ import print_function

import base64
import boto3
import os
from jsonschema import validate
import json
from ast import literal_eval

print('Loading function')
s3 = boto3.client('s3')
bucket_name = os.environ['BUCKET_VALIDATION_DEFS']
file_name = os.environ['BUCKET_VALIDATION_FILE']

def get_validation_schema():
    schema = {
        "type": "object",
        "properties": {
            "metric_type": {"type": "string"},
            "error_count": {"type": "number"},
            "playing_time_ms": {"type": "number"},
            "is_live": {"type": "boolean"},
            "client_platform": {"type": "string"},
            "channel_watched": {"type": "string"},
            "buffering_time_ms": {"type": "integer"},
            "rendition_name": {"type": "string"},
            "rendition_height": {"type": "integer"},
            "startup_latency_ms": {"type": "integer"},
            "live_latency_ms": {"type": "integer"},
            "event_time": {"type": "integer"}
        },
        "required": ["metric_type","event_time"]
    }
    return json.loads(json.dumps(schema))

def handler(event, context):

    output = []
    schema = get_validation_schema()
    for record in event['records']:
        payload = base64.b64decode(record['data'])
        # print(payload)
        payload1 = payload.decode("utf-8")
        # print(payload1)
        jsonData = json.loads(payload1)
        # validate it
        try:
            validate(instance=jsonData, schema=schema)
            print("Record valid {}".format(jsonData))
            output_record = {
                'recordId': record['recordId'],
                'result': 'Ok',
                'data': record['data']
            }
        except Exception as e:
            print("Record invalid {}".format(jsonData))
            print(e)
            output_record = {
                'recordId': record['recordId'],
                'result': 'ProcessingFailed',
                'data': record['data']
            }
        output.append(output_record)

    print('Successfully processed {} records.'.format(len(event['records'])))

    return {'records': output}
