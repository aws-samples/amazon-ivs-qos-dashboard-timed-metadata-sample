## Amazon IVS Quality of Service Dashboard Sample

This is a sample application for use measuring the performance and audience experience for streaming video delivered via Amazon Interactive Video Service. 

This application deploys an integration with the IVS player SDK to capture metrics from stream viewers capturing their experience over time. 

Captured metrics are processed and presented as both CloudWatch metrics and archived in a Data Lake where they can be reported on via QuickSight or ElasticSearch. 

## Architecture

include architecture diagram

## Build Pre-requisites

Building this project requires the following dependencies to be installed on your build/development system:

- make
- Docker
- AWS CLI

## Build Instructions

1. Copy the Makefile.sample and edit the variables in the top section to define the appropriate resources in the AWS account you wish to deploy this to
2. Save the file with the name: Makefile
3. To create the S3 bucket to store the build artefacts, run the command:
make creates3
4. To build the artifacts and Cloudformation template to deploy the solution, run the command:
make all

## Deployment

Once the solution has been built you can deploy it either from the S3 bucket the template is uploaded, or by deploying the template in the location: cloudformation/deployment.yaml

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

