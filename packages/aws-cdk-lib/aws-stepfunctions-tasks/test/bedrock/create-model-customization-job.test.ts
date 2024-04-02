import { Template } from '../../../assertions';
import * as bedrock from '../../../aws-bedrock';
import * as ec2 from '../../../aws-ec2';
import * as iam from '../../../aws-iam';
import * as kms from '../../../aws-kms';
import * as sfn from '../../../aws-stepfunctions';
import * as cdk from '../../../core';
import { BedrockCreateModelCustomizationJob, CustomizationType } from '../../lib/bedrock/create-model-customization-job';

describe('create model customization job', () => {
  test('default settings', () => {
    // GIVEN
    const stack = new cdk.Stack();

    // WHEN
    const task = new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    });

    new sfn.StateMachine(stack, 'StateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(
        sfn.Chain
          .start(new sfn.Pass(stack, 'Start'))
          .next(task)
          .next(new sfn.Pass(stack, 'Done')),
      ),
      timeout: cdk.Duration.seconds(30),
    });

    // THEN
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
            ':states:::bedrock:createModelCustomizationJob',
          ],
        ],
      },
      Next: 'Done',
      Parameters: {
        BaseModelIdentifier: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':bedrock:',
              {
                Ref: 'AWS::Region',
              },
              '::foundation-model/anthropic.claude-instant-v1',
            ],
          ],
        },
        CustomModelName: 'custom-model',
        JobName: 'job-name',
        OutputDataConfig: {
          S3Uri: 's3://output-data',
        },
        RoleArn: {
          'Fn::GetAtt': [
            'InvokeBedrockRole4E197628',
            'Arn',
          ],
        },
        TrainingDataConfig: {
          S3Uri: 's3://training-data',
        },
        ValidationDataConfig: {
          Validators: [{ S3Uri: 's3://validation-data' }],
        },
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'bedrock.amazonaws.com',
            },
          },
        ],
        Version: '2012-10-17',
      },
      Policies: [
        {
          PolicyDocument: {
            Statement: [
              {
                Action: 's3:GetObject',
                Effect: 'Allow',
                Resource: [
                  {
                    'Fn::Join': [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':s3:::training-data',
                      ],
                    ],
                  },
                  {
                    'Fn::Join': [
                      '',
                      [
                        'arn:',
                        {
                          Ref: 'AWS::Partition',
                        },
                        ':s3:::validation-data',
                      ],
                    ],
                  },
                ],
              },
              {
                Action: 's3:PutObject',
                Effect: 'Allow',
                Resource: {
                  'Fn::Join': [
                    '',
                    [
                      'arn:',
                      {
                        Ref: 'AWS::Partition',
                      },
                      ':s3:::output-data',
                    ],
                  ],
                },
              },
            ],
            Version: '2012-10-17',
          },
          PolicyName: 'BedrockCreateModelCustomizationJob',
        },
      ],
    });
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: {
                'Fn::FindInMap': [
                  'ServiceprincipalMap',
                  {
                    Ref: 'AWS::Region',
                  },
                  'states',
                ],
              },
            },
          },
        ],
        Version: '2012-10-17',
      },
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'bedrock:CreateModelCustomizationJob',
              'bedrock:TagResource',
            ],
            Effect: 'Allow',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':bedrock:',
                    {
                      Ref: 'AWS::Region',
                    },
                    '::foundation-model/anthropic.claude-instant-v1',
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':bedrock:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':custom-model/*',
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    'arn:',
                    {
                      Ref: 'AWS::Partition',
                    },
                    ':bedrock:',
                    {
                      Ref: 'AWS::Region',
                    },
                    ':',
                    {
                      Ref: 'AWS::AccountId',
                    },
                    ':model-customization-job/*',
                  ],
                ],
              },
            ],
          },
          {
            Action: 'iam:PassRole',
            Effect: 'Allow',
            Resource: {
              'Fn::GetAtt': [
                'InvokeBedrockRole4E197628',
                'Arn',
              ],
            },
          },
        ],
        Version: '2012-10-17',
      },
      PolicyName: 'StateMachineRoleDefaultPolicyDF1E6607',
      Roles: [
        {
          Ref: 'StateMachineRoleB840431D',
        },
      ],
    });
  });

  test('with full properties', () => {
    // GIVEN
    const stack = new cdk.Stack();
    const kmsKey = new kms.Key(stack, 'KmsKey');
    const vpc = new ec2.Vpc(stack, 'Vpc');

    // WHEN
    const task = new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      clientRequestToken: 'token',
      customizationType: CustomizationType.FINE_TUNING,
      customModelKmsKey: kmsKey,
      customModelName: 'custom-model',
      customModelTags: [{ key: 'key1', value: 'value1' }],
      hyperParameters: { key: 'value' },
      jobName: 'job-name',
      jobTags: [{ key: 'key2', value: 'value2' }],
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
      role: new iam.Role(stack, 'Role', {
        assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      }),
      vpcConfig: {
        securityGroups: [new ec2.SecurityGroup(stack, 'SecurityGroup', { vpc })],
        subnets: vpc.privateSubnets,
      },
    });

    new sfn.StateMachine(stack, 'StateMachine', {
      definitionBody: sfn.DefinitionBody.fromChainable(
        sfn.Chain
          .start(new sfn.Pass(stack, 'Start'))
          .next(task)
          .next(new sfn.Pass(stack, 'Done')),
      ),
      timeout: cdk.Duration.seconds(30),
    });

    // THEN
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
            ':states:::bedrock:createModelCustomizationJob',
          ],
        ],
      },
      Next: 'Done',
      Parameters: {
        BaseModelIdentifier: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':bedrock:',
              {
                Ref: 'AWS::Region',
              },
              '::foundation-model/anthropic.claude-instant-v1',
            ],
          ],
        },
        ClientRequestToken: 'token',
        CustomizationType: 'FINE_TUNING',
        CustomModelKmsKeyId: {
          'Fn::GetAtt': [
            'KmsKey46693ADD',
            'Arn',
          ],
        },
        CustomModelName: 'custom-model',
        CustomModelTags: [{ Key: 'key1', Value: 'value1' }],
        HyperParameters: { key: 'value' },
        JobName: 'job-name',
        JobTags: [{ Key: 'key2', Value: 'value2' }],
        OutputDataConfig: {
          S3Uri: 's3://output-data',
        },
        RoleArn: {
          'Fn::GetAtt': [
            'Role1ABCC5F0',
            'Arn',
          ],
        },
        TrainingDataConfig: {
          S3Uri: 's3://training-data',
        },
        ValidationDataConfig: {
          Validators: [{ S3Uri: 's3://validation-data' }],
        },
        VpcConfig: {
          SecurityGroupIds: [
            {
              'Fn::GetAtt': [
                'SecurityGroupDD263621',
                'GroupId',
              ],
            },
          ],
          SubnetIds: [
            {
              Ref: 'VpcPrivateSubnet1Subnet536B997A',
            },
            {
              Ref: 'VpcPrivateSubnet2Subnet3788AAA1',
            },
          ],
        },
      },
    });
  });

  test.each([
    0,
    257,
  ])('throw error for invalid client request token length %s', (tokenLength) => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      clientRequestToken: 'a'.repeat(tokenLength),
      customModelName: 'custom-model',
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow(/clientRequestToken must be between 1 and 256 characters long/);
  });

  test.each([
    '-a',
    'a--',
    '_',
  ])('throw error for invalid client request token format %s', (token) => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      clientRequestToken: token,
      customModelName: 'custom-model',
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow('clientRequestToken must match the pattern /^[a-zA-Z0-9](-*[a-zA-Z0-9])*$/');
  });

  test.each([
    0,
    64,
  ])('throw error for invalid custom model name length %s', (nameLength) => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'a'.repeat(nameLength),
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow(/customModelName must be between 1 and 63 characters long/);
  });

  test.each([
    '-a',
    'a--',
    '_',
  ])('throw error for invalid custom model name format %s', (name) => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: name,
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow('customModelName must match the pattern /^([0-9a-zA-Z][_-]?)+$/');
  });

  test('throw error for invalid custom model tags length', () => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      customModelTags: Array(201).fill({ key: 'key', value: 'value' }),
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow('customModelTags must be between 0 and 200 items long');
  });

  test.each([
    0,
    64,
  ])('throw error for invalid job name length %s', (nameLength) => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      jobName: 'a'.repeat(nameLength),
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow(/jobName must be between 1 and 63 characters long/);
  });

  test.each([
    '-a',
    '_',
  ])('throw error for invalid job name format %s', (name) => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      jobName: name,
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow('jobName must match the pattern /^[a-zA-Z0-9](-*[a-zA-Z0-9\\+\\-\\.])*$/');
  });

  test('throw error for invalid job tags length', () => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      jobName: 'job-name',
      jobTags: Array(201).fill({ key: 'key', value: 'value' }),
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
    })).toThrow('jobTags must be between 0 and 200 items long');
  });

  test('throw error for invalid validation data s3 uri length', () => {
    // GIVEN
    const stack = new cdk.Stack();

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: Array(11).fill('s3://validation-data'),
    })).toThrow('validationDataS3Uri must be between 1 and 10 items long');
  });

  test('throw error for invalid securityGroups length', () => {
    // GIVEN
    const stack = new cdk.Stack();
    const vpc = new ec2.Vpc(stack, 'Vpc');

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
      vpcConfig: {
        securityGroups: Array(6).fill(new ec2.SecurityGroup(stack, 'SecurityGroup', { vpc })),
        subnets: vpc.privateSubnets,
      },
    })).toThrow('securityGroups must be between 1 and 5 items long');
  });

  test('throw error for invalid subnets length', () => {
    // GIVEN
    const stack = new cdk.Stack();
    const vpc = new ec2.Vpc(stack, 'Vpc');

    // THEN
    expect(() => new BedrockCreateModelCustomizationJob(stack, 'Invoke', {
      baseModel: bedrock.FoundationModel.fromFoundationModelId(stack, 'Model', bedrock.FoundationModelIdentifier.ANTHROPIC_CLAUDE_INSTANT_V1),
      customModelName: 'custom-model',
      jobName: 'job-name',
      outputDataS3Uri: 's3://output-data',
      trainingDataS3Uri: 's3://training-data',
      validationDataS3Uri: ['s3://validation-data'],
      vpcConfig: {
        securityGroups: [new ec2.SecurityGroup(stack, 'SecurityGroup', { vpc })],
        subnets: Array(17).fill(vpc.privateSubnets[0]),
      },
    })).toThrow('subnets must be between 1 and 16 items long');
  });
});
