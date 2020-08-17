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
        "$schema": "http://json-schema.org/schema#",
        "type": "object",
        "properties": {
            "metric_type": {"type": "string"},
            "client_platform": {"type": "string"},
            "channel_watched": {"type": "string"},
            "is_live": {"type": "boolean"},
            "error_count": {"type": "integer"},
            "playing_time_ms": {"type": "integer"},
            "buffering_time_ms": {"type": "integer"},
            "rendition_name": {"type": "string"},
            "rendition_height": {"type": "integer"},
            "startup_latency_ms": {"type": "integer"},
            "live_latency_ms": {"type": "integer"},
            "event_time": {"type": "integer"}
        },
        "required": ["metric_type"],
    }
    return json.loads(json.dumps(schema))

def handler(event, context):

    output = []
    schema = get_validation_schema()
    for record in event['records']:
        print(record)
        payload = base64.b64decode(record['data'])
        payload = payload.decode('utf8')
        payload = json.dumps(payload)
        print(payload)
        payload = json.loads(payload)
        # print(payload)
        try:
            validate(instance=payload, schema=schema)
            print("Successfully validated")
            output_record = {
                'recordId': record['recordId'],
                'result': 'Ok',
                'data': record['data']
            }
        except Exception as e:
            print(e)
            output_record = {
                'recordId': record['recordId'],
                'result': 'ProcessingFailed',
                'data': record['data']
            }
        # print('Validation result {}'.format(result))
        # Do custom processing on the payload here

        # output_record = {
        #     'recordId': record['recordId'],
        #     'result': 'Ok',
        #     'data': base64.b64encode(payload)
        # }
        output.append(output_record)

    print('Successfully processed {} records.'.format(len(event['records'])))

    return {'records': output}
