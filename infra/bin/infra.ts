#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as os from 'os';
import * as path from 'path';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

// Resolve environment: CDK context (-c environment=xxx) or default to preview-<whoami>
const environment: string =
  (app.node.tryGetContext('environment') as string | undefined) ??
  `preview-${os.userInfo().username}`;

const buildOutputPath = path.join(__dirname, '../../dist');

const frontendStack = new FrontendStack(app, `Frontend-${environment}`, {
  environment,
  buildOutputPath,
  description: `Frontend S3+CloudFront stack for environment: ${environment}`,
});

// Tagging
cdk.Tags.of(frontendStack).add('Project', 'synthetic-supabase-app');
cdk.Tags.of(frontendStack).add('ManagedBy', 'CDK');
cdk.Tags.of(frontendStack).add('Environment', environment);
