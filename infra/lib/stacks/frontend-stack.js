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
exports.FrontendStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const aws_cloudfront_s3_1 = require("@aws-solutions-constructs/aws-cloudfront-s3");
class FrontendStack extends cdk.Stack {
    distributionDomainName;
    constructor(scope, id, props) {
        super(scope, id, props);
        // ── 1. CloudFrontToS3 solution construct: S3 bucket + CloudFront with OAC ──
        const cloudFrontToS3 = new aws_cloudfront_s3_1.CloudFrontToS3(this, 'CloudFrontToS3', {
            insertHttpSecurityHeaders: false, // we manage CSP ourselves via CF Function
            cloudFrontDistributionProps: {
                defaultBehavior: {
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    compress: true,
                },
                // ── 2. SPA error responses: 403/404 → /index.html ──
                errorResponses: [
                    {
                        httpStatus: 403,
                        responseHttpStatus: 200,
                        responsePagePath: '/index.html',
                        ttl: cdk.Duration.seconds(0),
                    },
                    {
                        httpStatus: 404,
                        responseHttpStatus: 200,
                        responsePagePath: '/index.html',
                        ttl: cdk.Duration.seconds(0),
                    },
                ],
                // ── 6. Price class, HTTP versions, TLS ──
                priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
                httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
                minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
                comment: `Frontend distribution – ${props.environment}`,
            },
        });
        const distribution = cloudFrontToS3.cloudFrontWebDistribution;
        const bucket = cloudFrontToS3.s3BucketInterface;
        // ── 3. CSP CloudFront Function (permissive – allows third-party CDNs/APIs) ──
        const cspFunction = new cloudfront.Function(this, 'CspFunction', {
            functionName: `csp-headers-${props.environment}`,
            comment: 'Adds a permissive Content-Security-Policy header',
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            code: cloudfront.FunctionCode.fromInline(`
async function handler(event) {
  const response = event.response;
  const headers = response.headers;
  headers['content-security-policy'] = {
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  };
  return response;
}
`),
        });
        // Attach the CSP function as a viewer-response handler on the default cache behaviour
        // CloudFrontToS3 exposes the raw CfnDistribution; we patch it via an escape hatch.
        const cfnDist = distribution.node.defaultChild;
        cfnDist.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.FunctionAssociations', [
            {
                EventType: 'viewer-response',
                FunctionARN: cspFunction.functionArn,
            },
        ]);
        // ── 5. BucketDeployment: sync build output → S3, invalidate CloudFront cache ──
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset(props.buildOutputPath)],
            destinationBucket: bucket,
            distribution,
            distributionPaths: ['/*'],
            memoryLimit: 512,
            prune: true,
        });
        this.distributionDomainName = distribution.distributionDomainName;
        // ── Outputs ──
        new cdk.CfnOutput(this, 'CloudFrontURL', {
            value: `https://${distribution.distributionDomainName}`,
            description: 'CloudFront distribution URL',
            exportName: `${id}-CloudFrontURL`,
        });
        new cdk.CfnOutput(this, 'DistributionId', {
            value: distribution.distributionId,
            description: 'CloudFront distribution ID',
            exportName: `${id}-DistributionId`,
        });
    }
}
exports.FrontendStack = FrontendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRlbmQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmcm9udGVuZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdUVBQXlEO0FBRXpELHdFQUEwRDtBQUMxRCxtRkFBNkU7QUFRN0UsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsc0JBQXNCLENBQVM7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4RUFBOEU7UUFDOUUsTUFBTSxjQUFjLEdBQUcsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNoRSx5QkFBeUIsRUFBRSxLQUFLLEVBQUUsMENBQTBDO1lBQzVFLDJCQUEyQixFQUFFO2dCQUMzQixlQUFlLEVBQUU7b0JBQ2Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQjtvQkFDdkUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsaUJBQWlCO29CQUNyRCxRQUFRLEVBQUUsSUFBSTtpQkFDZjtnQkFDRCxzREFBc0Q7Z0JBQ3RELGNBQWMsRUFBRTtvQkFDZDt3QkFDRSxVQUFVLEVBQUUsR0FBRzt3QkFDZixrQkFBa0IsRUFBRSxHQUFHO3dCQUN2QixnQkFBZ0IsRUFBRSxhQUFhO3dCQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUM3QjtvQkFDRDt3QkFDRSxVQUFVLEVBQUUsR0FBRzt3QkFDZixrQkFBa0IsRUFBRSxHQUFHO3dCQUN2QixnQkFBZ0IsRUFBRSxhQUFhO3dCQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUM3QjtpQkFDRjtnQkFDRCwyQ0FBMkM7Z0JBQzNDLFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLGVBQWU7Z0JBQ2pELFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLFdBQVc7Z0JBQy9DLHNCQUFzQixFQUFFLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhO2dCQUN2RSxPQUFPLEVBQUUsMkJBQTJCLEtBQUssQ0FBQyxXQUFXLEVBQUU7YUFDeEQ7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMseUJBQXlCLENBQUM7UUFDOUQsTUFBTSxNQUFNLEdBQUcsY0FBYyxDQUFDLGlCQUFpQixDQUFDO1FBRWhELCtFQUErRTtRQUMvRSxNQUFNLFdBQVcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUMvRCxZQUFZLEVBQUUsZUFBZSxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ2hELE9BQU8sRUFBRSxrREFBa0Q7WUFDM0QsT0FBTyxFQUFFLFVBQVUsQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUMxQyxJQUFJLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FzQjlDLENBQUM7U0FDRyxDQUFDLENBQUM7UUFFSCxzRkFBc0Y7UUFDdEYsbUZBQW1GO1FBQ25GLE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBMEMsQ0FBQztRQUM3RSxPQUFPLENBQUMsbUJBQW1CLENBQ3pCLDhEQUE4RCxFQUM5RDtZQUNFO2dCQUNFLFNBQVMsRUFBRSxpQkFBaUI7Z0JBQzVCLFdBQVcsRUFBRSxXQUFXLENBQUMsV0FBVzthQUNyQztTQUNGLENBQ0YsQ0FBQztRQUVGLGlGQUFpRjtRQUNqRixJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ25ELE9BQU8sRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUN2RCxpQkFBaUIsRUFBRSxNQUFNO1lBQ3pCLFlBQVk7WUFDWixpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQztZQUN6QixXQUFXLEVBQUUsR0FBRztZQUNoQixLQUFLLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxzQkFBc0IsR0FBRyxZQUFZLENBQUMsc0JBQXNCLENBQUM7UUFFbEUsZ0JBQWdCO1FBQ2hCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxXQUFXLFlBQVksQ0FBQyxzQkFBc0IsRUFBRTtZQUN2RCxXQUFXLEVBQUUsNkJBQTZCO1lBQzFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCO1NBQ2xDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQ2xDLFdBQVcsRUFBRSw0QkFBNEI7WUFDekMsVUFBVSxFQUFFLEdBQUcsRUFBRSxpQkFBaUI7U0FDbkMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBN0dELHNDQTZHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgeyBDbG91ZEZyb250VG9TMyB9IGZyb20gJ0Bhd3Mtc29sdXRpb25zLWNvbnN0cnVjdHMvYXdzLWNsb3VkZnJvbnQtczMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnJvbnRlbmRTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBidWlsZE91dHB1dFBhdGg6IHN0cmluZzsgLy8gZS5nLiBcIi4uL2Rpc3RcIlxufVxuXG5leHBvcnQgY2xhc3MgRnJvbnRlbmRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb25Eb21haW5OYW1lOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEZyb250ZW5kU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8g4pSA4pSAIDEuIENsb3VkRnJvbnRUb1MzIHNvbHV0aW9uIGNvbnN0cnVjdDogUzMgYnVja2V0ICsgQ2xvdWRGcm9udCB3aXRoIE9BQyDilIDilIBcbiAgICBjb25zdCBjbG91ZEZyb250VG9TMyA9IG5ldyBDbG91ZEZyb250VG9TMyh0aGlzLCAnQ2xvdWRGcm9udFRvUzMnLCB7XG4gICAgICBpbnNlcnRIdHRwU2VjdXJpdHlIZWFkZXJzOiBmYWxzZSwgLy8gd2UgbWFuYWdlIENTUCBvdXJzZWx2ZXMgdmlhIENGIEZ1bmN0aW9uXG4gICAgICBjbG91ZEZyb250RGlzdHJpYnV0aW9uUHJvcHM6IHtcbiAgICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XG4gICAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXG4gICAgICAgICAgY29tcHJlc3M6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIC8vIOKUgOKUgCAyLiBTUEEgZXJyb3IgcmVzcG9uc2VzOiA0MDMvNDA0IOKGkiAvaW5kZXguaHRtbCDilIDilIBcbiAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICAvLyDilIDilIAgNi4gUHJpY2UgY2xhc3MsIEhUVFAgdmVyc2lvbnMsIFRMUyDilIDilIBcbiAgICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCxcbiAgICAgICAgaHR0cFZlcnNpb246IGNsb3VkZnJvbnQuSHR0cFZlcnNpb24uSFRUUDJfQU5EXzMsXG4gICAgICAgIG1pbmltdW1Qcm90b2NvbFZlcnNpb246IGNsb3VkZnJvbnQuU2VjdXJpdHlQb2xpY3lQcm90b2NvbC5UTFNfVjFfMl8yMDIxLFxuICAgICAgICBjb21tZW50OiBgRnJvbnRlbmQgZGlzdHJpYnV0aW9uIOKAkyAke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gY2xvdWRGcm9udFRvUzMuY2xvdWRGcm9udFdlYkRpc3RyaWJ1dGlvbjtcbiAgICBjb25zdCBidWNrZXQgPSBjbG91ZEZyb250VG9TMy5zM0J1Y2tldEludGVyZmFjZTtcblxuICAgIC8vIOKUgOKUgCAzLiBDU1AgQ2xvdWRGcm9udCBGdW5jdGlvbiAocGVybWlzc2l2ZSDigJMgYWxsb3dzIHRoaXJkLXBhcnR5IENETnMvQVBJcykg4pSA4pSAXG4gICAgY29uc3QgY3NwRnVuY3Rpb24gPSBuZXcgY2xvdWRmcm9udC5GdW5jdGlvbih0aGlzLCAnQ3NwRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6IGBjc3AtaGVhZGVycy0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBjb21tZW50OiAnQWRkcyBhIHBlcm1pc3NpdmUgQ29udGVudC1TZWN1cml0eS1Qb2xpY3kgaGVhZGVyJyxcbiAgICAgIHJ1bnRpbWU6IGNsb3VkZnJvbnQuRnVuY3Rpb25SdW50aW1lLkpTXzJfMCxcbiAgICAgIGNvZGU6IGNsb3VkZnJvbnQuRnVuY3Rpb25Db2RlLmZyb21JbmxpbmUoYFxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlcihldmVudCkge1xuICBjb25zdCByZXNwb25zZSA9IGV2ZW50LnJlc3BvbnNlO1xuICBjb25zdCBoZWFkZXJzID0gcmVzcG9uc2UuaGVhZGVycztcbiAgaGVhZGVyc1snY29udGVudC1zZWN1cml0eS1wb2xpY3knXSA9IHtcbiAgICB2YWx1ZTogW1xuICAgICAgXCJkZWZhdWx0LXNyYyAnc2VsZidcIixcbiAgICAgIFwic2NyaXB0LXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnICd1bnNhZmUtZXZhbCcgaHR0cHM6IGJsb2I6XCIsXG4gICAgICBcInN0eWxlLXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnIGh0dHBzOlwiLFxuICAgICAgXCJpbWctc3JjICdzZWxmJyBkYXRhOiBodHRwczogYmxvYjpcIixcbiAgICAgIFwiZm9udC1zcmMgJ3NlbGYnIGRhdGE6IGh0dHBzOlwiLFxuICAgICAgXCJjb25uZWN0LXNyYyAnc2VsZicgaHR0cHM6IHdzczpcIixcbiAgICAgIFwibWVkaWEtc3JjICdzZWxmJyBodHRwczogYmxvYjpcIixcbiAgICAgIFwib2JqZWN0LXNyYyAnbm9uZSdcIixcbiAgICAgIFwiZnJhbWUtYW5jZXN0b3JzICdub25lJ1wiLFxuICAgICAgXCJiYXNlLXVyaSAnc2VsZidcIixcbiAgICAgIFwiZm9ybS1hY3Rpb24gJ3NlbGYnXCIsXG4gICAgICBcInVwZ3JhZGUtaW5zZWN1cmUtcmVxdWVzdHNcIlxuICAgIF0uam9pbignOyAnKVxuICB9O1xuICByZXR1cm4gcmVzcG9uc2U7XG59XG5gKSxcbiAgICB9KTtcblxuICAgIC8vIEF0dGFjaCB0aGUgQ1NQIGZ1bmN0aW9uIGFzIGEgdmlld2VyLXJlc3BvbnNlIGhhbmRsZXIgb24gdGhlIGRlZmF1bHQgY2FjaGUgYmVoYXZpb3VyXG4gICAgLy8gQ2xvdWRGcm9udFRvUzMgZXhwb3NlcyB0aGUgcmF3IENmbkRpc3RyaWJ1dGlvbjsgd2UgcGF0Y2ggaXQgdmlhIGFuIGVzY2FwZSBoYXRjaC5cbiAgICBjb25zdCBjZm5EaXN0ID0gZGlzdHJpYnV0aW9uLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNsb3VkZnJvbnQuQ2ZuRGlzdHJpYnV0aW9uO1xuICAgIGNmbkRpc3QuYWRkUHJvcGVydHlPdmVycmlkZShcbiAgICAgICdEaXN0cmlidXRpb25Db25maWcuRGVmYXVsdENhY2hlQmVoYXZpb3IuRnVuY3Rpb25Bc3NvY2lhdGlvbnMnLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgRXZlbnRUeXBlOiAndmlld2VyLXJlc3BvbnNlJyxcbiAgICAgICAgICBGdW5jdGlvbkFSTjogY3NwRnVuY3Rpb24uZnVuY3Rpb25Bcm4sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICk7XG5cbiAgICAvLyDilIDilIAgNS4gQnVja2V0RGVwbG95bWVudDogc3luYyBidWlsZCBvdXRwdXQg4oaSIFMzLCBpbnZhbGlkYXRlIENsb3VkRnJvbnQgY2FjaGUg4pSA4pSAXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHByb3BzLmJ1aWxkT3V0cHV0UGF0aCldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IGJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbixcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ10sXG4gICAgICBtZW1vcnlMaW1pdDogNTEyLFxuICAgICAgcHJ1bmU6IHRydWUsXG4gICAgfSk7XG5cbiAgICB0aGlzLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUgPSBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZTtcblxuICAgIC8vIOKUgOKUgCBPdXRwdXRzIOKUgOKUgFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbG91ZEZyb250VVJMJywge1xuICAgICAgdmFsdWU6IGBodHRwczovLyR7ZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gVVJMJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1DbG91ZEZyb250VVJMYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXN0cmlidXRpb25JZCcsIHtcbiAgICAgIHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIElEJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1EaXN0cmlidXRpb25JZGAsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==