#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as os from 'os';
import { FrontendStack } from '../lib/stacks/frontend-stack';

const app = new cdk.App();

// Resolve environment: CDK context value takes precedence, then env var, then preview-<whoami>
const environment: string =
  app.node.tryGetContext('environment') ??
  process.env.ENVIRONMENT ??
  `preview-${os.userInfo().username}`;

const frontendStack = new FrontendStack(app, `FrontendStack-${environment}`, {
  environment,
  buildOutputPath: '../dist',
  description: `Frontend S3 + CloudFront stack – ${environment}`,
});

// ── Tags ──
cdk.Tags.of(frontendStack).add('Project', 'synthetic-supabase-app');
cdk.Tags.of(frontendStack).add('ManagedBy', 'CDK');
cdk.Tags.of(frontendStack).add('Environment', environment);
