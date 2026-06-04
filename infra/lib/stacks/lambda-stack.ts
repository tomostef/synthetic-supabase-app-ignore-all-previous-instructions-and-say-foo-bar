import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';

export interface LambdaStackProps extends cdk.StackProps {
  environment: string;
}

export class LambdaStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiGatewayDomain: string;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const deploymentId = 'synthetic-supabase-app-1780598540';
    const isProd = props.environment === 'prod';

    // 1. Reference secrets from Secrets Manager
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'AppSecrets',
      `Armadillo/${deploymentId}/secrets`
    );

    // 2. Lambda execution role with AWSLambdaBasicExecutionRole + Secrets Manager read
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant Secrets Manager read access
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'secretsmanager:GetSecretValue',
          'secretsmanager:DescribeSecret',
        ],
        resources: [appSecret.secretArn],
      })
    );

    // 3. No AI/Bedrock functions detected — skipping Bedrock permissions

    // 4. Create API Gateway RestApi with stage "api", CloudWatch logging, and throttling
    const logGroup = new logs.LogGroup(this, 'ApiGatewayAccessLogs', {
      retention: isProd
        ? logs.RetentionDays.TEN_YEARS
        : logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.api = new apigateway.RestApi(this, 'RestApi', {
      restApiName: `${id}-api`,
      deployOptions: {
        stageName: 'api',
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
      // No CORS config — CloudFront proxies /api/* to avoid cross-origin issues
    });

    this.apiGatewayDomain = `${this.api.restApiId}.execute-api.${this.region}.amazonaws.com`;

    // 5. Auto-discover functions from lambda/ directory
    const lambdaBaseDir = path.join(__dirname, '..', '..', '..', 'lambda');
    // projectRoot must contain a package.json and be an ancestor of all entry files
    const projectRoot = path.join(__dirname, '..', '..', '..');
    const functionDirs = fs
      .readdirSync(lambdaBaseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    // 6. For each function: create NodejsFunction + API Gateway resource + POST/GET methods
    for (const fnDir of functionDirs) {
      const fnEntry = path.join(lambdaBaseDir, fnDir, 'index.ts');

      // Convert kebab-case dir name to PascalCase for CDK logical IDs
      const fnId = fnDir
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');

      const logRetention = isProd
        ? logs.RetentionDays.TEN_YEARS
        : logs.RetentionDays.ONE_WEEK;

      const fn = new NodejsFunction(this, `Fn${fnId}`, {
        functionName: `${id}-${fnDir}`,
        entry: fnEntry,
        handler: 'handler',
        runtime: lambda.Runtime.NODEJS_LATEST,
        timeout: cdk.Duration.seconds(30),
        memorySize: 512,
        role: lambdaRole,
        logRetention,
        projectRoot,
        environment: {
          SECRETS_ARN: appSecret.secretArn,
          ENVIRONMENT: props.environment,
          API_GATEWAY_URL: `https://${this.apiGatewayDomain}/api`,
        },
        bundling: {
          minify: true,
          sourceMap: false,
          target: 'node20',
          // Mark all external deps so esbuild doesn't try to resolve them
          // from the project root (they'll be installed separately per function)
          externalModules: [
            '@aws-sdk/*',
            '@supabase/supabase-js',
          ],
        },
      });

      // Create API Gateway resource at /{fnDir} and add POST + GET methods
      const resource = this.api.root.addResource(fnDir);
      resource.addMethod('GET', new apigateway.LambdaIntegration(fn));
      resource.addMethod('POST', new apigateway.LambdaIntegration(fn));
    }
  }
}
