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
// Resolve environment: CDK context value takes precedence, then env var, then preview-<whoami>
const environment = app.node.tryGetContext('environment') ??
    process.env.ENVIRONMENT ??
    `preview-${os.userInfo().username}`;
const frontendStack = new frontend_stack_1.FrontendStack(app, `FrontendStack-${environment}`, {
    environment,
    buildOutputPath: '../dist',
    description: `Frontend S3 + CloudFront stack – ${environment}`,
});
// ── Tags ──
cdk.Tags.of(frontendStack).add('Project', 'synthetic-supabase-app');
cdk.Tags.of(frontendStack).add('ManagedBy', 'CDK');
cdk.Tags.of(frontendStack).add('Environment', environment);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBbUM7QUFDbkMsdUNBQXlCO0FBQ3pCLGlFQUE2RDtBQUU3RCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUUxQiwrRkFBK0Y7QUFDL0YsTUFBTSxXQUFXLEdBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDO0lBQ3JDLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVztJQUN2QixXQUFXLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUV0QyxNQUFNLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsR0FBRyxFQUFFLGlCQUFpQixXQUFXLEVBQUUsRUFBRTtJQUMzRSxXQUFXO0lBQ1gsZUFBZSxFQUFFLFNBQVM7SUFDMUIsV0FBVyxFQUFFLG9DQUFvQyxXQUFXLEVBQUU7Q0FDL0QsQ0FBQyxDQUFDO0FBRUgsYUFBYTtBQUNiLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztBQUNwRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQ25ELEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHsgRnJvbnRlbmRTdGFjayB9IGZyb20gJy4uL2xpYi9zdGFja3MvZnJvbnRlbmQtc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyBSZXNvbHZlIGVudmlyb25tZW50OiBDREsgY29udGV4dCB2YWx1ZSB0YWtlcyBwcmVjZWRlbmNlLCB0aGVuIGVudiB2YXIsIHRoZW4gcHJldmlldy08d2hvYW1pPlxuY29uc3QgZW52aXJvbm1lbnQ6IHN0cmluZyA9XG4gIGFwcC5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgPz9cbiAgcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgPz9cbiAgYHByZXZpZXctJHtvcy51c2VySW5mbygpLnVzZXJuYW1lfWA7XG5cbmNvbnN0IGZyb250ZW5kU3RhY2sgPSBuZXcgRnJvbnRlbmRTdGFjayhhcHAsIGBGcm9udGVuZFN0YWNrLSR7ZW52aXJvbm1lbnR9YCwge1xuICBlbnZpcm9ubWVudCxcbiAgYnVpbGRPdXRwdXRQYXRoOiAnLi4vZGlzdCcsXG4gIGRlc2NyaXB0aW9uOiBgRnJvbnRlbmQgUzMgKyBDbG91ZEZyb250IHN0YWNrIOKAkyAke2Vudmlyb25tZW50fWAsXG59KTtcblxuLy8g4pSA4pSAIFRhZ3Mg4pSA4pSAXG5jZGsuVGFncy5vZihmcm9udGVuZFN0YWNrKS5hZGQoJ1Byb2plY3QnLCAnc3ludGhldGljLXN1cGFiYXNlLWFwcCcpO1xuY2RrLlRhZ3Mub2YoZnJvbnRlbmRTdGFjaykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG5jZGsuVGFncy5vZihmcm9udGVuZFN0YWNrKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuIl19