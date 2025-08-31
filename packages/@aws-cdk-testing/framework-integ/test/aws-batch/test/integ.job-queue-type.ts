import * as batch from 'aws-cdk-lib/aws-batch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as cdk from 'aws-cdk-lib';
import { IntegTest, ExpectedResult } from '@aws-cdk/integ-tests-alpha';

class JobQueueTypeStack extends cdk.Stack {
  public readonly ec2ComputeEnvironment: batch.ManagedEc2EcsComputeEnvironment;
  public readonly fargateComputeEnvironment: batch.FargateComputeEnvironment;
  public readonly ec2JobQueue: batch.JobQueue;
  public readonly fargateJobQueue: batch.JobQueue;
  public readonly ec2JobDefinition: batch.EcsJobDefinition;
  public readonly fargateJobDefinition: batch.EcsJobDefinition;

  constructor(scope: cdk.App, id: string, props: cdk.StackProps = {}) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
    });

    this.ec2ComputeEnvironment = new batch.ManagedEc2EcsComputeEnvironment(this, 'ComputeEnv', {
      vpc,
      instanceTypes: [ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.LARGE)],
      minvCpus: 0,
      maxvCpus: 256,
    });

    this.ec2JobQueue = new batch.JobQueue(this, 'JobQueue', {
      computeEnvironments: [
        {
          order: 1,
          computeEnvironment: this.ec2ComputeEnvironment,
        },
      ],
      type: batch.JobQueueType.ECS,
    });

    this.ec2JobDefinition = new batch.EcsJobDefinition(this, 'EcsExecEc2JobDefinition', {
      jobDefinitionName: 'EcsExecEc2TestJob',
      container: new batch.EcsEc2ContainerDefinition(this, 'Ec2Container', {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/amazonlinux/amazonlinux:latest'),
        cpu: 2,
        memory: cdk.Size.mebibytes(2048),
        command: ['sh', '-c', 'echo "Job started with ECS Exec enabled"; sleep 300'], // Keep container running
      }),
    });

    this.fargateJobDefinition = new batch.EcsJobDefinition(this, 'EcsExecFargateJobDefinition', {
      container: new batch.EcsFargateContainerDefinition(this, 'FargateContainer', {
        image: ecs.ContainerImage.fromRegistry('public.ecr.aws/amazonlinux/amazonlinux:latest'),
        cpu: 0.25,
        memory: cdk.Size.gibibytes(1),
        command: ['sh', '-c', 'echo "Fargate Job started with ECS Exec enabled"; sleep 300'], // Keep container running
      }),
    });

    // Create Fargate compute environment
    this.fargateComputeEnvironment = new batch.FargateComputeEnvironment(this, 'FargateComputeEnv', {
      vpc,
    });

    this.fargateJobQueue = new batch.JobQueue(this, 'FargateJobQueue', {
      computeEnvironments: [
        {
          order: 1,
          computeEnvironment: this.fargateComputeEnvironment,
        },
      ],
      type: batch.JobQueueType.ECS_FARGATE,
    });
  }
}

const app = new cdk.App();
const stack = new JobQueueTypeStack(app, 'JobQueueTypeStack');

const integ = new IntegTest(app, 'JobQueueTypeStackInteg', {
  testCases: [stack],
});

function testEcsExecForJob(
  jobName: string,
  jobQueue: batch.JobQueue,
  jobDefinition: batch.EcsJobDefinition,
) {
  // Submit the job
  const submitJobResult = integ.assertions.awsApiCall('Batch', 'submitJob', {
    jobName,
    jobQueue: jobQueue.jobQueueArn,
    jobDefinition: jobDefinition.jobDefinitionArn,
  });

  // Get the job ID from the submit response
  const jobId = submitJobResult.getAttString('jobId');

  // Wait for job to reach RUNNING state and have a task ARN
  integ.assertions.awsApiCall('Batch', 'describeJobs', {
    jobs: [jobId],
  }).assertAtPath('jobs.0.status', ExpectedResult.stringLikeRegexp('RUNNING'))
    .waitForAssertions({
      totalTimeout: cdk.Duration.minutes(10),
      interval: cdk.Duration.seconds(30),
    });
}

// Test EC2 job
testEcsExecForJob(
  'test-ecs-exec-ec2-job',
  stack.ec2JobQueue,
  stack.ec2JobDefinition,
);

// Test Fargate job
testEcsExecForJob(
  'test-ecs-exec-fargate-job',
  stack.fargateJobQueue,
  stack.fargateJobDefinition,
);
