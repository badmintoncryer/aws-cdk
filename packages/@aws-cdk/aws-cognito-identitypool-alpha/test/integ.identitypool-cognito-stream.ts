import { App, Stack } from 'aws-cdk-lib';
import { IdentityPool } from '../lib/identitypool';
import * as integ from '@aws-cdk/integ-tests-alpha';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';

const app = new App();
const stack = new Stack(app, 'IdentitypoolWithStreamStack');

const stream = new kinesis.Stream(stack, 'Stream');

new IdentityPool(stack, 'identitypool', {
  identityPoolName: 'my-id-pool',
  stream,
});

new integ.IntegTest(app, 'IdentitypoolWithStreamStackInteg', {
  testCases: [stack],
});
