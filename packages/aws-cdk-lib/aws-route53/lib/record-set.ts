import { Construct } from 'constructs';
import { AliasRecordTargetConfig, IAliasRecordTarget } from './alias-record-target';
import { GeoLocation } from './geo-location';
import { IHostedZone } from './hosted-zone-ref';
import { CfnCidrCollection, CfnRecordSet } from './route53.generated';
import { determineFullyQualifiedDomainName } from './util';
import * as iam from '../../aws-iam';
import { CustomResource, Duration, IResource, Names, RemovalPolicy, Resource, Token } from '../../core';
import { CrossAccountZoneDelegationProvider } from '../../custom-resource-handlers/dist/aws-route53/cross-account-zone-delegation-provider.generated';
import { DeleteExistingRecordSetProvider } from '../../custom-resource-handlers/dist/aws-route53/delete-existing-record-set-provider.generated';

const CROSS_ACCOUNT_ZONE_DELEGATION_RESOURCE_TYPE = 'Custom::CrossAccountZoneDelegation';
const DELETE_EXISTING_RECORD_SET_RESOURCE_TYPE = 'Custom::DeleteExistingRecordSet';

/**
 * A record set
 */
export interface IRecordSet extends IResource {
  /**
   * The domain name of the record
   */
  readonly domainName: string;
}

/**
 * The record type.
 */
export enum RecordType {
  /**
   * route traffic to a resource, such as a web server, using an IPv4 address in dotted decimal
   * notation
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#AFormat
   */
  A = 'A',

  /**
   * route traffic to a resource, such as a web server, using an IPv6 address in colon-separated
   * hexadecimal format
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#AAAAFormat
   */
  AAAA = 'AAAA',

  /**
   * A CAA record specifies which certificate authorities (CAs) are allowed to issue certificates
   * for a domain or subdomain
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#CAAFormat
   */
  CAA = 'CAA',

  /**
   * A CNAME record maps DNS queries for the name of the current record, such as acme.example.com,
   * to another domain (example.com or example.net) or subdomain (acme.example.com or zenith.example.org).
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#CNAMEFormat
   */
  CNAME = 'CNAME',

  /**
   * A delegation signer (DS) record refers a zone key for a delegated subdomain zone.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#DSFormat
   */
  DS = 'DS',

  /**
   * An MX record specifies the names of your mail servers and, if you have two or more mail servers,
   * the priority order.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#MXFormat
   */
  MX = 'MX',

  /**
   * A Name Authority Pointer (NAPTR) is a type of record that is used by Dynamic Delegation Discovery
   * System (DDDS) applications to convert one value to another or to replace one value with another.
   * For example, one common use is to convert phone numbers into SIP URIs.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#NAPTRFormat
   */
  NAPTR = 'NAPTR',

  /**
   * An NS record identifies the name servers for the hosted zone
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#NSFormat
   */
  NS = 'NS',

  /**
   * A PTR record maps an IP address to the corresponding domain name.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#PTRFormat
   */
  PTR = 'PTR',

  /**
   * A start of authority (SOA) record provides information about a domain and the corresponding Amazon
   * Route 53 hosted zone
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#SOAFormat
   */
  SOA = 'SOA',

  /**
   * SPF records were formerly used to verify the identity of the sender of email messages.
   * Instead of an SPF record, we recommend that you create a TXT record that contains the applicable value.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#SPFFormat
   */
  SPF = 'SPF',

  /**
   * An SRV record Value element consists of four space-separated values. The first three values are
   * decimal numbers representing priority, weight, and port. The fourth value is a domain name.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#SRVFormat
   */
  SRV = 'SRV',

  /**
   * A TXT record contains one or more strings that are enclosed in double quotation marks (").
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/ResourceRecordTypes.html#TXTFormat
   */
  TXT = 'TXT',
}

/**
 * Options for a RecordSet.
 */
export interface RecordSetOptions {
  /**
   * The hosted zone in which to define the new record.
   */
  readonly zone: IHostedZone;

  /**
   * The geographical origin for this record to return DNS records based on the user's location.
   */
  readonly geoLocation?: GeoLocation;

  /**
   * The subdomain name for this record. This should be relative to the zone root name.
   *
   * For example, if you want to create a record for acme.example.com, specify
   * "acme".
   *
   * You can also specify the fully qualified domain name which terminates with a
   * ".". For example, "acme.example.com.".
   *
   * @default zone root
   */
  readonly recordName?: string;

