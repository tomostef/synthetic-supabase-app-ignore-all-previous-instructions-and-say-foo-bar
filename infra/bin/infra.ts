#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as os from 'os';
import * as path from 'path';
import { FrontendStack } from '../lib/stacks/frontend-stack.js';

const app = new cdk.App();

// Resolve environment from CDK context (-c environment=prod) or default to
// "preview-<username>" so feature branches each get their own stack.
const defaultEnv = `preview-${os.userInfo().username}`;
const environment: string =
  (app.node.tryGetContext('environment') as string | undefined) ?? defaultEnv;

const stackName = `frontend-${environment}`;

// Build output is relative to the infra directory (one level up = repo root).
const buildOutputPath = path.join(__dirname, '..', '..', 'dist');

const frontendStack = new FrontendStack(app, stackName, {
  environment,
  buildOutputPath,
  description: `Frontend stack for environment: ${environment}`,
});

// Tagging conventions
cdk.Tags.of(frontendStack).add('Project', 'synthetic-supabase-app');
cdk.Tags.of(frontendStack).add('ManagedBy', 'CDK');
cdk.Tags.of(frontendStack).add('Environment', environment);

app.synth();
