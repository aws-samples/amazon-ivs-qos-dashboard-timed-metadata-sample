from __future__ import print_function
import json
import boto3
import os
import time
ssm = boto3.client('ssm')

startvation_prefix = "STARVATION/"

def normalise_string(str):
    return str.replace(" ", "_").upper()

def handler(event, context):
    # TODO implement
    print("Event :{}".format(event))

    metric_type = normalise_string(event["detail"]["event_name"])
    channel_name = parse_channel_name(event["resources"][0])
    print("Channel Name :%{}", channel_name)
    print("metricType :{}".format(metric_type))

    #array to hold multiple events
    container = []
    #to hold the event attributes
    payload = {}
    payload['metric_type'] = metric_type
    payload['channel_watched'] = channel_name
    payload['region'] = event["region"]
    live_count = 0

    if(metric_type == "STREAM_START"):
        put_metric(channel_name, int(time.time()))
        live_count = update_channel_concurrency(True)
        container.append(prepare_concurrency_metric(live_count))
        # return Promise.resolve(event);
    elif(metric_type == "STREAM_END"):
        current_time = int(time.time())
        value = get_metric(channel_name)
        if(int(value) == 0):
            duration = int(value)
        else:
            duration = current_time - int(value)
        payload['duration'] = duration
        live_count = update_channel_concurrency(False)
        container.append(prepare_concurrency_metric(live_count))
        delete_metric(channel_name)
        print(event)
    elif(metric_type == "STARVATION_START"):
        put_metric(startvation_prefix+channel_name, int(time.time()))
    elif(metric_type == "STARVATION_END"):
        current_time = int(time.time())
        value = get_metric(startvation_prefix+channel_name)
        if(int(value) == 0):
            duration = int(value)
        else:
            duration = current_time - int(value)
        payload['duration'] = duration
        delete_metric(startvation_prefix+channel_name)
        print(event)

    container.append(payload)
    return container

# prepare channel concurrency event
def prepare_concurrency_metric(live_count):
    payload = {}
    payload['metric_type'] = "CHANNEL_CONCURRENCY"
    payload['channel_count'] = live_count
    return payload

# status specifies whether we need to increment the concurrency count or decrement it
def update_channel_concurrency(status):
    concurrency_key = "CONCURRENCY"
    if(status):
        live_count = int(get_metric(concurrency_key)) + 1
    else:
        live_count = max(int(get_metric(concurrency_key)) - 1,0)
    put_metric(concurrency_key,live_count)
    return live_count

def parse_channel_name(arn_str):
    return arn_str[arn_str.rfind("/") + 1:]

def put_metric(key,value):
    print("")
    ssm.put_parameter(
        Name=prepare_key_name(key),
        Value='{}'.format(value),
        Overwrite=True,
        Tier='Standard',
        Type='String'
    )

#get the value of the key (timestamp) from SSM
def get_metric(key):
    try:
        param = ssm.get_parameter(Name=prepare_key_name(key))
        return param["Parameter"]["Value"]
    except:
        return '0';

#delete the channel start time once we have computed the channel duration triggered by STREAM_END event
def delete_metric(key):
    try:
        ssm.delete_parameter(Name=prepare_key_name(key))
    except:
        print("Parameter not found")

#prepare key name consistently
def prepare_key_name(key):
    return "/IVSQoS/CHANNEL/"+key