  /**
   * The resource record cache time to live (TTL).
   *
   * @default Duration.minutes(30)
   */
  readonly ttl?: Duration;

  /**
   * A comment to add on the record.
   *
   * @default no comment
   */
  readonly comment?: string;

  /**
   * Whether to delete the same record set in the hosted zone if it already exists (dangerous!)
   *
   * This allows to deploy a new record set while minimizing the downtime because the
   * new record set will be created immediately after the existing one is deleted. It
   * also avoids "manual" actions to delete existing record sets.
   *
   * > **N.B.:** this feature is dangerous, use with caution! It can only be used safely when
   * > `deleteExisting` is set to `true` as soon as the resource is added to the stack. Changing
   * > an existing Record Set's `deleteExisting` property from `false -> true` after deployment
   * > will delete the record!
   *
   * @default false
   */
  readonly deleteExisting?: boolean;

  /**
   * Among resource record sets that have the same combination of DNS name and type,
   * a value that determines the proportion of DNS queries that Amazon Route 53 responds to using the current resource record set.
   *
   * Route 53 calculates the sum of the weights for the resource record sets that have the same combination of DNS name and type.
   * Route 53 then responds to queries based on the ratio of a resource's weight to the total.
   *
   * This value can be a number between 0 and 255.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
   *
   * @default - Do not set weighted routing
   */
  readonly weight?: number;

  /**
   * The configuration for IP-based routing in Amazon Route 53 record sets.
   * It is used to direct traffic to different resources based on the IP address of the request.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-ipbased.html
   *
   * @default - Do not set IP based routing
   */
  readonly cidrRoutingConfig?: CidrRoutingConfig;

  /**
   * The Amazon EC2 Region where you created the resource that this resource record set refers to.
   * The resource typically is an AWS resource, such as an EC2 instance or an ELB load balancer,
   * and is referred to by an IP address or a DNS domain name, depending on the record type.
   *
   * When Amazon Route 53 receives a DNS query for a domain name and type for which you have created latency resource record sets,
   * Route 53 selects the latency resource record set that has the lowest latency between the end user and the associated Amazon EC2 Region.
   * Route 53 then returns the value that is associated with the selected resource record set.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-route53-recordset.html#cfn-route53-recordset-region
   *
   * @default - Do not set latency based routing
   */
  readonly region?: string;

  /**
   * Whether to return multiple values, such as IP addresses for your web servers, in response to DNS queries.
   *
   * @default false
   */
  readonly multiValueAnswer?: boolean;

  /**
   * A string used to distinguish between different records with the same combination of DNS name and type.
   * It can only be set when either weight or geoLocation is defined.
   *
   * This parameter must be between 1 and 128 characters in length.
   *
   * @default - Auto generated string
   */
  readonly setIdentifier?: string;
}

/**
 * Configuration for IP-based routing.
 */
export interface CidrRoutingConfig {
  /**
   * List of CIDR blocks.
   *
   * When specifying the default location (locationName is '*'), it cannot be set, but for all other cases, it is mandatory.
   *
   * @default - zero bit CIDR block (0.0.0.0/0 or ::/0) for the default location
   */
  cidrList?: string[];
  /**
   * The name of the location.
   *
   * When '*' is specified, it is treated as the default location.
   * In this case, the cidrList cannot be specified.
   */
  locationName: string;
  /**
   * The name of a CIDR collection.
   *
   * This parameter is ignored when the `collection` property is specified.
   *
   * @default - Auto generated name
   */
  collectionName?: string;
  /**
   * Existing Cidr Collection.
   *
   * Use this to add a new Location to an existing Cidr Collection.
   * Note that for IP-based routing, all resource record sets for the same record set name and type must reference the same CIDR collection.
   *
   * @see https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-ipbased.html
   *
   * @default - Create a new CIDR Collection
   */
  collection?: CfnCidrCollection;
}

/**
 * Type union for a record that accepts multiple types of target.
 */
export class RecordTarget {
  /**
   * Use string values as target.
   */
  public static fromValues(...values: string[]) {
    return new RecordTarget(values);
  }

  /**
   * Use an alias as target.
   */
  public static fromAlias(aliasTarget: IAliasRecordTarget) {
    return new RecordTarget(undefined, aliasTarget);
  }

  /**
   * Use ip addresses as target.
   */
  public static fromIpAddresses(...ipAddresses: string[]) {
    return RecordTarget.fromValues(...ipAddresses);
  }

