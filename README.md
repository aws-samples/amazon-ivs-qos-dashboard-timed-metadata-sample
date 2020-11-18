## Amazon IVS Quality of Service Dashboard Sample

This is a sample application for use measuring the performance and audience experience for streaming video delivered via [Amazon Interactive Video Service](https://aws.amazon.com/ivs/).

This application consists of three core components:

1. an integration with the [IVS player SDK](https://docs.aws.amazon.com/ivs/latest/userguide/SWPG.html) to capture metrics recording the viewer experience while watching and interacting with video served by the IVS Player. 
2. A set of EventBridge Rules which capture events relevant to audience experience reported by the IVS service
3. A backend solution which captures, processes and presents the metrics in the form of an ElasticSearch based Dashboard which can be used to monitor and observe user experiences when watching streams served by IVS. 

## Getting Started with the Amazon IVS Quality of Service Dashboard

* [Launching the Solution](#Deployment)
* [Architecture Overview](#Architecture)
* [Building from Source](#Building)
* [Contributing](#Contributing)
* [Security](#Security)
* [License](#License)

## Deployment

### Launching solution with Pre-built AWS CloudFormation Template

The solution is deployed using an AWS CloudFormation template with AWS Lambda backed custom resources. To deploy the solution, use one of the following CloudFormation templates and follow the instructions below.

| AWS Region | AWS CloudFormation Template URL |
|:-----------|:----------------------------|
| EU (Ireland) |<a href="https://console.aws.amazon.com/cloudformation/home?region=eu-west-1#/stacks/new?stackName=ivsqos&templateURL=https%3A%2F%2Fivsqos-github-templates-eu-west-1.s3-eu-west-1.amazonaws.com%2Fqos%2Fv0.4%2Ftemplates%2Fdeployment.yaml" target="_blank">Launch stack</a> |
| US (N.Virginia) |<a href="https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks/new?stackName=ivsqos&templateURL=https%3A%2F%2Fivsqos-github-templates-us-east-1.s3.amazonaws.com%2Fqos%2Fv0.4%2Ftemplates%2Fdeployment.yaml" target="_blank">Launch stack</a> |
| US (Oregon) |<a href="https://console.aws.amazon.com/cloudformation/home?region=us-west-2#/stacks/new?stackName=ivsqos&templateURL=https%3A%2F%2Fivsqos-github-templates-us-west-2.s3-us-west-2.amazonaws.com%2Fqos%2Fv0.4%2Ftemplates%2Fdeployment.yaml" target="_blank">Launch stack</a> |

### CloudFormation Parameters

A number of parameters are available to customize the solution as a part of the CloudFormation Stack deployment process:

| Parameter | Description |
|---|---|
| DeployDemoUI | When enabled, a demo website will be deployed to S3/CloudFront with a sample video player configured to send metrics to the deployed backend. Set to 'true' by default. |
| ElasticSearchDomainArn | Enter the ARN of an AWS ElasticSearch Domain you wish to deliver metrics to for dashboarding. This is an optional setting. |
| ElasticSearchIndexName | Enter a name for the Index metrics are delivered to AWS ElasticSearch under. Set to 'player_summary' by default. | 
| ElasticSearchIndexRotation | Set the Rotation Interval for the ElasticSearch Index. Set to NoRotation by default. | 
| PlaybackURL | The URL listed here is used as the source of video for the DemoUI deployed as part of the DeployDemoUI Parameter. By default this is a public sample stream. Set this to the Playback URL of your own IVS channel to configure the Demo UI to use your own IVS stream. | 
| PushToElasticSearch | When enabled, metrics will be delivered to the AWS ElasticSearch domain using the settings configured in other ElasticSearch parameters specified. Set to 'false' by default. |

### Post Deployment

Once the CloudFormation template is deployed, navigate to the Output tab in CloudFormation as several settings are emitted here and will be used elsewhere. You can open the demo app by clicking on the PlayerURL link.

After the CloudFormation deployment completes, the backend infrastructure is configured to capture metrics from the video player and IVS backend. Three dashboarding options are available to visualize these metrics, however these are not enabled by default. 

To enable a dashboard in your preferred platform, please see the following guides:

### ElasticSearch Dashboards

ElasticSearch is a popular tool for building dynamic dashboards using its Kibana component. ElasticSearch offers a good balance between visualization of data with low latency, and ease of exploration. 

If you set the PushToElasticSearch parameter to 'true' when deploying the CloudFormation template, see the [ElasticSearch Guide](./docs/elasticsearch.md) for detailed guidance on how to build the sample Dashboards within AWS ElasticSearch. 


### Enabling CloudWatch Dashboards

Operational metrics can be delivered to CloudWatch for use in monitoring and alarming streams within the AWS Management Console. Generation of these metrics is performed by an Amazon Kinesis Data Analytics application which is deployed into your account but must be enabled in order for CloudWatch metrics to start to be generated. 

Please see the [CloudWatch Dashboards Guide](./docs/cloudwatch-dashboards.md) for next steps on enabling Cloudwatch Dashboards. 




## Architecture

Captured metrics are delivered to AWS via API Gateway and Kinesis Firehose. Kinesis Firehose delivers the metrics to three destinations which can be used for exploration and to visualize the viewer experience

* A Data Lake built on Amazon S3 and integrated with AWS Glue and Athena. Data stored in this location can be visualized using Amazon QuickSight.
* Real time sliding window analysis is performed by Amazon Kinesis Analytics. Metrics calculated by this application are delivered to CloudWatch as metrics which can be used for operational dashboards and monitoring.
* Optionally, metrics can also be delivered to an AWS ElasticSearch cluster for both near-real time and long-tail analysis using Kibana.

### High level solution components
![Solution Components](./docs/images/solution_components.png)

### Backend Architecture
![Backend Architecture](./docs/images/qos_architecture.jpg)

### Metrics Description

For more information on the metrics captured, please see [Metrics Overview](./docs/metrics-overview.md)

## Building

If you wish to rebuild this application so that you can customize or further develop for your own use-case, follow these steps:

### Build Pre-requisites

Building this project requires the following dependencies to be installed on your build/development system:

- make
- Docker
- AWS CLI (https://aws.amazon.com/cli/)

### Build Instructions

1. Copy the ``Makefile.sample`` and edit the variables in the top section to define the appropriate resources in the AWS account you wish to deploy this to
2. Save the file with the name: ``Makefile``
3. To create the S3 bucket to store the build artifacts, run the command:

``make creates3``

4. To build the artifacts and Cloudformation template to deploy the solution, run the command:

``make all``

This command will run through a series of steps to package and build a custom version of the solution. The process will upload artefacts required for deployment, including Lambda function code and the final CloudFormation template, to the S3 bucket created in step 3.

5. After the build process completes, you will find a CloudFormation template ```deployment.yaml``` in the ```templates/``` folder. Deploy this via CloudFormation to deploy your build of the solution. 

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md).

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information on how to report any security related concerns.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
