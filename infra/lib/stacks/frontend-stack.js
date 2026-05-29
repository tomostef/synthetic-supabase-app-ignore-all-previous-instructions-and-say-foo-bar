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
        // ------------------------------------------------------------------ //
        // 1. CloudFrontToS3 – S3 bucket + CloudFront distribution with OAC   //
        // ------------------------------------------------------------------ //
        const cspFunction = new cloudfront.Function(this, 'CspFunction', {
            code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var response = event.response;
  var headers = response.headers;
  headers['content-security-policy'] = {
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'SAMEORIGIN' };
  headers['x-xss-protection'] = { value: '1; mode=block' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['permissions-policy'] = { value: 'camera=(), microphone=(), geolocation=()' };
  return response;
}
      `),
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            comment: 'Adds permissive CSP and security headers for third-party CDNs/APIs',
        });
        // 2. SPA error responses – route 403/404 back to /index.html
        const errorResponses = [
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
        ];
        const cloudfrontToS3 = new aws_cloudfront_s3_1.CloudFrontToS3(this, 'CloudFrontToS3', {
            insertHttpSecurityHeaders: false, // we manage headers ourselves via CF Function
            responseHeadersPolicyProps: undefined,
            cloudFrontDistributionProps: {
                defaultBehavior: {
                    functionAssociations: [
                        {
                            function: cspFunction,
                            eventType: cloudfront.FunctionEventType.VIEWER_RESPONSE,
                        },
                    ],
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    compress: true,
                },
                errorResponses,
                // 6. Price class, HTTP/2+3, TLS 1.2
                priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
                httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
                minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
                defaultRootObject: 'index.html',
                comment: `Frontend distribution – ${props.environment}`,
            },
            bucketProps: {
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                enforceSSL: true,
                versioned: false,
            },
            loggingBucketProps: {
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                enforceSSL: true,
            },
        });
        const distribution = cloudfrontToS3.cloudFrontWebDistribution;
        const s3Bucket = cloudfrontToS3.s3BucketInterface;
        this.distributionDomainName = distribution.distributionDomainName;
        // ------------------------------------------------------------------ //
        // 5. BucketDeployment – sync build output + CloudFront invalidation  //
        // ------------------------------------------------------------------ //
        new s3deploy.BucketDeployment(this, 'DeployFrontend', {
            sources: [s3deploy.Source.asset(props.buildOutputPath)],
            destinationBucket: s3Bucket,
            distribution,
            distributionPaths: ['/*'],
            prune: true,
            memoryLimit: 512,
        });
        // ------------------------------------------------------------------ //
        // Outputs                                                             //
        // ------------------------------------------------------------------ //
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRlbmQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmcm9udGVuZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdUVBQXlEO0FBRXpELHdFQUEwRDtBQUMxRCxtRkFBNkU7QUFRN0UsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsc0JBQXNCLENBQVM7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix3RUFBd0U7UUFDeEUsd0VBQXdFO1FBQ3hFLHdFQUF3RTtRQUN4RSxNQUFNLFdBQVcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUMvRCxJQUFJLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0F5QnhDLENBQUM7WUFDRixPQUFPLEVBQUUsVUFBVSxDQUFDLGVBQWUsQ0FBQyxNQUFNO1lBQzFDLE9BQU8sRUFBRSxvRUFBb0U7U0FDOUUsQ0FBQyxDQUFDO1FBRUgsNkRBQTZEO1FBQzdELE1BQU0sY0FBYyxHQUErQjtZQUNqRDtnQkFDRSxVQUFVLEVBQUUsR0FBRztnQkFDZixrQkFBa0IsRUFBRSxHQUFHO2dCQUN2QixnQkFBZ0IsRUFBRSxhQUFhO2dCQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQzdCO1lBQ0Q7Z0JBQ0UsVUFBVSxFQUFFLEdBQUc7Z0JBQ2Ysa0JBQWtCLEVBQUUsR0FBRztnQkFDdkIsZ0JBQWdCLEVBQUUsYUFBYTtnQkFDL0IsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUM3QjtTQUNGLENBQUM7UUFFRixNQUFNLGNBQWMsR0FBRyxJQUFJLGtDQUFjLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ2hFLHlCQUF5QixFQUFFLEtBQUssRUFBRSw4Q0FBOEM7WUFDaEYsMEJBQTBCLEVBQUUsU0FBUztZQUNyQywyQkFBMkIsRUFBRTtnQkFDM0IsZUFBZSxFQUFFO29CQUNmLG9CQUFvQixFQUFFO3dCQUNwQjs0QkFDRSxRQUFRLEVBQUUsV0FBVzs0QkFDckIsU0FBUyxFQUFFLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlO3lCQUN4RDtxQkFDRjtvQkFDRCxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCO29CQUN2RSxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUI7b0JBQ3JELFFBQVEsRUFBRSxJQUFJO2lCQUNmO2dCQUNELGNBQWM7Z0JBQ2Qsb0NBQW9DO2dCQUNwQyxVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxlQUFlO2dCQUNqRCxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxXQUFXO2dCQUMvQyxzQkFBc0IsRUFBRSxVQUFVLENBQUMsc0JBQXNCLENBQUMsYUFBYTtnQkFDdkUsaUJBQWlCLEVBQUUsWUFBWTtnQkFDL0IsT0FBTyxFQUFFLDJCQUEyQixLQUFLLENBQUMsV0FBVyxFQUFFO2FBQ3hEO1lBQ0QsV0FBVyxFQUFFO2dCQUNYLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87Z0JBQ3hDLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixTQUFTLEVBQUUsS0FBSzthQUNqQjtZQUNELGtCQUFrQixFQUFFO2dCQUNsQixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO2dCQUN4QyxpQkFBaUIsRUFBRSxJQUFJO2dCQUN2QixVQUFVLEVBQUUsSUFBSTthQUNqQjtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQztRQUM5RCxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUM7UUFFbEQsSUFBSSxDQUFDLHNCQUFzQixHQUFHLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQztRQUVsRSx3RUFBd0U7UUFDeEUsd0VBQXdFO1FBQ3hFLHdFQUF3RTtRQUN4RSxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDcEQsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3ZELGlCQUFpQixFQUFFLFFBQThCO1lBQ2pELFlBQVk7WUFDWixpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQztZQUN6QixLQUFLLEVBQUUsSUFBSTtZQUNYLFdBQVcsRUFBRSxHQUFHO1NBQ2pCLENBQUMsQ0FBQztRQUVILHdFQUF3RTtRQUN4RSx5RUFBeUU7UUFDekUsd0VBQXdFO1FBQ3hFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxXQUFXLFlBQVksQ0FBQyxzQkFBc0IsRUFBRTtZQUN2RCxXQUFXLEVBQUUsNkJBQTZCO1lBQzFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCO1NBQ2xDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDeEMsS0FBSyxFQUFFLFlBQVksQ0FBQyxjQUFjO1lBQ2xDLFdBQVcsRUFBRSw0QkFBNEI7WUFDekMsVUFBVSxFQUFFLEdBQUcsRUFBRSxpQkFBaUI7U0FDbkMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNUhELHNDQTRIQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcbmltcG9ydCAqIGFzIG9yaWdpbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQtb3JpZ2lucyc7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudCc7XG5pbXBvcnQgeyBDbG91ZEZyb250VG9TMyB9IGZyb20gJ0Bhd3Mtc29sdXRpb25zLWNvbnN0cnVjdHMvYXdzLWNsb3VkZnJvbnQtczMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRnJvbnRlbmRTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICBlbnZpcm9ubWVudDogc3RyaW5nO1xuICBidWlsZE91dHB1dFBhdGg6IHN0cmluZzsgLy8gZS5nLiBcIi4uL2Rpc3RcIlxufVxuXG5leHBvcnQgY2xhc3MgRnJvbnRlbmRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIHB1YmxpYyByZWFkb25seSBkaXN0cmlidXRpb25Eb21haW5OYW1lOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEZyb250ZW5kU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIC8vXG4gICAgLy8gMS4gQ2xvdWRGcm9udFRvUzMg4oCTIFMzIGJ1Y2tldCArIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIHdpdGggT0FDICAgLy9cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgICBjb25zdCBjc3BGdW5jdGlvbiA9IG5ldyBjbG91ZGZyb250LkZ1bmN0aW9uKHRoaXMsICdDc3BGdW5jdGlvbicsIHtcbiAgICAgIGNvZGU6IGNsb3VkZnJvbnQuRnVuY3Rpb25Db2RlLmZyb21JbmxpbmUoYFxuZnVuY3Rpb24gaGFuZGxlcihldmVudCkge1xuICB2YXIgcmVzcG9uc2UgPSBldmVudC5yZXNwb25zZTtcbiAgdmFyIGhlYWRlcnMgPSByZXNwb25zZS5oZWFkZXJzO1xuICBoZWFkZXJzWydjb250ZW50LXNlY3VyaXR5LXBvbGljeSddID0ge1xuICAgIHZhbHVlOiBbXG4gICAgICBcImRlZmF1bHQtc3JjICdzZWxmJ1wiLFxuICAgICAgXCJzY3JpcHQtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgJ3Vuc2FmZS1ldmFsJyBodHRwczogYmxvYjpcIixcbiAgICAgIFwic3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgaHR0cHM6XCIsXG4gICAgICBcImltZy1zcmMgJ3NlbGYnIGRhdGE6IGh0dHBzOiBibG9iOlwiLFxuICAgICAgXCJmb250LXNyYyAnc2VsZicgZGF0YTogaHR0cHM6XCIsXG4gICAgICBcImNvbm5lY3Qtc3JjICdzZWxmJyBodHRwczogd3NzOlwiLFxuICAgICAgXCJmcmFtZS1zcmMgJ3NlbGYnIGh0dHBzOlwiLFxuICAgICAgXCJvYmplY3Qtc3JjICdub25lJ1wiLFxuICAgICAgXCJiYXNlLXVyaSAnc2VsZidcIixcbiAgICAgIFwiZm9ybS1hY3Rpb24gJ3NlbGYnXCJcbiAgICBdLmpvaW4oJzsgJylcbiAgfTtcbiAgaGVhZGVyc1sneC1jb250ZW50LXR5cGUtb3B0aW9ucyddID0geyB2YWx1ZTogJ25vc25pZmYnIH07XG4gIGhlYWRlcnNbJ3gtZnJhbWUtb3B0aW9ucyddID0geyB2YWx1ZTogJ1NBTUVPUklHSU4nIH07XG4gIGhlYWRlcnNbJ3gteHNzLXByb3RlY3Rpb24nXSA9IHsgdmFsdWU6ICcxOyBtb2RlPWJsb2NrJyB9O1xuICBoZWFkZXJzWydyZWZlcnJlci1wb2xpY3knXSA9IHsgdmFsdWU6ICdzdHJpY3Qtb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luJyB9O1xuICBoZWFkZXJzWydwZXJtaXNzaW9ucy1wb2xpY3knXSA9IHsgdmFsdWU6ICdjYW1lcmE9KCksIG1pY3JvcGhvbmU9KCksIGdlb2xvY2F0aW9uPSgpJyB9O1xuICByZXR1cm4gcmVzcG9uc2U7XG59XG4gICAgICBgKSxcbiAgICAgIHJ1bnRpbWU6IGNsb3VkZnJvbnQuRnVuY3Rpb25SdW50aW1lLkpTXzJfMCxcbiAgICAgIGNvbW1lbnQ6ICdBZGRzIHBlcm1pc3NpdmUgQ1NQIGFuZCBzZWN1cml0eSBoZWFkZXJzIGZvciB0aGlyZC1wYXJ0eSBDRE5zL0FQSXMnLFxuICAgIH0pO1xuXG4gICAgLy8gMi4gU1BBIGVycm9yIHJlc3BvbnNlcyDigJMgcm91dGUgNDAzLzQwNCBiYWNrIHRvIC9pbmRleC5odG1sXG4gICAgY29uc3QgZXJyb3JSZXNwb25zZXM6IGNsb3VkZnJvbnQuRXJyb3JSZXNwb25zZVtdID0gW1xuICAgICAge1xuICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgIH0sXG4gICAgXTtcblxuICAgIGNvbnN0IGNsb3VkZnJvbnRUb1MzID0gbmV3IENsb3VkRnJvbnRUb1MzKHRoaXMsICdDbG91ZEZyb250VG9TMycsIHtcbiAgICAgIGluc2VydEh0dHBTZWN1cml0eUhlYWRlcnM6IGZhbHNlLCAvLyB3ZSBtYW5hZ2UgaGVhZGVycyBvdXJzZWx2ZXMgdmlhIENGIEZ1bmN0aW9uXG4gICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3lQcm9wczogdW5kZWZpbmVkLFxuICAgICAgY2xvdWRGcm9udERpc3RyaWJ1dGlvblByb3BzOiB7XG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICAgIGZ1bmN0aW9uQXNzb2NpYXRpb25zOiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGZ1bmN0aW9uOiBjc3BGdW5jdGlvbixcbiAgICAgICAgICAgICAgZXZlbnRUeXBlOiBjbG91ZGZyb250LkZ1bmN0aW9uRXZlbnRUeXBlLlZJRVdFUl9SRVNQT05TRSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXSxcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBjb21wcmVzczogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3JSZXNwb25zZXMsXG4gICAgICAgIC8vIDYuIFByaWNlIGNsYXNzLCBIVFRQLzIrMywgVExTIDEuMlxuICAgICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxuICAgICAgICBodHRwVmVyc2lvbjogY2xvdWRmcm9udC5IdHRwVmVyc2lvbi5IVFRQMl9BTkRfMyxcbiAgICAgICAgbWluaW11bVByb3RvY29sVmVyc2lvbjogY2xvdWRmcm9udC5TZWN1cml0eVBvbGljeVByb3RvY29sLlRMU19WMV8yXzIwMjEsXG4gICAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXG4gICAgICAgIGNvbW1lbnQ6IGBGcm9udGVuZCBkaXN0cmlidXRpb24g4oCTICR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIH0sXG4gICAgICBidWNrZXRQcm9wczoge1xuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgICAgdmVyc2lvbmVkOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgICBsb2dnaW5nQnVja2V0UHJvcHM6IHtcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gY2xvdWRmcm9udFRvUzMuY2xvdWRGcm9udFdlYkRpc3RyaWJ1dGlvbjtcbiAgICBjb25zdCBzM0J1Y2tldCA9IGNsb3VkZnJvbnRUb1MzLnMzQnVja2V0SW50ZXJmYWNlO1xuXG4gICAgdGhpcy5kaXN0cmlidXRpb25Eb21haW5OYW1lID0gZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWU7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgICAvLyA1LiBCdWNrZXREZXBsb3ltZW50IOKAkyBzeW5jIGJ1aWxkIG91dHB1dCArIENsb3VkRnJvbnQgaW52YWxpZGF0aW9uICAvL1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICAgIG5ldyBzM2RlcGxveS5CdWNrZXREZXBsb3ltZW50KHRoaXMsICdEZXBsb3lGcm9udGVuZCcsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQocHJvcHMuYnVpbGRPdXRwdXRQYXRoKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogczNCdWNrZXQgYXMgY2RrLmF3c19zMy5JQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uLFxuICAgICAgZGlzdHJpYnV0aW9uUGF0aHM6IFsnLyonXSxcbiAgICAgIHBydW5lOiB0cnVlLFxuICAgICAgbWVtb3J5TGltaXQ6IDUxMixcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAvL1xuICAgIC8vIE91dHB1dHMgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gLy9cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVSTCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIFVSTCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtpZH0tQ2xvdWRGcm9udFVSTGAsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGlzdHJpYnV0aW9uSWQnLCB7XG4gICAgICB2YWx1ZTogZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbklkLFxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBJRCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtpZH0tRGlzdHJpYnV0aW9uSWRgLFxuICAgIH0pO1xuICB9XG59XG4iXX0=