  /**
   *
   * @param values correspond with the chosen record type (e.g. for 'A' Type, specify one or more IP addresses)
   * @param aliasTarget alias for targets such as CloudFront distribution to route traffic to
   */
  protected constructor(public readonly values?: string[], public readonly aliasTarget?: IAliasRecordTarget) {
  }
}

/**
 * Construction properties for a RecordSet.
 */
export interface RecordSetProps extends RecordSetOptions {
  /**
   * The record type.
   */
  readonly recordType: RecordType;

  /**
   * The target for this record, either `RecordTarget.fromValues()` or
   * `RecordTarget.fromAlias()`.
   */
  readonly target: RecordTarget;
}

/**
 * A record set.
 */
export class RecordSet extends Resource implements IRecordSet {
  public readonly domainName: string;
  public _cidrCollection: CfnCidrCollection | undefined;
  private readonly geoLocation?: GeoLocation;
  private readonly weight?: number;
  private readonly region?: string;
  private readonly multiValueAnswer?: boolean;
  private cidrLocation?: CfnRecordSet.CidrRoutingConfigProperty;

  constructor(scope: Construct, id: string, props: RecordSetProps) {
    super(scope, id);

    if (props.weight && (props.weight < 0 || props.weight > 255)) {
      throw new Error(`weight must be between 0 and 255 inclusive, got: ${props.weight}`);
    }
    if (props.setIdentifier && (props.setIdentifier.length < 1 || props.setIdentifier.length > 128)) {
      throw new Error(`setIdentifier must be between 1 and 128 characters long, got: ${props.setIdentifier.length}`);
    }
    if (
      props.setIdentifier
      && props.weight === undefined
      && !props.geoLocation
      && !props.region
      && !props.multiValueAnswer
      && !props.cidrRoutingConfig
    ) {
      throw new Error('setIdentifier can only be specified for non-simple routing policies');
    }
    if (props.multiValueAnswer && props.target.aliasTarget) {
      throw new Error('multiValueAnswer cannot be specified for alias record');
    }

    const nonSimpleRoutingPolicies = [
      props.geoLocation,
      props.region,
      props.weight,
      props.multiValueAnswer,
      props.cidrRoutingConfig,
    ].filter((variable) => variable !== undefined).length;
    if (nonSimpleRoutingPolicies > 1) {
      throw new Error('Only one of region, weight, multiValueAnswer, cidrRoutingConfig or geoLocation can be defined');
    }

    this.geoLocation = props.geoLocation;
    this.weight = props.weight;
    this.region = props.region;
    this.multiValueAnswer = props.multiValueAnswer;

    const ttl = props.target.aliasTarget ? undefined : ((props.ttl && props.ttl.toSeconds()) ?? 1800).toString();

    const recordName = determineFullyQualifiedDomainName(props.recordName || props.zone.zoneName, props.zone);

    if (props.cidrRoutingConfig) {
      const { locationName, cidrList, collectionName, collection } = props.cidrRoutingConfig;
      if (locationName && (locationName.length < 1 || locationName.length > 16)) {
        throw new Error(`locationName must be between 1 and 16 characters long, got: ${locationName.length}`);
      }
      if (locationName === '*' && cidrList) {
        throw new Error('cidrList can only be specified for non-default locations');
      }
      if (locationName === '*' && collection) {
        throw new Error('Default location cannot be specified when using an existing CIDR collection');
      }
      if (locationName && !/^[0-9A-Za-z_\-]+$/.test(locationName) && locationName !== '*') {
        throw new Error(`locationName must only contain alphanumeric characters, underscores, and hyphens, or only '*', got: ${locationName}`);
      }
      if (cidrList && (cidrList.length < 1 || cidrList.length > 1000)) {
        throw new Error(`cidrList must contain between 1 and 1000 elements, got: ${cidrList.length}`);
      }
      if (collectionName &&(collectionName.length < 1 || collectionName.length > 64)) {
        throw new Error(`collectionName must be between 1 and 64 characters long, got: ${collectionName.length}`);
      }
      if (collectionName && !/^[0-9A-Za-z_\-]+$/.test(collectionName)) {
        throw new Error(`collectionName must only contain alphanumeric characters, underscores, and hyphens, got: ${collectionName}`);
      }
      this.configureIpBasedRouting(props.cidrRoutingConfig);
    }

    const recordSet = new CfnRecordSet(this, 'Resource', {
      hostedZoneId: props.zone.hostedZoneId,
      name: recordName,
      type: props.recordType,
      resourceRecords: props.target.values,
      aliasTarget: props.target.aliasTarget && props.target.aliasTarget.bind(this, props.zone),
      ttl,
      comment: props.comment,
      geoLocation: props.geoLocation ? {
        continentCode: props.geoLocation.continentCode,
        countryCode: props.geoLocation.countryCode,
        subdivisionCode: props.geoLocation.subdivisionCode,
      } : undefined,
      multiValueAnswer: props.multiValueAnswer,
      setIdentifier: props.setIdentifier ?? this.configureSetIdentifier(),
      weight: props.weight,
      region: props.region,
      cidrRoutingConfig: this.cidrLocation,
    });

    this.domainName = recordSet.ref;

    if (props.deleteExisting) {
      // Delete existing record before creating the new one
      const provider = DeleteExistingRecordSetProvider.getOrCreateProvider(this, DELETE_EXISTING_RECORD_SET_RESOURCE_TYPE, {
        policyStatements: [{ // IAM permissions for all providers
          Effect: 'Allow',
          Action: 'route53:GetChange',
          Resource: '*',
        }],
      });
      // Add to the singleton policy for this specific provider
      provider.addToRolePolicy({
        Effect: 'Allow',
        Action: 'route53:ListResourceRecordSets',
        Resource: props.zone.hostedZoneArn,
      });
      provider.addToRolePolicy({
        Effect: 'Allow',
        Action: 'route53:ChangeResourceRecordSets',
        Resource: props.zone.hostedZoneArn,
        Condition: {
          'ForAllValues:StringEquals': {
            'route53:ChangeResourceRecordSetsRecordTypes': [props.recordType],
            'route53:ChangeResourceRecordSetsActions': ['DELETE'],
          },
        },
      });

      const customResource = new CustomResource(this, 'DeleteExistingRecordSetCustomResource', {
        resourceType: DELETE_EXISTING_RECORD_SET_RESOURCE_TYPE,
        serviceToken: provider.serviceToken,
        properties: {
          HostedZoneId: props.zone.hostedZoneId,
          RecordName: recordName,
          RecordType: props.recordType,
        },
      });

      recordSet.node.addDependency(customResource);
    }
  }

