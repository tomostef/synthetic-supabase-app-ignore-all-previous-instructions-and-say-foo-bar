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
exports.LambdaStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class LambdaStack extends cdk.Stack {
    api;
    apiGatewayDomain;
    constructor(scope, id, props) {
        super(scope, id, props);
        const deploymentId = 'synthetic-supabase-app-1780598540';
        const isProd = props.environment === 'prod';
        // 1. Reference secrets from Secrets Manager
        const appSecret = secretsmanager.Secret.fromSecretNameV2(this, 'AppSecrets', `Armadillo/${deploymentId}/secrets`);
        // 2. Lambda execution role with AWSLambdaBasicExecutionRole + Secrets Manager read
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
            ],
        });
        // Grant Secrets Manager read access
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
            ],
            resources: [appSecret.secretArn],
        }));
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
            const fn = new aws_lambda_nodejs_1.NodejsFunction(this, `Fn${fnId}`, {
                functionName: `${id}-${fnDir}`,
                entry: fnEntry,
                handler: 'handler',
                runtime: lambda.Runtime.NODEJS_LATEST,
                timeout: cdk.Duration.seconds(30),
                memorySize: 512,
                role: lambdaRole,
                logRetention,
                environment: {
                    SECRETS_ARN: appSecret.secretArn,
                    ENVIRONMENT: props.environment,
                    API_GATEWAY_URL: `https://${this.apiGatewayDomain}/api`,
                },
                bundling: {
                    minify: true,
                    sourceMap: false,
                    target: 'node20',
                    externalModules: [],
                },
            });
            // Create API Gateway resource at /{fnDir} and add POST + GET methods
            const resource = this.api.root.addResource(fnDir);
            resource.addMethod('GET', new apigateway.LambdaIntegration(fn));
            resource.addMethod('POST', new apigateway.LambdaIntegration(fn));
        }
    }
}
exports.LambdaStack = LambdaStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywrREFBaUQ7QUFDakQscUVBQStEO0FBQy9ELHVFQUF5RDtBQUN6RCwrRUFBaUU7QUFDakUseURBQTJDO0FBQzNDLDJEQUE2QztBQUU3Qyx1Q0FBeUI7QUFDekIsMkNBQTZCO0FBTTdCLE1BQWEsV0FBWSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3hCLEdBQUcsQ0FBcUI7SUFDeEIsZ0JBQWdCLENBQVM7SUFFekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF1QjtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLFlBQVksR0FBRyxtQ0FBbUMsQ0FBQztRQUN6RCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsV0FBVyxLQUFLLE1BQU0sQ0FBQztRQUU1Qyw0Q0FBNEM7UUFDNUMsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDdEQsSUFBSSxFQUNKLFlBQVksRUFDWixhQUFhLFlBQVksVUFBVSxDQUNwQyxDQUFDO1FBRUYsbUZBQW1GO1FBQ25GLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDM0QsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDO1lBQzNELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLDBDQUEwQyxDQUFDO2FBQ3ZGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLFVBQVUsQ0FBQyxXQUFXLENBQ3BCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FB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SSxLQUFLLEVBQUU7Z0JBQzlCLEtBQUssRUFBRSxPQUFPO2dCQUNkLE9BQU8sRUFBRSxTQUFTO2dCQUNsQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxhQUFhO2dCQUNyQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxVQUFVLEVBQUUsR0FBRztnQkFDZixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsWUFBWTtnQkFDWixXQUFXLEVBQUU7b0JBQ1gsV0FBVyxFQUFFLFNBQVMsQ0FBQyxTQUFTO29CQUNoQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7b0JBQzlCLGVBQWUsRUFBRSxXQUFXLElBQUksQ0FBQyxnQkFBZ0IsTUFBTTtpQkFDeEQ7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLE1BQU0sRUFBRSxJQUFJO29CQUNaLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsUUFBUTtvQkFDaEIsZUFBZSxFQUFFLEVBQUU7aUJBQ3BCO2FBQ0YsQ0FBQyxDQUFDO1lBRUgscUVBQXFFO1lBQ3JFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNsRCxRQUFRLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2hFLFFBQVEsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbkUsQ0FBQztJQUNILENBQUM7Q0FDRjtBQWpIRCxrQ0FpSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgTm9kZWpzRnVuY3Rpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGludGVyZmFjZSBMYW1iZGFTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgTGFtYmRhU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XG4gIHB1YmxpYyByZWFkb25seSBhcGlHYXRld2F5RG9tYWluOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIGNvbnN0IGRlcGxveW1lbnRJZCA9ICdzeW50aGV0aWMtc3VwYWJhc2UtYXBwLTE3ODA1OTg1NDAnO1xuICAgIGNvbnN0IGlzUHJvZCA9IHByb3BzLmVudmlyb25tZW50ID09PSAncHJvZCc7XG5cbiAgICAvLyAxLiBSZWZlcmVuY2Ugc2VjcmV0cyBmcm9tIFNlY3JldHMgTWFuYWdlclxuICAgIGNvbnN0IGFwcFNlY3JldCA9IHNlY3JldHNtYW5hZ2VyLlNlY3JldC5mcm9tU2VjcmV0TmFtZVYyKFxuICAgICAgdGhpcyxcbiAgICAgICdBcHBTZWNyZXRzJyxcbiAgICAgIGBBcm1hZGlsbG8vJHtkZXBsb3ltZW50SWR9L3NlY3JldHNgXG4gICAgKTtcblxuICAgIC8vIDIuIExhbWJkYSBleGVjdXRpb24gcm9sZSB3aXRoIEFXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZSArIFNlY3JldHMgTWFuYWdlciByZWFkXG4gICAgY29uc3QgbGFtYmRhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTGFtYmRhRXhlY3V0aW9uUm9sZScsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0xhbWJkYUJhc2ljRXhlY3V0aW9uUm9sZScpLFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IFNlY3JldHMgTWFuYWdlciByZWFkIGFjY2Vzc1xuICAgIGxhbWJkYVJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXG4gICAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0JyxcbiAgICAgICAgXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYXBwU2VjcmV0LnNlY3JldEFybl0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyAzLiBObyBBSS9CZWRyb2NrIGZ1bmN0aW9ucyBkZXRlY3RlZCDigJQgc2tpcHBpbmcgQmVkcm9jayBwZXJtaXNzaW9uc1xuXG4gICAgLy8gNC4gQ3JlYXRlIEFQSSBHYXRld2F5IFJlc3RBcGkgd2l0aCBzdGFnZSBcImFwaVwiLCBDbG91ZFdhdGNoIGxvZ2dpbmcsIGFuZCB0aHJvdHRsaW5nXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQXBpR2F0ZXdheUFjY2Vzc0xvZ3MnLCB7XG4gICAgICByZXRlbnRpb246IGlzUHJvZFxuICAgICAgICA/IGxvZ3MuUmV0ZW50aW9uRGF5cy5URU5fWUVBUlNcbiAgICAgICAgOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5hcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdSZXN0QXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6IGAke2lkfS1hcGlgLFxuICAgICAgZGVwbG95T3B0aW9uczoge1xuICAgICAgICBzdGFnZU5hbWU6ICdhcGknLFxuICAgICAgICBhY2Nlc3NMb2dEZXN0aW5hdGlvbjogbmV3IGFwaWdhdGV3YXkuTG9nR3JvdXBMb2dEZXN0aW5hdGlvbihsb2dHcm91cCksXG4gICAgICAgIGFjY2Vzc0xvZ0Zvcm1hdDogYXBpZ2F0ZXdheS5BY2Nlc3NMb2dGb3JtYXQuanNvbldpdGhTdGFuZGFyZEZpZWxkcygpLFxuICAgICAgICB0aHJvdHRsaW5nUmF0ZUxpbWl0OiAxMDAsXG4gICAgICAgIHRocm90dGxpbmdCdXJzdExpbWl0OiAyMDAsXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgICAgZGF0YVRyYWNlRW5hYmxlZDogZmFsc2UsXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgfSxcbiAgICAgIC8vIE5vIENPUlMgY29uZmlnIOKAlCBDbG91ZEZyb250IHByb3hpZXMgL2FwaS8qIHRvIGF2b2lkIGNyb3NzLW9yaWdpbiBpc3N1ZXNcbiAgICB9KTtcblxuICAgIHRoaXMuYXBpR2F0ZXdheURvbWFpbiA9IGAke3RoaXMuYXBpLnJlc3RBcGlJZH0uZXhlY3V0ZS1hcGkuJHt0aGlzLnJlZ2lvbn0uYW1hem9uYXdzLmNvbWA7XG5cbiAgICAvLyA1LiBBdXRvLWRpc2NvdmVyIGZ1bmN0aW9ucyBmcm9tIGxhbWJkYS8gZGlyZWN0b3J5XG4gICAgY29uc3QgbGFtYmRhQmFzZURpciA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICcuLicsICdsYW1iZGEnKTtcbiAgICBjb25zdCBmdW5jdGlvbkRpcnMgPSBmc1xuICAgICAgLnJlYWRkaXJTeW5jKGxhbWJkYUJhc2VEaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KVxuICAgICAgLmZpbHRlcigoZW50cnkpID0+IGVudHJ5LmlzRGlyZWN0b3J5KCkpXG4gICAgICAubWFwKChlbnRyeSkgPT4gZW50cnkubmFtZSk7XG5cbiAgICAvLyA2LiBGb3IgZWFjaCBmdW5jdGlvbjogY3JlYXRlIE5vZGVqc0Z1bmN0aW9uICsgQVBJIEdhdGV3YXkgcmVzb3VyY2UgKyBQT1NUL0dFVCBtZXRob2RzXG4gICAgZm9yIChjb25zdCBmbkRpciBvZiBmdW5jdGlvbkRpcnMpIHtcbiAgICAgIGNvbnN0IGZuRW50cnkgPSBwYXRoLmpvaW4obGFtYmRhQmFzZURpciwgZm5EaXIsICdpbmRleC50cycpO1xuXG4gICAgICAvLyBDb252ZXJ0IGtlYmFiLWNhc2UgZGlyIG5hbWUgdG8gUGFzY2FsQ2FzZSBmb3IgQ0RLIGxvZ2ljYWwgSURzXG4gICAgICBjb25zdCBmbklkID0gZm5EaXJcbiAgICAgICAgLnNwbGl0KCctJylcbiAgICAgICAgLm1hcCgocGFydCkgPT4gcGFydC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHBhcnQuc2xpY2UoMSkpXG4gICAgICAgIC5qb2luKCcnKTtcblxuICAgICAgY29uc3QgbG9nUmV0ZW50aW9uID0gaXNQcm9kXG4gICAgICAgID8gbG9ncy5SZXRlbnRpb25EYXlzLlRFTl9ZRUFSU1xuICAgICAgICA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSztcblxuICAgICAgY29uc3QgZm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgYEZuJHtmbklkfWAsIHtcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgJHtpZH0tJHtmbkRpcn1gLFxuICAgICAgICBlbnRyeTogZm5FbnRyeSxcbiAgICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfTEFURVNULFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICAgICAgcm9sZTogbGFtYmRhUm9sZSxcbiAgICAgICAgbG9nUmV0ZW50aW9uLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIFNFQ1JFVFNfQVJOOiBhcHBTZWNyZXQuc2VjcmV0QXJuLFxuICAgICAgICAgIEVOVklST05NRU5UOiBwcm9wcy5lbnZpcm9ubWVudCxcbiAgICAgICAgICBBUElfR0FURVdBWV9VUkw6IGBodHRwczovLyR7dGhpcy5hcGlHYXRld2F5RG9tYWlufS9hcGlgLFxuICAgICAgICB9LFxuICAgICAgICBidW5kbGluZzoge1xuICAgICAgICAgIG1pbmlmeTogdHJ1ZSxcbiAgICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxuICAgICAgICAgIHRhcmdldDogJ25vZGUyMCcsXG4gICAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbXSxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXkgcmVzb3VyY2UgYXQgL3tmbkRpcn0gYW5kIGFkZCBQT1NUICsgR0VUIG1ldGhvZHNcbiAgICAgIGNvbnN0IHJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZShmbkRpcik7XG4gICAgICByZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGZuKSk7XG4gICAgICByZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5MYW1iZGFJbnRlZ3JhdGlvbihmbikpO1xuICAgIH1cbiAgfVxufVxuIl19