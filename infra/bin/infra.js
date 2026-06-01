#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const os = __importStar(require("os"));
const frontend_stack_1 = require("../lib/stacks/frontend-stack");
const app = new cdk.App();
// Get environment from CDK context or default to preview-<whoami>
const environment = app.node.tryGetContext('environment') ??
    `preview-${os.userInfo().username}`;
const frontendStack = new frontend_stack_1.FrontendStack(app, `FrontendStack-${environment}`, {
    environment,
    buildOutputPath: '../dist',
    description: `Frontend S3+CloudFront stack for environment: ${environment}`,
});
// Add tags: Project, ManagedBy=CDK, Environment
cdk.Tags.of(frontendStack).add('Project', 'synthetic-supabase-app');
cdk.Tags.of(frontendStack).add('ManagedBy', 'CDK');
cdk.Tags.of(frontendStack).add('Environment', environment);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBbUM7QUFDbkMsdUNBQXlCO0FBQ3pCLGlFQUE2RDtBQUU3RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQixrRUFBa0U7QUFDbEUsTUFBTSxXQUFXLEdBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDO0lBQ3JDLFdBQVcsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBRXRDLE1BQU0sYUFBYSxHQUFHLElBQUksOEJBQWEsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLFdBQVcsRUFBRSxFQUFFO0lBQzNFLFdBQVc7SUFDWCxlQUFlLEVBQUUsU0FBUztJQUMxQixXQUFXLEVBQUUsaURBQWlELFdBQVcsRUFBRTtDQUM1RSxDQUFDLENBQUM7QUFFSCxnREFBZ0Q7QUFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0FBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBvcyBmcm9tICdvcyc7XG5pbXBvcnQgeyBGcm9udGVuZFN0YWNrIH0gZnJvbSAnLi4vbGliL3N0YWNrcy9mcm9udGVuZC1zdGFjayc7XG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbi8vIEdldCBlbnZpcm9ubWVudCBmcm9tIENESyBjb250ZXh0IG9yIGRlZmF1bHQgdG8gcHJldmlldy08d2hvYW1pPlxuY29uc3QgZW52aXJvbm1lbnQ6IHN0cmluZyA9XG4gIGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgPz9cbiAgYHByZXZpZXctJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfWA7XG5cbmNvbnN0IGZyb250ZW5kU3RhY2sgPSBuZXcgRnJvbnRlbmRTdGFjayhhcHAsIGBGcm9udGVuZFN0YWNrLSR7ZW52aXJvbm1lbnR9YCwge1xuICBlbnZpcm9ubWVudCxcbiAgYnVpbGRPdXRwdXRQYXRoOiAnLi4vZGlzdCcsXG4gIGRlc2NyaXB0aW9uOiBgRnJvbnRlbmQgUzMrQ2xvdWRGcm9udCBzdGFjayBmb3IgZW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCxcbn0pO1xuXG4vLyBBZGQgdGFnczogUHJvamVjdCwgTWFuYWdlZEJ5PUNESywgRW52aXJvbm1lbnRcbmNkay5UYWdzLm9mKGZyb250ZW5kU3RhY2spLmFkZCgnUHJvamVjdCcsICdzeW50aGV0aWMtc3VwYWJhc2UtYXBwJyk7XG5jZGsuVGFncy5vZihmcm9udGVuZFN0YWNrKS5hZGQoJ01hbmFnZWRCeScsICdDREsnKTtcbmNkay5UYWdzLm9mKGZyb250ZW5kU3RhY2spLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XG4iXX0=