import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Duration } from 'aws-cdk-lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'cloudfront-s3-bucket-origin-mixed');

// Create three different S3 buckets for different origin types
const bucketDefault = new s3.Bucket(stack, 'BucketDefault', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const bucketOac = new s3.Bucket(stack, 'BucketOac', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

const bucketOai = new s3.Bucket(stack, 'BucketOai', {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Create origins with different configurations and readTimeout settings
const s3OriginDefault = origins.S3BucketOrigin.withBucketDefaults(bucketDefault, {
  readTimeout: Duration.seconds(30),
});

const s3OriginOac = origins.S3BucketOrigin.withOriginAccessControl(bucketOac, {
  readTimeout: Duration.seconds(45),
});

const originAccessIdentity = new cloudfront.OriginAccessIdentity(stack, 'OriginAccessIdentity', {
  comment: 'OAI for mixed origin test',
});
const s3OriginOai = origins.S3BucketOrigin.withOriginAccessIdentity(bucketOai, {
  originAccessIdentity,
  readTimeout: Duration.seconds(60),
});

new cloudfront.Distribution(stack, 'Distribution', {
  defaultBehavior: {
    origin: s3OriginDefault,
  },
  additionalBehaviors: {
    '/oac/*': {
      origin: s3OriginOac,
    },
    '/oai/*': {
      origin: s3OriginOai,
    },
  },
});

new IntegTest(app, 's3-bucket-origin-mixed', {
  testCases: [stack],
});