  public get cidrCollection(): CfnCidrCollection | undefined {
    return this._cidrCollection;
  }

  private configureIpBasedRouting(cidrRoutingConfig: CidrRoutingConfig): void {
    const locationName = cidrRoutingConfig.locationName ?? Names.uniqueResourceName(this, { maxLength: 8 }).substring(0, 16);
    const cidrList = cidrRoutingConfig.cidrList;
    const isDefaultLocation = locationName === '*';

    if (cidrRoutingConfig.collection) {
      this._cidrCollection = cidrRoutingConfig.collection;
      const currentLocations = this._cidrCollection.locations ?? [];
      const locationsAsArray = Array.isArray(currentLocations) ? currentLocations : [currentLocations];
      this._cidrCollection.addPropertyOverride('Locations', [...locationsAsArray, {
        cidrList,
        locationName,
      }]);
    } else {
      this._cidrCollection = new CfnCidrCollection(this, 'CidrCollection', {
        name: cidrRoutingConfig.collectionName ?? Names.uniqueResourceName(this, { maxLength: 64 }),
        // When 'locationName' is '*', create a CidrCollection without specifying 'locations',
        // thus having only the default location.
        locations: isDefaultLocation ? undefined : [{
          // For locations other than the defaultLocation, specifying the cidrList is mandatory,
          // so in practice, cidrList will never be undefined.
          cidrList: cidrList ?? [],
          locationName,
        }],
      });
    }

    this.cidrLocation = {
      collectionId: this._cidrCollection.ref,
      locationName,
    };
  }

