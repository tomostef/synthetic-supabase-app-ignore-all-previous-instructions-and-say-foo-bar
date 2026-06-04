#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as os from 'os';
import { LambdaStack } from '../lib/stacks/lambda-stack';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

// Resolve environment: CDK context value → fallback to "preview-<whoami>"
const environment: string =
  (app.node.tryGetContext('environment') as string | undefined) ??
  `preview-${os.userInfo().username}`;

// ------------------------------------------------------------------
// Stacks
// ------------------------------------------------------------------

// 1. Lambda + API Gateway stack
const lambdaStack = new LambdaStack(app, `LambdaStack-${environment}`, {
  environment,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});

// 2. Frontend stack (S3 + CloudFront + /api/* proxy)
//    Depends on LambdaStack for the API Gateway domain
const frontendStack = new FrontendStack(app, `FrontendStack-${environment}`, {
  environment,
  buildOutputPath: '../dist',
  apiGatewayDomain: lambdaStack.apiGatewayDomain,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'us-east-1',
  },
});

// FrontendStack depends on LambdaStack
frontendStack.addDependency(lambdaStack);

// ------------------------------------------------------------------
// Tags
// ------------------------------------------------------------------
const deploymentId = 'synthetic-supabase-app-1780598540';

cdk.Tags.of(app).add('Project', deploymentId);
cdk.Tags.of(app).add('ManagedBy', 'CDK');
cdk.Tags.of(app).add('Environment', environment);
