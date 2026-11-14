import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as core from 'aws-cdk-lib/core';
import type { Construct } from 'constructs';
import * as s3tables from '../../lib';

/**
 * Test stack for table bucket with server access logging enabled
 */
class LoggingTestStack extends core.Stack {
  public readonly tableBucket: s3tables.TableBucket;
  public readonly logBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: core.StackProps) {
    super(scope, id, props);

    this.logBucket = new s3.Bucket(this, 'LogBucket', {
      removalPolicy: core.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.tableBucket = new s3tables.TableBucket(this, 'LoggingBucket', {
      serverAccessLogs: {
        destinationBucket: this.logBucket,
        prefix: 'table-bucket-logs/',
        partitionDateSource: s3.PartitionDateSource.DELIVERY_TIME,
      },
      removalPolicy: core.RemovalPolicy.DESTROY,
    });
  }
}

const app = new core.App();

const loggingTestStack = new LoggingTestStack(app, 'TableBucketLoggingTestStack');

const integ = new IntegTest(app, 'TableBucketLoggingIntegTest', {
  testCases: [loggingTestStack],
});

integ.assertions.awsApiCall('S3Tables', 'getTableBucketLogging', {
  tableBucketARN: loggingTestStack.tableBucket.tableBucketArn,
}).expect(ExpectedResult.objectLike({
  tableBucketLoggingStatus: {
    loggingEnabled: {
      targetBucket: loggingTestStack.logBucket.bucketName,
      targetPrefix: 'table-bucket-logs/',
      targetObjectKeyFormat: {
        partitionedPrefix: {
          partitionDateSource: 'DeliveryTime',
        },
      },
    },
  },
}));
