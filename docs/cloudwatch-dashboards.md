# Enabling Cloudwatch Dashboards

1. To enable a CloudWatch dashboard, a pre-deployed Kinesis Analytics application needs to be turned on. To do so, navigate to the Amazon Kinesis Management Console.
6. From the menu on the left, select Analytics Applications.
7. Locate the Kinesis Analytics application deployed by the stack (it will be prefixed with the Stack Name). Select this and click on "Run"
8. From the CloudFormation Output tab for the deployed stack, open the URL listed for the PlayerCWDashboard. This will take you to the CloudWatch Dashboard
9. Start streaming to your IVS stream and open the demo app. The URL for the demo app is output as PlayerURL by the CloudFormation stack.
10. Metrics will be captured and will be visible under CloudWatch within a few minutes