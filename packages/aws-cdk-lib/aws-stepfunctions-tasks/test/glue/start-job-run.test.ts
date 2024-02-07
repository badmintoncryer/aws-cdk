import { WorkerType } from '../../../../@aws-cdk/aws-glue-alpha/lib';
import { Match, Template } from '../../../assertions';
import * as sfn from '../../../aws-stepfunctions';
import { Duration, Stack } from '../../../core';
import * as tasks from '../../lib';
import { GlueStartJobRun } from '../../lib/glue/start-job-run';

const glueJobName = 'GlueJob';
let stack: Stack;
beforeEach(() => {
  stack = new Stack();
});

test('Invoke glue job with just job ARN', () => {
  const task = new GlueStartJobRun(stack, 'Task', {
    glueJobName,
  });
  new sfn.StateMachine(stack, 'SM', {
    definitionBody: sfn.DefinitionBody.fromChainable(task),
  });

  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: {
      'Fn::Join': [
        '',
        [
          'arn:',
          {
            Ref: 'AWS::Partition',
          },
          ':states:::glue:startJobRun',
        ],
      ],
    },
    End: true,
    Parameters: {
      JobName: glueJobName,
    },
  });
});

test('Invoke glue job with full properties', () => {
  const jobArguments = {
    key: 'value',
  };
  const timeoutMinutes = 1440;
  const glueJobTimeout = Duration.minutes(timeoutMinutes);
  const securityConfiguration = 'securityConfiguration';
  const notifyDelayAfterMinutes = 10;
  const notifyDelayAfter = Duration.minutes(notifyDelayAfterMinutes);
  const task = new GlueStartJobRun(stack, 'Task', {
    glueJobName,
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    arguments: sfn.TaskInput.fromObject(jobArguments),
    taskTimeout: sfn.Timeout.duration(glueJobTimeout),
    securityConfiguration,
    notifyDelayAfter,
    workerType: WorkerType.G_2X,
    numberOfWorkers: 10,
  });
  new sfn.StateMachine(stack, 'SM', {
    definitionBody: sfn.DefinitionBody.fromChainable(task),
  });

  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: {
      'Fn::Join': [
        '',
        [
          'arn:',
          {
            Ref: 'AWS::Partition',
          },
          ':states:::glue:startJobRun.sync',
        ],
      ],
    },
    End: true,
    Parameters: {
      JobName: glueJobName,
      Arguments: jobArguments,
      Timeout: timeoutMinutes,
      SecurityConfiguration: securityConfiguration,
      NotificationProperty: {
        NotifyDelayAfter: notifyDelayAfterMinutes,
      },
      NumberOfWorkers: 10,
      WorkerType: 'G.2X',
    },
  });
});

test('Invoke glue job with Timeout.at()', () => {
  const task = new GlueStartJobRun(stack, 'Task', {
    glueJobName,
    taskTimeout: sfn.Timeout.at('$.timeout'),
  });
  new sfn.StateMachine(stack, 'SM', {
    definitionBody: sfn.DefinitionBody.fromChainable(task),
  });

  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: {
      'Fn::Join': [
        '',
        [
          'arn:',
          {
            Ref: 'AWS::Partition',
          },
          ':states:::glue:startJobRun',
        ],
      ],
    },
    End: true,
    Parameters: {
      'JobName': glueJobName,
      'Timeout.$': '$.timeout',
    },
  });
});

test('job arguments can reference state input', () => {
  const task = new GlueStartJobRun(stack, 'Task', {
    glueJobName,
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    arguments: sfn.TaskInput.fromJsonPathAt('$.input'),
  });
  new sfn.StateMachine(stack, 'SM', {
    definitionBody: sfn.DefinitionBody.fromChainable(task),
  });

  expect(stack.resolve(task.toStateJson())).toEqual({
    Type: 'Task',
    Resource: {
      'Fn::Join': [
        '',
        [
          'arn:',
          {
            Ref: 'AWS::Partition',
          },
          ':states:::glue:startJobRun.sync',
        ],
      ],
    },
    End: true,
    Parameters: {
      'JobName': glueJobName,
      'Arguments.$': '$.input',
    },
  });
});

test('permitted role actions limited to start job run if service integration pattern is REQUEST_RESPONSE', () => {
  const task = new GlueStartJobRun(stack, 'Task', {
    glueJobName,
    integrationPattern: sfn.IntegrationPattern.REQUEST_RESPONSE,
  });

  new sfn.StateMachine(stack, 'SM', {
    definitionBody: sfn.DefinitionBody.fromChainable(task),
  });

  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [Match.objectLike({
        Action: 'glue:StartJobRun',
      })],
    },
  });
});

test('permitted role actions include start, get, and stop job run if service integration pattern is RUN_JOB', () => {
  const task = new GlueStartJobRun(stack, 'Task', {
    glueJobName,
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  });

  new sfn.StateMachine(stack, 'SM', {
    definitionBody: sfn.DefinitionBody.fromChainable(task),
  });

  Template.fromStack(stack).hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [Match.objectLike({
        Action: [
          'glue:StartJobRun',
          'glue:GetJobRun',
          'glue:GetJobRuns',
          'glue:BatchStopJobRun',
        ],
      })],
    },
  });
});

test('Task throws if WAIT_FOR_TASK_TOKEN is supplied as service integration pattern', () => {
  expect(() => {
    new tasks.GlueStartJobRun(stack, 'GlueJob', {
      glueJobName,
      integrationPattern: sfn.IntegrationPattern.WAIT_FOR_TASK_TOKEN,
    });
  }).toThrow(/unsupported service integration pattern/i);
});

test.each([0, 1.2, NaN])('throw error for invalid  number of workers %s', (numberOfWorkers) => {
  expect(() => {
    new tasks.GlueStartJobRun(stack, 'GlueJob', {
      glueJobName,
      numberOfWorkers,
    });
  }).toThrow('`numberOfWorkers` must be a positive integer');
});
