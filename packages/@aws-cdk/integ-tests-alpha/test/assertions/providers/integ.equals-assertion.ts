import { App, CfnResource, Stack } from 'aws-cdk-lib';
import { ActualResult, ExpectedResult, IntegTest } from '../../../lib';

const app = new App();
const stack = new Stack(app, 'EqualsAssertion');

const parameterValue = 'equals-assertion-value';
const parameter = new CfnResource(stack, 'Parameter', {
  type: 'AWS::SSM::Parameter',
  properties: {
    Type: 'String',
    Value: parameterValue,
  },
});

const integ = new IntegTest(app, 'EqualsAssertionTest', {
  testCases: [stack],
});

const getParameter = integ.assertions.awsApiCall('SSM', 'getParameter', {
  Name: parameter.ref,
});

// assertions.expect() creates an EqualsAssertion, which compares two values
// that are not the result of the assertion's own API call.
integ.assertions.expect(
  'ParameterValue',
  ExpectedResult.stringLikeRegexp(`^${parameterValue}$`),
  ActualResult.fromAwsApiCall(getParameter, 'Parameter.Value'),
);
