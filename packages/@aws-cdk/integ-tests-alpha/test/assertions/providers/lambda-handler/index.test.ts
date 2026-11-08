import { ExpectedResult } from '../../../../lib/assertions';
import { CustomResourceHandler } from '../../../../lib/assertions/providers/lambda-handler/base';
import { handler } from '../../../../lib/assertions/providers/lambda-handler/index';
import { ASSERT_RESOURCE_TYPE } from '../../../../lib/assertions/providers/lambda-handler/types';

const context: any = {
  getRemainingTimeInMillis: () => 50000,
};

function equalsAssertionEvent(properties: { [key: string]: any }): any {
  return {
    RequestType: 'Create',
    ResourceType: ASSERT_RESOURCE_TYPE,
    LogicalResourceId: 'EqualsAssertion',
    RequestId: 'request-id',
    StackId: 'stack-id',
    ResponseURL: 'https://example.com',
    ServiceToken: 'service-token',
    ResourceProperties: { ServiceToken: 'service-token', ...properties },
  };
}

let respond: jest.SpyInstance;

beforeAll(() => {
  jest.useFakeTimers();
  jest.spyOn(console, 'log').mockImplementation(() => { return true; });
  jest.spyOn(console, 'info').mockImplementation(() => { return true; });
});
beforeEach(() => {
  respond = jest.spyOn(CustomResourceHandler.prototype, 'respond').mockResolvedValue(undefined);
});
afterEach(() => {
  respond.mockRestore();
});
afterAll(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('handler', () => {
  describe('EqualsAssertion', () => {
    test('responds with the result of comparing actual and expected', async () => {
      // WHEN
      await handler(equalsAssertionEvent({
        actual: 'foo',
        expected: ExpectedResult.stringLikeRegexp('^foo$').result,
      }), context);

      // THEN
      expect(respond).toHaveBeenCalledTimes(1);
      expect(respond).toHaveBeenCalledWith({
        status: 'SUCCESS',
        reason: 'OK',
        data: { assertion: '{"status":"success"}' },
      });
    });

    test('responds with the failure when actual and expected differ', async () => {
      // WHEN
      await handler(equalsAssertionEvent({
        actual: 'foo',
        expected: ExpectedResult.stringLikeRegexp('^bar$').result,
      }), context);

      // THEN
      expect(respond).toHaveBeenCalledTimes(1);
      const response = respond.mock.calls[0][0];
      expect(response.status).toEqual('SUCCESS');
      expect(response.data.failed).toEqual(true);
      expect(JSON.parse(response.data.assertion)).toEqual({
        status: 'fail',
        message: expect.stringMatching(/String 'foo' did not match pattern '\^bar\$'/),
      });
    });

    test('fails the deployment when failDeployment is set and actual and expected differ', async () => {
      // WHEN
      await handler(equalsAssertionEvent({
        actual: 'foo',
        expected: ExpectedResult.stringLikeRegexp('^bar$').result,
        failDeployment: true,
      }), context);

      // THEN
      expect(respond).toHaveBeenCalledTimes(1);
      expect(respond.mock.calls[0][0].status).toEqual('FAILED');
    });
  });
});
