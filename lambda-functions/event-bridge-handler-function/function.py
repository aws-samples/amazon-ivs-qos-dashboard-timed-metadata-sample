from __future__ import print_function
import json
import boto3
import os
import time
ssm = boto3.client('ssm')

startvation_prefix = "STARVATION/"
concurrency_key = "CHANNEL_CONCURRENCY"

def normalise_string(str):
    return str.replace(" ", "_").upper()

def handler(event, context):
    # TODO implement
    print("Event :{}".format(event))

    metric_type = normalise_string(event["detail"]["event_name"])

    #array to hold multiple events
    container = []
    #to hold the event attributes
    live_count = 0

    # if the event is for status update we just need to send the current channel concurrency
    if(metric_type == "STATUS_UPDATE"):
        live_count = get_channnel_concurrency()
        container.append(prepare_concurrency_metric(live_count))
        print("STATUS_UPDATE container :{}".format(container))
        return container

    # for other possible events we compute concurrency, starvation time, broadcast time and fire the event types

    channel_name = parse_channel_name(event["resources"][0])

    payload = {}
    payload['metric_type'] = metric_type
    payload['channel_watched'] = channel_name
    payload['region'] = event["region"]

    print("Channel Name :%{}", channel_name)
    print("metricType :{}".format(metric_type))

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
    payload['metric_type'] = concurrency_key
    payload['channel_count'] = live_count
    return payload

# status specifies whether we need to increment the concurrency count or decrement it
def update_channel_concurrency(increment):
    concurrency = get_channnel_concurrency()

    if(increment):
        live_count = concurrency + 1
    else:
        live_count = max(concurrency - 1,0)
    put_metric(concurrency_key,live_count)
    return live_count

def get_channnel_concurrency():
    concurrency = int(get_metric(concurrency_key))
    return concurrency

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