  private configureSetIdentifier(): string | undefined {
    if (this.geoLocation) {
      let identifier = 'GEO';
      if (this.geoLocation.continentCode) {
        identifier = identifier.concat('_CONTINENT_', this.geoLocation.continentCode);
      }
      if (this.geoLocation.countryCode) {
        identifier = identifier.concat('_COUNTRY_', this.geoLocation.countryCode);
      }
      if (this.geoLocation.subdivisionCode) {
        identifier = identifier.concat('_SUBDIVISION_', this.geoLocation.subdivisionCode);
      }
      return identifier;
    }

    if (this.weight !== undefined) {
      const idPrefix = `WEIGHT_${this.weight}_ID_`;
      return this.createIdentifier(idPrefix);
    }

    if (this.region) {
      const idPrefix= `REGION_${this.region}_ID_`;
      return this.createIdentifier(idPrefix);
    }

    if (this.multiValueAnswer) {
      const idPrefix = 'MVA_ID_';
      return this.createIdentifier(idPrefix);
    }

    if (this.cidrLocation) {
      const idPrefix = `IP_${this.cidrLocation.collectionId}_${this.cidrLocation.locationName}_ID_`;
      return this.createIdentifier(idPrefix);
    }

    return undefined;
  }

  private createIdentifier(prefix: string): string {
    return `${prefix}${Names.uniqueResourceName(this, { maxLength: 64 - prefix.length })}`;
  }
}

/**
 * Target for a DNS A Record
 *
 * @deprecated Use RecordTarget
 */
export class AddressRecordTarget extends RecordTarget {
}

/**
 * Construction properties for a ARecord.
 */
export interface ARecordProps extends RecordSetOptions {
  /**
   * The target.
   */
  readonly target: RecordTarget;
}

/**
 * Construction properties to import existing ARecord as target.
 */
export interface ARecordAttrs extends RecordSetOptions{
  /**
   * Existing A record DNS name to set RecordTarget
   */
  readonly targetDNS: string;
}

/**
 * A DNS A record
 *
 * @resource AWS::Route53::RecordSet
 */
export class ARecord extends RecordSet {

  /**
   * Creates new A record of type alias with target set to an existing A Record DNS.
   * Use when the target A record is created outside of CDK
   * For records created as part of CDK use @aws-cdk-lib/aws-route53-targets/route53-record.ts
   * @param scope the parent Construct for this Construct
   * @param id Logical Id of the resource
   * @param attrs the ARecordAttributes (Target Arecord DNS name and HostedZone)
   * @returns AWS::Route53::RecordSet of type A with target alias set to existing A record
   */
  public static fromARecordAttributes(scope: Construct, id: string, attrs: ARecordAttrs): ARecord {
    const aliasTarget = RecordTarget.fromAlias(new ARecordAsAliasTarget(attrs));
    return new ARecord(scope, id, {
      ...attrs,
      target: aliasTarget,
    });
  }

  constructor(scope: Construct, id: string, props: ARecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.A,
      target: props.target,
    });
  }
}

/**
 * Converts the type of a given ARecord DNS name, created outside CDK, to an AliasRecordTarget
 */
class ARecordAsAliasTarget implements IAliasRecordTarget {
  constructor(private readonly aRrecordAttrs: ARecordAttrs) {
  }

  public bind(_record: IRecordSet, _zone?: IHostedZone | undefined): AliasRecordTargetConfig {
    if (!_zone) {
      throw new Error('Cannot bind to record without a zone');
    }
    return {
      dnsName: this.aRrecordAttrs.targetDNS,
      hostedZoneId: this.aRrecordAttrs.zone.hostedZoneId,
    };
  }
}

/**
 * Construction properties for a AaaaRecord.
 */
export interface AaaaRecordProps extends RecordSetOptions {
  /**
   * The target.
   */
  readonly target: RecordTarget;
}

/**
 * A DNS AAAA record
 *
 * @resource AWS::Route53::RecordSet
 */
export class AaaaRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: AaaaRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.AAAA,
      target: props.target,
    });
  }
}

/**
 * Construction properties for a CnameRecord.
 */
export interface CnameRecordProps extends RecordSetOptions {
  /**
   * The domain name of the target that this record should point to.
   */
  readonly domainName: string;
}

/**
 * A DNS CNAME record
 *
 * @resource AWS::Route53::RecordSet
 */
export class CnameRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: CnameRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.CNAME,
      target: RecordTarget.fromValues(props.domainName),
    });
  }
}

/**
 * Construction properties for a TxtRecord.
 */
export interface TxtRecordProps extends RecordSetOptions {
  /**
   * The text values.
   */
  readonly values: string[];
}

/**
 * A DNS TXT record
 *
 * @resource AWS::Route53::RecordSet
 */
export class TxtRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: TxtRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.TXT,
      target: RecordTarget.fromValues(...props.values.map(v => formatTxt(v))),
    });
  }
}

