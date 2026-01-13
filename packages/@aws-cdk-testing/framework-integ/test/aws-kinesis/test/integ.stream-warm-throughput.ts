import { App, RemovalPolicies, Size, Stack } from 'aws-cdk-lib';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App();
const stack = new Stack(app, 'kinesis-stream-warm-throughput-stack');

const stream = new kinesis.Stream(stack, 'WarmThroughputStream', {
  streamMode: kinesis.StreamMode.ON_DEMAND,
  warmThroughput: Size.mebibytes(10),
});

RemovalPolicies.of(stack).destroy();

const integ = new IntegTest(app, 'integ-kinesis-stream-warm-throughput', {
  testCases: [stack],
});

integ.assertions.awsApiCall('Kinesis', 'describeStreamSummary', {
  StreamName: stream.streamName,
}).expect(ExpectedResult.objectLike({
  StreamDescriptionSummary: {
    StreamModeDetails: {
      StreamMode: 'ON_DEMAND',
    },
    WarmThroughput: {
      TargetMiBps: 10,
    },
  },
}));
