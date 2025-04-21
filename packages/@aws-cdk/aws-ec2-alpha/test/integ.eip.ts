import { Domain, Eip } from '../lib';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';
import * as cdk from 'aws-cdk-lib';

const app = new cdk.App();

const stack = new cdk.Stack(app, 'aws-cdk-eip-integ');

new Eip(stack, 'VpcEip', {
  domain: Domain.VPC,
});
new Eip(stack, 'StandardEip', {
  domain: Domain.STANDARD,
});

new IntegTest(app, 'integtest-model', {
  testCases: [stack],
});
