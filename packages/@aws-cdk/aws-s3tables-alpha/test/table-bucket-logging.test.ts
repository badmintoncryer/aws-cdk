import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as core from 'aws-cdk-lib/core';
import * as s3tables from '../lib';

/* Allow quotes in the object keys used for CloudFormation template assertions */
/* eslint-disable @stylistic/quote-props */

function acknowledgeLoggingConfigurationSchema(scope: core.Stack) {
  core.Validations.of(scope).acknowledge({
    id: 'CloudFormation-Validate::F3002',
    reason: 'LoggingConfiguration is a newly launched property not yet in the bundled schema',
  });
}

describe('TableBucket server access logs', () => {
  const TABLE_BUCKET_CFN_RESOURCE = 'AWS::S3Tables::TableBucket';
  const BUCKET_POLICY_CFN_RESOURCE = 'AWS::S3::BucketPolicy';

  let stack: core.Stack;

  beforeEach(() => {
    stack = new core.Stack(undefined, 'Stack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    acknowledgeLoggingConfigurationSchema(stack);
  });

  test('does not configure logging by default', () => {
    new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
    });

    Template.fromStack(stack).hasResourceProperties(TABLE_BUCKET_CFN_RESOURCE, {
      'LoggingConfiguration': Match.absent(),
    });
  });

  test('configures logging with default prefix and partition date source', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');
    new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
      },
    });

    Template.fromStack(stack).hasResourceProperties(TABLE_BUCKET_CFN_RESOURCE, {
      'LoggingConfiguration': {
        'TargetBucket': { 'Ref': 'LogBucketCC3B17E8' },
        'TargetPrefix': '',
        'TargetObjectKeyFormat': {
          'PartitionedPrefix': {
            'PartitionDateSource': 'EventTime',
          },
        },
      },
    });
  });

  test('configures logging with prefix and partition date source', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');
    new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
        prefix: 'table-bucket-logs/',
        partitionDateSource: s3.PartitionDateSource.DELIVERY_TIME,
      },
    });

    Template.fromStack(stack).hasResourceProperties(TABLE_BUCKET_CFN_RESOURCE, {
      'LoggingConfiguration': {
        'TargetBucket': { 'Ref': 'LogBucketCC3B17E8' },
        'TargetPrefix': 'table-bucket-logs/',
        'TargetObjectKeyFormat': {
          'PartitionedPrefix': {
            'PartitionDateSource': 'DeliveryTime',
          },
        },
      },
    });
  });

  test('grants the logging service principal permission to deliver logs to the destination bucket', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');
    new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
        prefix: 'table-bucket-logs/',
      },
    });

    Template.fromStack(stack).hasResourceProperties(BUCKET_POLICY_CFN_RESOURCE, {
      'Bucket': { 'Ref': 'LogBucketCC3B17E8' },
      'PolicyDocument': {
        'Statement': [
          {
            'Effect': 'Allow',
            'Principal': { 'Service': 'logging.s3.amazonaws.com' },
            'Action': 's3:PutObject',
            'Resource': {
              'Fn::Join': ['', [
                { 'Fn::GetAtt': ['LogBucketCC3B17E8', 'Arn'] },
                '/table-bucket-logs/*',
              ]],
            },
            'Condition': {
              'ArnLike': {
                'aws:SourceArn': {
                  'Fn::Join': ['', [
                    'arn:',
                    { 'Ref': 'AWS::Partition' },
                    ':s3tables:us-east-1:123456789012:bucket/example-table-bucket',
                  ]],
                },
              },
              'StringEquals': {
                'aws:SourceAccount': '123456789012',
              },
            },
          },
        ],
      },
    });
  });

  test('grants permission for all objects when no prefix is specified', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');
    new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
      },
    });

    Template.fromStack(stack).hasResourceProperties(BUCKET_POLICY_CFN_RESOURCE, {
      'PolicyDocument': {
        'Statement': [
          Match.objectLike({
            'Principal': { 'Service': 'logging.s3.amazonaws.com' },
            'Resource': {
              'Fn::Join': ['', [
                { 'Fn::GetAtt': ['LogBucketCC3B17E8', 'Arn'] },
                '/*',
              ]],
            },
          }),
        ],
      },
    });
  });

  test('uses the generated table bucket name in the source ARN condition', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');
    new s3tables.TableBucket(stack, 'AutoNamedTableBucket', {
      serverAccessLogs: {
        destinationBucket: logBucket,
      },
    });

    const template = Template.fromStack(stack);
    const tableBuckets = template.findResources(TABLE_BUCKET_CFN_RESOURCE);
    const generatedName = Object.values(tableBuckets)[0].Properties.TableBucketName;
    expect(generatedName).toMatch(/^stack-autonamedtablebucket-[0-9a-f]{8}$/);

    template.hasResourceProperties(BUCKET_POLICY_CFN_RESOURCE, {
      'PolicyDocument': {
        'Statement': [
          Match.objectLike({
            'Condition': Match.objectLike({
              'ArnLike': {
                'aws:SourceArn': {
                  'Fn::Join': ['', [
                    'arn:',
                    { 'Ref': 'AWS::Partition' },
                    `:s3tables:us-east-1:123456789012:bucket/${generatedName}`,
                  ]],
                },
              },
            }),
          }),
        ],
      },
    });
  });

  test('table bucket depends on the destination bucket policy', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');
    new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
      },
    });

    Template.fromStack(stack).hasResource(TABLE_BUCKET_CFN_RESOURCE, {
      'DependsOn': ['LogBucketPolicy900DBE48'],
    });
  });

  test('omits the source ARN condition when the destination bucket is in another stack', () => {
    const app = new core.App();
    const env = { account: '123456789012', region: 'us-east-1' };
    const logStack = new core.Stack(app, 'LogStack', { env });
    const tableStack = new core.Stack(app, 'TableStack', { env });
    acknowledgeLoggingConfigurationSchema(tableStack);
    const logBucket = new s3.Bucket(logStack, 'LogBucket');
    new s3tables.TableBucket(tableStack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
      },
    });

    Template.fromStack(logStack).hasResourceProperties(BUCKET_POLICY_CFN_RESOURCE, {
      'PolicyDocument': {
        'Statement': [
          Match.objectLike({
            'Principal': { 'Service': 'logging.s3.amazonaws.com' },
            'Condition': {
              'StringEquals': {
                'aws:SourceAccount': '123456789012',
              },
            },
          }),
        ],
      },
    });
    Template.fromStack(tableStack).hasResource(TABLE_BUCKET_CFN_RESOURCE, {
      'DependsOn': Match.absent(),
    });
  });

  test('warns when the policy cannot be added to an imported destination bucket', () => {
    const logBucket = s3.Bucket.fromBucketName(stack, 'ImportedLogBucket', 'imported-log-bucket');
    new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
        prefix: 'logs/',
      },
    });

    Template.fromStack(stack).hasResourceProperties(TABLE_BUCKET_CFN_RESOURCE, {
      'LoggingConfiguration': Match.objectLike({
        'TargetBucket': 'imported-log-bucket',
        'TargetPrefix': 'logs/',
      }),
    });
    Annotations.fromStack(stack).hasWarning(
      '/Stack/TableBucket',
      Match.stringLikeRegexp('Unable to add the server access logs delivery permissions to the destination bucket'),
    );
  });

  test('fails when the prefix is longer than 1024 characters', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');

    expect(() => new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
        prefix: 'a'.repeat(1025),
      },
    })).toThrow(/the server access logs prefix must be at most 1024 characters, got 1025 characters/);
  });

  test('accepts a prefix of exactly 1024 characters', () => {
    const logBucket = new s3.Bucket(stack, 'LogBucket');

    expect(() => new s3tables.TableBucket(stack, 'TableBucket', {
      tableBucketName: 'example-table-bucket',
      serverAccessLogs: {
        destinationBucket: logBucket,
        prefix: 'a'.repeat(1024),
      },
    })).not.toThrow();
  });
});