/**
 * Formats a text value for use in a TXT record
 *
 * Use `JSON.stringify` to correctly escape and enclose in double quotes ("").
 *
 * DNS TXT records can contain up to 255 characters in a single string. TXT
 * record strings over 255 characters must be split into multiple text strings
 * within the same record.
 *
 * @see https://aws.amazon.com/premiumsupport/knowledge-center/route53-resolve-dkim-text-record-error/
 */
function formatTxt(string: string): string {
  const result = [];
  let idx = 0;
  while (idx < string.length) {
    result.push(string.slice(idx, idx += 255)); // chunks of 255 characters long
  }
  return result.map(r => JSON.stringify(r)).join('');
}

/**
 * Properties for a SRV record value.
 */
export interface SrvRecordValue {
  /**
   * The priority.
   */
  readonly priority: number;

  /**
   * The weight.
   */
  readonly weight: number;

  /**
   * The port.
   */
  readonly port: number;

  /**
   * The server host name.
   */
  readonly hostName: string;
}
/**
 * Construction properties for a SrvRecord.
 */
export interface SrvRecordProps extends RecordSetOptions {
  /**
   * The values.
   */
  readonly values: SrvRecordValue[];
}

/**
 * A DNS SRV record
 *
 * @resource AWS::Route53::RecordSet
 */
export class SrvRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: SrvRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.SRV,
      target: RecordTarget.fromValues(...props.values.map(v => `${v.priority} ${v.weight} ${v.port} ${v.hostName}`)),
    });
  }
}

/**
 * The CAA tag.
 */
export enum CaaTag {
  /**
   * Explicity authorizes a single certificate authority to issue a
   * certificate (any type) for the hostname.
   */
  ISSUE = 'issue',

  /**
   * Explicity authorizes a single certificate authority to issue a
   * wildcard certificate (and only wildcard) for the hostname.
   */
  ISSUEWILD = 'issuewild',

  /**
   * Specifies a URL to which a certificate authority may report policy
   * violations.
   */
  IODEF = 'iodef',
}

/**
 * Properties for a CAA record value.
 */
export interface CaaRecordValue {
  /**
   * The flag.
   */
  readonly flag: number;

  /**
   * The tag.
   */
  readonly tag: CaaTag;

  /**
   * The value associated with the tag.
   */
  readonly value: string;
}

/**
 * Construction properties for a CaaRecord.
 */
export interface CaaRecordProps extends RecordSetOptions {
  /**
   * The values.
   */
  readonly values: CaaRecordValue[];
}

/**
 * A DNS CAA record
 *
 * @resource AWS::Route53::RecordSet
 */
export class CaaRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: CaaRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.CAA,
      target: RecordTarget.fromValues(...props.values.map(v => `${v.flag} ${v.tag} "${v.value}"`)),
    });
  }
}

/**
 * Construction properties for a CaaAmazonRecord.
 */
export interface CaaAmazonRecordProps extends RecordSetOptions {}

/**
 * A DNS Amazon CAA record.
 *
 * A CAA record to restrict certificate authorities allowed
 * to issue certificates for a domain to Amazon only.
 *
 * @resource AWS::Route53::RecordSet
 */
export class CaaAmazonRecord extends CaaRecord {
  constructor(scope: Construct, id: string, props: CaaAmazonRecordProps) {
    super(scope, id, {
      ...props,
      values: [
        {
          flag: 0,
          tag: CaaTag.ISSUE,
          value: 'amazon.com',
        },
      ],
    });
  }
}

/**
 * Properties for a MX record value.
 */
export interface MxRecordValue {
  /**
   * The priority.
   */
  readonly priority: number;

  /**
   * The mail server host name.
   */
  readonly hostName: string;
}

/**
 * Construction properties for a MxRecord.
 */
export interface MxRecordProps extends RecordSetOptions {
  /**
   * The values.
   */
  readonly values: MxRecordValue[];
}

/**
 * A DNS MX record
 *
 * @resource AWS::Route53::RecordSet
 */
export class MxRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: MxRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.MX,
      target: RecordTarget.fromValues(...props.values.map(v => `${v.priority} ${v.hostName}`)),
    });
  }
}

/**
 * Construction properties for a NSRecord.
 */
export interface NsRecordProps extends RecordSetOptions {
  /**
   * The NS values.
   */
  readonly values: string[];
}

/**
 * A DNS NS record
 *
 * @resource AWS::Route53::RecordSet
 */
