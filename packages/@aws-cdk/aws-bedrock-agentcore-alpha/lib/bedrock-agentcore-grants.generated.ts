/* eslint-disable @stylistic/max-len, eol-last */
import * as bedrockagentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as iam from "aws-cdk-lib/aws-iam";

/**
 * Properties for RuntimeGrants
 */
interface RuntimeGrantsProps {
  /**
   * The resource on which actions will be allowed
   */
  readonly resource: bedrockagentcore.IRuntimeRef;
}

/**
 * Collection of grant methods for a IRuntimeRef
 */
export class RuntimeGrants {
  /**
   * Creates grants for RuntimeGrants
   */
  public static fromRuntime(resource: bedrockagentcore.IRuntimeRef): RuntimeGrants {
    return new RuntimeGrants({
      resource: resource
    });
  }

  protected readonly resource: bedrockagentcore.IRuntimeRef;

  private constructor(props: RuntimeGrantsProps) {
    this.resource = props.resource;
  }

  /**
   * Grant permissions to invoke this agent runtime
   */
  public invoke(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:InvokeAgentRuntime"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnRuntime.arnForRuntime(this.resource), bedrockagentcore.CfnRuntime.arnForRuntime(this.resource) + "/*"]
    });
    return result;
  }

  /**
   * Grant permissions to invoke this runtime on behalf of a user
   */
  public invokeForUser(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:InvokeAgentRuntimeForUser"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnRuntime.arnForRuntime(this.resource), bedrockagentcore.CfnRuntime.arnForRuntime(this.resource) + "/*"]
    });
    return result;
  }

  /**
   * Grant permissions to invoke this runtime both directly and on behalf of users
   */
  public invokeAll(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:InvokeAgentRuntime","bedrock-agentcore:InvokeAgentRuntimeForUser"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnRuntime.arnForRuntime(this.resource), bedrockagentcore.CfnRuntime.arnForRuntime(this.resource) + "/*"]
    });
    return result;
  }
}

/**
 * Properties for GatewayGrants
 */
interface GatewayGrantsProps {
  /**
   * The resource on which actions will be allowed
   */
  readonly resource: bedrockagentcore.IGatewayRef;
}

/**
 * Collection of grant methods for a IGatewayRef
 */
export class GatewayGrants {
  /**
   * Creates grants for GatewayGrants
   */
  public static fromGateway(resource: bedrockagentcore.IGatewayRef): GatewayGrants {
    return new GatewayGrants({
      resource: resource
    });
  }

  protected readonly resource: bedrockagentcore.IGatewayRef;

  private constructor(props: GatewayGrantsProps) {
    this.resource = props.resource;
  }

  /**
   * Grant permissions to invoke this gateway
   */
  public invoke(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:InvokeGateway"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnGateway.arnForGateway(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to read gateway configuration
   */
  public read(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:GetGateway","bedrock-agentcore:GetGatewayTarget"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnGateway.arnForGateway(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to manage gateway resources
   */
  public manage(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:CreateGateway","bedrock-agentcore:CreateGatewayTarget","bedrock-agentcore:UpdateGateway","bedrock-agentcore:UpdateGatewayTarget","bedrock-agentcore:DeleteGateway","bedrock-agentcore:DeleteGatewayTarget"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnGateway.arnForGateway(this.resource)]
    });
    return result;
  }
}

/**
 * Properties for MemoryGrants
 */
interface MemoryGrantsProps {
  /**
   * The resource on which actions will be allowed
   */
  readonly resource: bedrockagentcore.IMemoryRef;
}

/**
 * Collection of grant methods for a IMemoryRef
 */
export class MemoryGrants {
  /**
   * Creates grants for MemoryGrants
   */
  public static fromMemory(resource: bedrockagentcore.IMemoryRef): MemoryGrants {
    return new MemoryGrants({
      resource: resource
    });
  }

  protected readonly resource: bedrockagentcore.IMemoryRef;

  private constructor(props: MemoryGrantsProps) {
    this.resource = props.resource;
  }

  /**
   * Grant permissions to write to short-term memory
   */
  public write(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:CreateEvent"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to read memory contents (STM and LTM)
   */
  public read(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:GetEvent","bedrock-agentcore:ListEvents","bedrock-agentcore:GetMemoryRecord","bedrock-agentcore:RetrieveMemoryRecords","bedrock-agentcore:ListMemoryRecords","bedrock-agentcore:ListActors","bedrock-agentcore:ListSessions"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to read short-term memory contents
   */
  public readShortTermMemory(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:GetEvent","bedrock-agentcore:ListEvents","bedrock-agentcore:ListActors","bedrock-agentcore:ListSessions"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to read long-term memory contents
   */
  public readLongTermMemory(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:GetMemoryRecord","bedrock-agentcore:RetrieveMemoryRecords","bedrock-agentcore:ListMemoryRecords","bedrock-agentcore:ListActors","bedrock-agentcore:ListSessions"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to delete memory contents (STM and LTM)
   */
  public delete(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:DeleteEvent","bedrock-agentcore:DeleteMemoryRecord"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to delete short-term memory contents
   */
  public deleteShortTermMemory(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:DeleteEvent"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to delete long-term memory contents
   */
  public deleteLongTermMemory(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:DeleteMemoryRecord"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant control plane permissions to manage the memory
   */
  public admin(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:CreateMemory","bedrock-agentcore:GetMemory","bedrock-agentcore:DeleteMemory","bedrock-agentcore:UpdateMemory"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }

  /**
   * Grant full access permissions to this memory
   */
  public fullAccess(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:CreateEvent","bedrock-agentcore:GetEvent","bedrock-agentcore:ListEvents","bedrock-agentcore:DeleteEvent","bedrock-agentcore:GetMemoryRecord","bedrock-agentcore:RetrieveMemoryRecords","bedrock-agentcore:ListMemoryRecords","bedrock-agentcore:DeleteMemoryRecord","bedrock-agentcore:ListActors","bedrock-agentcore:ListSessions","bedrock-agentcore:CreateMemory","bedrock-agentcore:GetMemory","bedrock-agentcore:DeleteMemory","bedrock-agentcore:UpdateMemory"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnMemory.arnForMemory(this.resource)]
    });
    return result;
  }
}

/**
 * Properties for BrowserCustomGrants
 */
interface BrowserCustomGrantsProps {
  /**
   * The resource on which actions will be allowed
   */
  readonly resource: bedrockagentcore.IBrowserCustomRef;
}

/**
 * Collection of grant methods for a IBrowserCustomRef
 */
export class BrowserCustomGrants {
  /**
   * Creates grants for BrowserCustomGrants
   */
  public static fromBrowserCustom(resource: bedrockagentcore.IBrowserCustomRef): BrowserCustomGrants {
    return new BrowserCustomGrants({
      resource: resource
    });
  }

  protected readonly resource: bedrockagentcore.IBrowserCustomRef;

  private constructor(props: BrowserCustomGrantsProps) {
    this.resource = props.resource;
  }

  /**
   * Grant permissions to read browser information
   */
  public read(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:GetBrowser","bedrock-agentcore:GetBrowserSession","bedrock-agentcore:ListBrowserSessions"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnBrowserCustom.arnForBrowserCustom(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to use browser functionality
   */
  public use(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:StartBrowserSession","bedrock-agentcore:StopBrowserSession","bedrock-agentcore:UpdateBrowserStream"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnBrowserCustom.arnForBrowserCustom(this.resource)]
    });
    return result;
  }
}

/**
 * Properties for CodeInterpreterCustomGrants
 */
interface CodeInterpreterCustomGrantsProps {
  /**
   * The resource on which actions will be allowed
   */
  readonly resource: bedrockagentcore.ICodeInterpreterCustomRef;
}

/**
 * Collection of grant methods for a ICodeInterpreterCustomRef
 */
export class CodeInterpreterCustomGrants {
  /**
   * Creates grants for CodeInterpreterCustomGrants
   */
  public static fromCodeInterpreterCustom(resource: bedrockagentcore.ICodeInterpreterCustomRef): CodeInterpreterCustomGrants {
    return new CodeInterpreterCustomGrants({
      resource: resource
    });
  }

  protected readonly resource: bedrockagentcore.ICodeInterpreterCustomRef;

  private constructor(props: CodeInterpreterCustomGrantsProps) {
    this.resource = props.resource;
  }

  /**
   * Grant permissions to read code interpreter information
   */
  public read(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:GetCodeInterpreter","bedrock-agentcore:GetCodeInterpreterSession","bedrock-agentcore:ListCodeInterpreterSessions"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnCodeInterpreterCustom.arnForCodeInterpreterCustom(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to use code interpreter functionality
   */
  public use(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:StartCodeInterpreterSession","bedrock-agentcore:InvokeCodeInterpreter","bedrock-agentcore:StopCodeInterpreterSession"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnCodeInterpreterCustom.arnForCodeInterpreterCustom(this.resource)]
    });
    return result;
  }

  /**
   * Grant permissions to invoke code interpreter
   */
  public invoke(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:InvokeCodeInterpreter"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnCodeInterpreterCustom.arnForCodeInterpreterCustom(this.resource)]
    });
    return result;
  }
}

/**
 * Properties for WorkloadIdentityGrants
 */
interface WorkloadIdentityGrantsProps {
  /**
   * The resource on which actions will be allowed
   */
  readonly resource: bedrockagentcore.IWorkloadIdentityRef;
}

/**
 * Collection of grant methods for a IWorkloadIdentityRef
 */
export class WorkloadIdentityGrants {
  /**
   * Creates grants for WorkloadIdentityGrants
   */
  public static fromWorkloadIdentity(resource: bedrockagentcore.IWorkloadIdentityRef): WorkloadIdentityGrants {
    return new WorkloadIdentityGrants({
      resource: resource
    });
  }

  protected readonly resource: bedrockagentcore.IWorkloadIdentityRef;

  private constructor(props: WorkloadIdentityGrantsProps) {
    this.resource = props.resource;
  }

  /**
   * Grant permissions to obtain workload access tokens
   */
  public getToken(grantee: iam.IGrantable): iam.Grant {
    const actions = ["bedrock-agentcore:GetWorkloadAccessToken","bedrock-agentcore:GetWorkloadAccessTokenForJWT","bedrock-agentcore:GetWorkloadAccessTokenForUserId"];
    const result = iam.Grant.addToPrincipal({
      actions: actions,
      grantee: grantee,
      resourceArns: [bedrockagentcore.CfnWorkloadIdentity.arnForWorkloadIdentity(this.resource)]
    });
    return result;
  }
}
