import { IResource, Resource } from "aws-cdk-lib";
import { addConstructMetadata } from "aws-cdk-lib/core/lib/metadata-resource";
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { IIpamPool } from './ipam';

/**
 * Represents an Elastic IP address.
 */
export interface IEip extends IResource {
  /**
   * The ID that AWS assigns to represent the allocation of the address for use with Amazon VPC.
   * @attribute
   */
  readonly allocationId: string;

  /**
   * The Elastic IP address.
   * @attribute
   */
  readonly publicIp: string;
}

export interface EipAttributes {
  /**
   * The ID that AWS assigns to represent the allocation of the address for use with Amazon VPC.
   */
  readonly allocationId: string;

  /**
   * The Elastic IP address.
   */
  readonly publicIp: string;
}

/**
 * The domain for the Elastic IP address.
 */
export enum Domain {
  /**
   * 
   */
  VPC = "vpc",
  STANDARD = "standard",
}

export interface EipProps {
  /**
   * An Elastic IP address or a carrier IP address in a Wavelength Zone.
   */
  readonly address?: string;

  /**
   * The network (vpc).
   */
  readonly domain?: Domain;

  /**
   * The instance to associate with the Elastic IP address.
   *
   * @default undefined - The Elastic IP address is not associated with any instance by cloudformation default.
   */
  readonly instance?: ec2.IInstance;

  /**
   * The IPAM pool which has an Amazon-provided or BYOIP public IPv4 CIDR provisioned to it.
   *
   * @see https://docs.aws.amazon.com/vpc/latest/ipam/tutorials-eip-pool.html
   *
   * @default 
   */
  readonly ipamPool?: IIpamPool;
}

export class Eip extends Resource implements IEip {
  /**
   * Import an existing EIP from its attributes.
   *
   * @param scope The parent creating construct.
   * @param id The construct ID.
   * @param attrs The attributes of the existing EIP.
   */
  public static fromEipAttributes(scope: IResource, id: string, attrs: EipAttributes): IEip {
    class Import extends Resource implements IEip {
      public readonly allocationId = attrs.allocationId;
      public readonly publicIp = attrs.publicIp;
    }
    return new Import(scope, id);
  }

  /**
   * The ID that AWS assigns to represent the allocation of the address for use with Amazon VPC.
   * @attribute
   */
  public readonly allocationId: string;

  /**
   * The Elastic IP address.
   * @attribute
   */
  public readonly publicIp: string;

  public constructor(scope: IResource, id: string, props: EipProps) {
    super(scope, id);
    // Enhanced CDK Analytics Telemetry
    addConstructMetadata(this, props)

    const resource = new ec2.CfnEIP(this, id, {
      domain: props.domain,
      instanceId: props.instance?.instanceId,
      address: props.address,
      ipamPoolId: props.ipamPool?.ipamPoolId,
    });

    this.allocationId = resource.attrAllocationId;
    this.publicIp = resource.attrPublicIp;
  }
}

