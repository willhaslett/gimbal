import * as cdk from 'aws-cdk-lib/core';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as apprunner from '@aws-cdk/aws-apprunner-alpha';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // === S3: Static site bucket ===
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `prodaic-site-${this.account}`,
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPA fallback
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // === S3: Project files bucket ===
    const projectFilesBucket = new s3.Bucket(this, 'ProjectFilesBucket', {
      bucketName: `prodaic-projects-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Keep user data
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // === VPC for RDS ===
    const vpc = new ec2.Vpc(this, 'ProdaicVpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    // === RDS Postgres ===
    // NOTE: Currently publicly accessible for preview phase.
    // TODO before GA: Add VPC Connector for App Runner and move RDS to private subnet.
    // This will cost ~$30/mo but keeps the database off the public internet.
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Security group for Prodaic RDS',
      allowAllOutbound: true,
    });

    // Allow inbound Postgres from anywhere (secured by credentials)
    // TODO before GA: Restrict to VPC Connector security group only
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow Postgres from anywhere (preview only)'
    );

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      securityGroups: [dbSecurityGroup],
      publiclyAccessible: true, // TODO before GA: Set to false and use VPC Connector
      databaseName: 'prodaic',
      credentials: rds.Credentials.fromGeneratedSecret('prodaic_admin'),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      deletionProtection: false, // TODO before GA: Set to true
    });

    // === Secrets for App Runner ===
    // Store Anthropic API key (you'll set this manually after deploy)
    const anthropicApiKey = new secretsmanager.Secret(this, 'AnthropicApiKey', {
      secretName: 'prodaic/anthropic-api-key',
      description: 'Anthropic API key for Claude',
    });

    // === App Runner Service ===
    // Build Docker image from server package
    const serverImage = new ecr_assets.DockerImageAsset(this, 'ServerImage', {
      directory: path.join(__dirname, '../../packages/server'),
    });

    // IAM role for App Runner to access S3 and Secrets
    const appRunnerRole = new iam.Role(this, 'AppRunnerRole', {
      assumedBy: new iam.ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });
    projectFilesBucket.grantReadWrite(appRunnerRole);
    anthropicApiKey.grantRead(appRunnerRole);
    database.secret?.grantRead(appRunnerRole);

    const appRunnerService = new apprunner.Service(this, 'AppRunnerService', {
      serviceName: 'prodaic-api',
      source: apprunner.Source.fromAsset({
        imageConfiguration: {
          port: 3001,
          environmentVariables: {
            NODE_ENV: 'production',
            PROJECT_FILES_BUCKET: projectFilesBucket.bucketName,
          },
          environmentSecrets: {
            ANTHROPIC_API_KEY: apprunner.Secret.fromSecretsManager(anthropicApiKey),
            DATABASE_SECRET_ARN: apprunner.Secret.fromSecretsManager(database.secret!),
          },
        },
        asset: serverImage,
      }),
      instanceRole: appRunnerRole,
      cpu: apprunner.Cpu.QUARTER_VCPU,
      memory: apprunner.Memory.HALF_GB,
    });

    // App Runner connects to RDS over public internet (preview phase)
    // See TODOs above for GA hardening

    // === Outputs ===
    new cdk.CfnOutput(this, 'SiteBucketUrl', {
      value: siteBucket.bucketWebsiteUrl,
      description: 'Static site URL (configure in Cloudflare DNS)',
    });

    new cdk.CfnOutput(this, 'SiteBucketName', {
      value: siteBucket.bucketName,
      description: 'S3 bucket name for deploying React app',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: appRunnerService.serviceUrl,
      description: 'App Runner API URL (configure in Cloudflare DNS)',
    });

    new cdk.CfnOutput(this, 'ProjectFilesBucketName', {
      value: projectFilesBucket.bucketName,
      description: 'S3 bucket for project files',
    });

    new cdk.CfnOutput(this, 'DatabaseEndpoint', {
      value: database.instanceEndpoint.hostname,
      description: 'RDS Postgres endpoint',
    });

    new cdk.CfnOutput(this, 'DatabaseSecretArn', {
      value: database.secret?.secretArn || '',
      description: 'ARN of database credentials secret',
    });
  }
}
