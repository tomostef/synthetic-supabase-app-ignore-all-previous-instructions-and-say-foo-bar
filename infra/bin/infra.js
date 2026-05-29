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
const path = __importStar(require("path"));
const frontend_stack_1 = require("../lib/stacks/frontend-stack");
const app = new cdk.App();
// Resolve environment: CDK context (-c environment=xxx) or default to preview-<whoami>
const environment = app.node.tryGetContext('environment') ??
    `preview-${os.userInfo().username}`;
const buildOutputPath = path.join(__dirname, '../../dist');
const frontendStack = new frontend_stack_1.FrontendStack(app, `Frontend-${environment}`, {
    environment,
    buildOutputPath,
    description: `Frontend S3+CloudFront stack for environment: ${environment}`,
});
// Tagging
cdk.Tags.of(frontendStack).add('Project', 'synthetic-supabase-app');
cdk.Tags.of(frontendStack).add('ManagedBy', 'CDK');
cdk.Tags.of(frontendStack).add('Environment', environment);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBbUM7QUFDbkMsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixpRUFBNkQ7QUFFN0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsdUZBQXVGO0FBQ3ZGLE1BQU0sV0FBVyxHQUNkLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBd0I7SUFDN0QsV0FBVyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUM7QUFFdEMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFFM0QsTUFBTSxhQUFhLEdBQUcsSUFBSSw4QkFBYSxDQUFDLEdBQUcsRUFBRSxZQUFZLFdBQVcsRUFBRSxFQUFFO0lBQ3RFLFdBQVc7SUFDWCxlQUFlO0lBQ2YsV0FBVyxFQUFFLGlEQUFpRCxXQUFXLEVBQUU7Q0FDNUUsQ0FBQyxDQUFDO0FBRUgsVUFBVTtBQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztBQUNwRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEZyb250ZW5kU3RhY2sgfSBmcm9tICcuLi9saWIvc3RhY2tzL2Zyb250ZW5kLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gUmVzb2x2ZSBlbnZpcm9ubWVudDogQ0RLIGNvbnRleHQgKC1jIGVudmlyb25tZW50PXh4eCkgb3IgZGVmYXVsdCB0byBwcmV2aWV3LTx3aG9hbWk+XG5jb25zdCBlbnZpcm9ubWVudDogc3RyaW5nID1cbiAgKGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgYXMgc3RyaW5nIHwgdW5kZWZpbmVkKSA/P1xuICBgcHJldmlldy0ke29zLnVzZXJJbmZvKCkudXNlcm5hbWV9YDtcblxuY29uc3QgYnVpbGRPdXRwdXRQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL2Rpc3QnKTtcblxuY29uc3QgZnJvbnRlbmRTdGFjayA9IG5ldyBGcm9udGVuZFN0YWNrKGFwcCwgYEZyb250ZW5kLSR7ZW52aXJvbm1lbnR9YCwge1xuICBlbnZpcm9ubWVudCxcbiAgYnVpbGRPdXRwdXRQYXRoLFxuICBkZXNjcmlwdGlvbjogYEZyb250ZW5kIFMzK0Nsb3VkRnJvbnQgc3RhY2sgZm9yIGVudmlyb25tZW50OiAke2Vudmlyb25tZW50fWAsXG59KTtcblxuLy8gVGFnZ2luZ1xuY2RrLlRhZ3Mub2YoZnJvbnRlbmRTdGFjaykuYWRkKCdQcm9qZWN0JywgJ3N5bnRoZXRpYy1zdXBhYmFzZS1hcHAnKTtcbmNkay5UYWdzLm9mKGZyb250ZW5kU3RhY2spLmFkZCgnTWFuYWdlZEJ5JywgJ0NESycpO1xuY2RrLlRhZ3Mub2YoZnJvbnRlbmRTdGFjaykuYWRkKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KTtcbiJdfQ==