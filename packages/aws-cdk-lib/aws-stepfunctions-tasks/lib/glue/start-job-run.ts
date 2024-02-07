import { Construct } from 'constructs';
import * as iam from '../../../aws-iam';
import * as sfn from '../../../aws-stepfunctions';
import { Duration, Stack, Token } from '../../../core';
import { integrationResourceArn, validatePatternSupported } from '../private/task-utils';
import { WorkerType } from '../../../../@aws-cdk/aws-glue-alpha/lib/job';

/**
 * Properties for starting an AWS Glue job as a task
 */
export interface GlueStartJobRunProps extends sfn.TaskStateBaseProps {

  /**
   * Glue job name
   */
  readonly glueJobName: string;

  /**
   * The job arguments specifically for this run.
   *
   * For this job run, they replace the default arguments set in the job
   * definition itself.
   *
   * @default - Default arguments set in the job definition
   */
  readonly arguments?: sfn.TaskInput;

  /**
   * The name of the SecurityConfiguration structure to be used with this job run.
   *
   * This must match the Glue API
   * @see https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-common.html#aws-glue-api-regex-oneLine
   *
   * @default - Default configuration set in the job definition
   */
  readonly securityConfiguration?: string;

  /**
   * After a job run starts, the number of minutes to wait before sending a job run delay notification.
   *
   * Must be at least 1 minute.
   *
   * @default - Default delay set in the job definition
   */
  readonly notifyDelayAfter?: Duration;

  /**
   * The number of workers of a defined workerType that are allocated when a job runs.
   *
   * @default 10
   */
  readonly numberOfWorkers?: number;

  /**
   * The type of predefined worker that is allocated when a job runs.
   *
   * Accepts a value of G.1X, G.2X, G.4X, G.8X or G.025X for Spark jobs.
   * Accepts the value Z.2X for Ray jobs.
   *
   * @default WorkerType.G_1X
   */
  readonly workerType?: WorkerType;
}

/**
 * Starts an AWS Glue job in a Task state
 *
 * OUTPUT: the output of this task is a JobRun structure, for details consult
 * https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-jobs-runs.html#aws-glue-api-jobs-runs-JobRun
 *
 * @see https://docs.aws.amazon.com/step-functions/latest/dg/connect-glue.html
 */
export class GlueStartJobRun extends sfn.TaskStateBase {
  private static readonly SUPPORTED_INTEGRATION_PATTERNS: sfn.IntegrationPattern[] = [
    sfn.IntegrationPattern.REQUEST_RESPONSE,
    sfn.IntegrationPattern.RUN_JOB,
  ];

  protected readonly taskMetrics?: sfn.TaskMetricsConfig;
  protected readonly taskPolicies?: iam.PolicyStatement[];

  private readonly integrationPattern: sfn.IntegrationPattern;

  constructor(scope: Construct, id: string, private readonly props: GlueStartJobRunProps) {
    super(scope, id, props);
    this.integrationPattern = props.integrationPattern ?? sfn.IntegrationPattern.REQUEST_RESPONSE;

    validatePatternSupported(this.integrationPattern, GlueStartJobRun.SUPPORTED_INTEGRATION_PATTERNS);

    if (
      props.numberOfWorkers
      && !Token.isUnresolved(props.numberOfWorkers)
      && (!Number.isInteger(props.numberOfWorkers) || props.numberOfWorkers < 1)
    ) {
      throw new Error('`numberOfWorkers` must be an integer greater than 0');
    }

    this.taskPolicies = this.getPolicies();

    this.taskMetrics = {
      metricPrefixSingular: 'GlueJob',
      metricPrefixPlural: 'GlueJobs',
      metricDimensions: { GlueJobName: this.props.glueJobName },
    };
  }

  /**
   * @internal
   */
  protected _renderTask(): any {
    const notificationProperty = this.props.notifyDelayAfter ? { NotifyDelayAfter: this.props.notifyDelayAfter.toMinutes() } : null;

    let timeout: number | undefined = undefined;
    if (this.props.timeout) {
      timeout = this.props.timeout.toMinutes();
    } else if (this.props.taskTimeout?.seconds) {
      timeout = Duration.seconds(this.props.taskTimeout.seconds).toMinutes();
    } else if (this.props.taskTimeout?.path) {
      timeout = sfn.JsonPath.numberAt(this.props.taskTimeout.path);
    }

    return {
      Resource: integrationResourceArn('glue', 'startJobRun', this.integrationPattern),
      Parameters: sfn.FieldUtils.renderObject({
        JobName: this.props.glueJobName,
        Arguments: this.props.arguments?.value,
        Timeout: timeout,
        SecurityConfiguration: this.props.securityConfiguration,
        NotificationProperty: notificationProperty,
        NumberOfWorkers: this.props.numberOfWorkers,
        WorkerType: this.props.workerType?.name,
      }),
      TimeoutSeconds: undefined,
      TimeoutSecondsPath: undefined,
    };
  }

  private getPolicies(): iam.PolicyStatement[] {
    let iamActions: string[] | undefined;
    if (this.integrationPattern === sfn.IntegrationPattern.REQUEST_RESPONSE) {
      iamActions = ['glue:StartJobRun'];
    } else if (this.integrationPattern === sfn.IntegrationPattern.RUN_JOB) {
      iamActions = [
        'glue:StartJobRun',
        'glue:GetJobRun',
        'glue:GetJobRuns',
        'glue:BatchStopJobRun',
      ];
    }

    return [new iam.PolicyStatement({
      resources: [
        Stack.of(this).formatArn({
          service: 'glue',
          resource: 'job',
          resourceName: this.props.glueJobName,
        }),
      ],
      actions: iamActions,
    })];
  }
}
