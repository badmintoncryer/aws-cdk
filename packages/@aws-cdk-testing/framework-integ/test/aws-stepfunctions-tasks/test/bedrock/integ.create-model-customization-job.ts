import * as bedrock from 'aws-cdk-lib/aws-bedrock';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import { BedrockCreateModelCustomizationJob, CustomizationType } from 'aws-cdk-lib/aws-stepfunctions-tasks';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-stepfunctions-tasks-bedrock-invoke-model-integ');

const vpc = new ec2.Vpc(stack, 'Vpc', {
  natGateways: 0,
  subnetConfiguration: [
    {
      cidrMask: 24,
      name: 'Private',
      subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    },
  ],
});

const model = bedrock.FoundationModel.fromFoundationModelId(
  stack,
  'Model',
  bedrock.FoundationModelIdentifier.AMAZON_TITAN_TEXT_G1_EXPRESS_V1,
);

const outputBucket = new s3.Bucket(stack, 'OutputBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
const trainingBucket = new s3.Bucket(stack, 'TrainingBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});
const validationBucket = new s3.Bucket(stack, 'ValidationBucket', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const kmsKey = new kms.Key(stack, 'KmsKey', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const taskConfig = {
  baseModel: model,
  clientRequestToken: 'MyToken',
  customizationType: CustomizationType.FINE_TUNING,
  kmsKey,
  customModelName: 'MyCustomModel',
  customModelTags: [{ key: 'key1', value: 'value1' }],
  hyperParameters: {
    batchSize: '10',
  },
  jobName: 'MyCustomizationJob',
  jobTags: [{ key: 'key2', value: 'value2' }],
  outputDataS3Uri: outputBucket.s3UrlForObject(),
  trainingDataS3Uri: trainingBucket.s3UrlForObject(),
  validationDataS3Uri: [validationBucket.s3UrlForObject()],
  vpcConfig: {
    securityGroups: [new ec2.SecurityGroup(stack, 'SecurityGroup', { vpc })],
    subnets: vpc.isolatedSubnets,
  },
};

const task1 = new BedrockCreateModelCustomizationJob(stack, 'CreateModelCustomizationJob1', taskConfig);

const task2 = new BedrockCreateModelCustomizationJob(stack, 'CreateModelCustomizationJob2', {
  ...taskConfig,
  clientRequestToken: 'MyToken2',
  customModelName: 'MyCustomModel2',
  jobName: 'MyCustomizationJob2',
  integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  vpcConfig: undefined,
});

const chain = sfn.Chain
  .start(new sfn.Pass(stack, 'Start'))
  .next(task1)
  .next(task2)
  .next(new sfn.Pass(stack, 'Done'));

new sfn.StateMachine(stack, 'StateMachine', {
  definitionBody: sfn.DefinitionBody.fromChainable(chain),
  timeout: cdk.Duration.seconds(30),
});

new IntegTest(app, 'InvokeModel', {
  testCases: [stack],
});

app.synth();
