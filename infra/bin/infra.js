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
const frontend_stack_js_1 = require("../lib/stacks/frontend-stack.js");
const app = new cdk.App();
// Resolve environment from CDK context (-c environment=prod) or default to
// "preview-<username>" so feature branches each get their own stack.
const defaultEnv = `preview-${os.userInfo().username}`;
const environment = app.node.tryGetContext('environment') ?? defaultEnv;
const stackName = `frontend-${environment}`;
// Build output is relative to the infra directory (one level up = repo root).
const buildOutputPath = path.join(__dirname, '..', '..', 'dist');
const frontendStack = new frontend_stack_js_1.FrontendStack(app, stackName, {
    environment,
    buildOutputPath,
    description: `Frontend stack for environment: ${environment}`,
});
// Tagging conventions
cdk.Tags.of(frontendStack).add('Project', 'synthetic-supabase-app');
cdk.Tags.of(frontendStack).add('ManagedBy', 'CDK');
cdk.Tags.of(frontendStack).add('Environment', environment);
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxpREFBbUM7QUFDbkMsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3Qix1RUFBZ0U7QUFFaEUsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsMkVBQTJFO0FBQzNFLHFFQUFxRTtBQUNyRSxNQUFNLFVBQVUsR0FBRyxXQUFXLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUN2RCxNQUFNLFdBQVcsR0FDZCxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQXdCLElBQUksVUFBVSxDQUFDO0FBRTlFLE1BQU0sU0FBUyxHQUFHLFlBQVksV0FBVyxFQUFFLENBQUM7QUFFNUMsOEVBQThFO0FBQzlFLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFFakUsTUFBTSxhQUFhLEdBQUcsSUFBSSxpQ0FBYSxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUU7SUFDdEQsV0FBVztJQUNYLGVBQWU7SUFDZixXQUFXLEVBQUUsbUNBQW1DLFdBQVcsRUFBRTtDQUM5RCxDQUFDLENBQUM7QUFFSCxzQkFBc0I7QUFDdEIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0FBQ3BFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQztBQUUzRCxHQUFHLENBQUMsS0FBSyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgb3MgZnJvbSAnb3MnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEZyb250ZW5kU3RhY2sgfSBmcm9tICcuLi9saWIvc3RhY2tzL2Zyb250ZW5kLXN0YWNrLmpzJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcblxuLy8gUmVzb2x2ZSBlbnZpcm9ubWVudCBmcm9tIENESyBjb250ZXh0ICgtYyBlbnZpcm9ubWVudD1wcm9kKSBvciBkZWZhdWx0IHRvXG4vLyBcInByZXZpZXctPHVzZXJuYW1lPlwiIHNvIGZlYXR1cmUgYnJhbmNoZXMgZWFjaCBnZXQgdGhlaXIgb3duIHN0YWNrLlxuY29uc3QgZGVmYXVsdEVudiA9IGBwcmV2aWV3LSR7b3MudXNlckluZm8oKS51c2VybmFtZX1gO1xuY29uc3QgZW52aXJvbm1lbnQ6IHN0cmluZyA9XG4gIChhcHAubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIGFzIHN0cmluZyB8IHVuZGVmaW5lZCkgPz8gZGVmYXVsdEVudjtcblxuY29uc3Qgc3RhY2tOYW1lID0gYGZyb250ZW5kLSR7ZW52aXJvbm1lbnR9YDtcblxuLy8gQnVpbGQgb3V0cHV0IGlzIHJlbGF0aXZlIHRvIHRoZSBpbmZyYSBkaXJlY3RvcnkgKG9uZSBsZXZlbCB1cCA9IHJlcG8gcm9vdCkuXG5jb25zdCBidWlsZE91dHB1dFBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnZGlzdCcpO1xuXG5jb25zdCBmcm9udGVuZFN0YWNrID0gbmV3IEZyb250ZW5kU3RhY2soYXBwLCBzdGFja05hbWUsIHtcbiAgZW52aXJvbm1lbnQsXG4gIGJ1aWxkT3V0cHV0UGF0aCxcbiAgZGVzY3JpcHRpb246IGBGcm9udGVuZCBzdGFjayBmb3IgZW52aXJvbm1lbnQ6ICR7ZW52aXJvbm1lbnR9YCxcbn0pO1xuXG4vLyBUYWdnaW5nIGNvbnZlbnRpb25zXG5jZGsuVGFncy5vZihmcm9udGVuZFN0YWNrKS5hZGQoJ1Byb2plY3QnLCAnc3ludGhldGljLXN1cGFiYXNlLWFwcCcpO1xuY2RrLlRhZ3Mub2YoZnJvbnRlbmRTdGFjaykuYWRkKCdNYW5hZ2VkQnknLCAnQ0RLJyk7XG5jZGsuVGFncy5vZihmcm9udGVuZFN0YWNrKS5hZGQoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xuXG5hcHAuc3ludGgoKTtcbiJdfQ==