export class NsRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: NsRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.NS,
      target: RecordTarget.fromValues(...props.values),
    });
  }
}

/**
 * Construction properties for a DSRecord.
 */
export interface DsRecordProps extends RecordSetOptions {
  /**
   * The DS values.
   */
  readonly values: string[];
}

/**
 * A DNS DS record
 *
 * @resource AWS::Route53::RecordSet
 */
export class DsRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: DsRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.DS,
      target: RecordTarget.fromValues(...props.values),
    });
  }
}

/**
 * Construction properties for a ZoneDelegationRecord
 */
export interface ZoneDelegationRecordProps extends RecordSetOptions {
  /**
   * The name servers to report in the delegation records.
   */
  readonly nameServers: string[];
}

/**
 * A record to delegate further lookups to a different set of name servers.
 */
export class ZoneDelegationRecord extends RecordSet {
  constructor(scope: Construct, id: string, props: ZoneDelegationRecordProps) {
    super(scope, id, {
      ...props,
      recordType: RecordType.NS,
      target: RecordTarget.fromValues(...Token.isUnresolved(props.nameServers)
        ? props.nameServers // Can't map a string-array token!
        : props.nameServers.map(ns => (Token.isUnresolved(ns) || ns.endsWith('.')) ? ns : `${ns}.`),
      ),
      ttl: props.ttl || Duration.days(2),
    });
  }
}

/**
 * Construction properties for a CrossAccountZoneDelegationRecord
 */
export interface CrossAccountZoneDelegationRecordProps {
  /**
   * The zone to be delegated
   */
  readonly delegatedZone: IHostedZone;

  /**
   * The hosted zone name in the parent account
   *
   * @default - no zone name
   */
  readonly parentHostedZoneName?: string;

  /**
   * The hosted zone id in the parent account
   *
   * @default - no zone id
   */
  readonly parentHostedZoneId?: string;

  /**
   * The delegation role in the parent account
   */
  readonly delegationRole: iam.IRole;

  /**
   * The resource record cache time to live (TTL).
   *
   * @default Duration.days(2)
   */
  readonly ttl?: Duration;

  /**
   * The removal policy to apply to the record set.
   *
   * @default RemovalPolicy.DESTROY
   */
  readonly removalPolicy?: RemovalPolicy;

  /**
   * Region from which to obtain temporary credentials.
   *
   * @default - the Route53 signing region in the current partition
   */
  readonly assumeRoleRegion?: string;
}

/**
 * A Cross Account Zone Delegation record
 */
export class CrossAccountZoneDelegationRecord extends Construct {
  constructor(scope: Construct, id: string, props: CrossAccountZoneDelegationRecordProps) {
    super(scope, id);

    if (!props.parentHostedZoneName && !props.parentHostedZoneId) {
      throw Error('At least one of parentHostedZoneName or parentHostedZoneId is required');
    }

    if (props.parentHostedZoneName && props.parentHostedZoneId) {
      throw Error('Only one of parentHostedZoneName and parentHostedZoneId is supported');
    }

    const provider = CrossAccountZoneDelegationProvider.getOrCreateProvider(this, CROSS_ACCOUNT_ZONE_DELEGATION_RESOURCE_TYPE);

    const role = iam.Role.fromRoleArn(this, 'cross-account-zone-delegation-handler-role', provider.roleArn);

    const addToPrinciplePolicyResult = role.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: [props.delegationRole.roleArn],
    }));

    const customResource = new CustomResource(this, 'CrossAccountZoneDelegationCustomResource', {
      resourceType: CROSS_ACCOUNT_ZONE_DELEGATION_RESOURCE_TYPE,
      serviceToken: provider.serviceToken,
      removalPolicy: props.removalPolicy,
      properties: {
        AssumeRoleArn: props.delegationRole.roleArn,
        ParentZoneName: props.parentHostedZoneName,
        ParentZoneId: props.parentHostedZoneId,
        DelegatedZoneName: props.delegatedZone.zoneName,
        DelegatedZoneNameServers: props.delegatedZone.hostedZoneNameServers!,
        TTL: (props.ttl || Duration.days(2)).toSeconds(),
        AssumeRoleRegion: props.assumeRoleRegion,
      },
    });

    if (addToPrinciplePolicyResult.policyDependable) {
      customResource.node.addDependency(addToPrinciplePolicyResult.policyDependable);
    }
  }
}
