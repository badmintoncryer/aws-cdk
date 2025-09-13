import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { App, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const SNAPSHOT_ARN = process.env.SNAPSHOT_ARN ?? 'arn:aws:rds:us-west-2:123456789012:snapshot:rds:mysql-instance1-snapshot-2023-08-30-06-20';

const app = new App();
const stack = new Stack(app, 'cdk-instance-backup-target');

const vpc = new ec2.Vpc(stack, 'Vpc');

// For simplicity, get a public snapshot
new rds.DatabaseInstanceFromSnapshot(stack, 'FromSnapshot', {
  clusterSnapshotIdentifier: SNAPSHOT_ARN,
  engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_6 }),
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
  backupTarget: rds.BackupTarget.REGION,
  vpc,
  removalPolicy: RemovalPolicy.DESTROY,
});

const instance = new rds.DatabaseInstance(stack, 'Instance', {
  engine: rds.DatabaseInstanceEngine.mysql({ version: rds.MysqlEngineVersion.VER_8_0_40 }),
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.M7I, ec2.InstanceSize.LARGE),
  vpc,
  backupTarget: rds.BackupTarget.OUTPOSTS,
  removalPolicy: RemovalPolicy.DESTROY,
});

new rds.DatabaseInstanceReadReplica(stack, 'ReadReplica', {
  sourceDatabaseInstance: instance,
  instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
  vpc,
  backupTarget: rds.BackupTarget.REGION,
  removalPolicy: RemovalPolicy.DESTROY,
});

new IntegTest(app, 'cdk-instance-backup-target-test', {
  testCases: [stack],
});
