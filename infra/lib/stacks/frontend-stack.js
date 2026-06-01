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
        // ------------------------------------------------------------
        // 1. CloudFrontToS3 solution construct — S3 bucket + CloudFront
        //    distribution with Origin Access Control (OAC)
        // ------------------------------------------------------------
        const cloudFrontToS3 = new aws_cloudfront_s3_1.CloudFrontToS3(this, 'CloudFrontToS3', {
            insertHttpSecurityHeaders: false, // We add our own CSP via CF Function
            cloudFrontDistributionProps: {
                defaultBehavior: {
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                    originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
                },
                // 2. SPA error responses: 403 / 404 -> /index.html with 200
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
                // 6. Price class, HTTP versions, minimum TLS
                priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
                httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
                minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
                comment: `${id} - ${props.environment}`,
            },
        });
        const distribution = cloudFrontToS3.cloudFrontWebDistribution;
        const s3Bucket = cloudFrontToS3.s3BucketInterface;
        // ------------------------------------------------------------
        // 3. CSP CloudFront Function (permissive — allows third-party
        //    CDNs & APIs such as Supabase, Google Fonts, etc.)
        // ------------------------------------------------------------
        const cspFunction = new cloudfront.Function(this, 'CspFunction', {
            functionName: `${cdk.Stack.of(this).stackName}-csp`,
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['content-security-policy'] = {
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      "media-src 'self' https:"
    ].join('; ')
  };

  headers['x-content-type-options']  = { value: 'nosniff' };
  headers['x-frame-options']          = { value: 'SAMEORIGIN' };
  headers['x-xss-protection']         = { value: '1; mode=block' };
  headers['referrer-policy']           = { value: 'strict-origin-when-cross-origin' };

  return response;
}
      `.trim()),
            comment: 'Adds permissive CSP and security headers',
        });
        // Associate the CSP function as a viewer-response function on the
        // default cache behaviour of the existing distribution.
        // CloudFrontToS3 exposes the L1 CfnDistribution so we patch it directly.
        const cfnDistribution = distribution.node.defaultChild;
        cfnDistribution.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.FunctionAssociations', [
            {
                EventType: 'viewer-response',
                FunctionARN: cspFunction.functionArn,
            },
        ]);
        // ------------------------------------------------------------
        // 5. BucketDeployment — sync build output to S3 and invalidate
        //    CloudFront cache on every deploy
        // ------------------------------------------------------------
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset(props.buildOutputPath)],
            destinationBucket: s3Bucket,
            distribution,
            distributionPaths: ['/*'],
            memoryLimit: 512,
            prune: true,
        });
        this.distributionDomainName = distribution.distributionDomainName;
        // CloudFormation outputs
        new cdk.CfnOutput(this, 'CloudFrontURL', {
            value: `https://${distribution.distributionDomainName}`,
            description: 'CloudFront distribution URL',
            exportName: `${cdk.Stack.of(this).stackName}-CloudFrontURL`,
        });
        new cdk.CfnOutput(this, 'S3BucketName', {
            value: s3Bucket.bucketName ?? '',
            description: 'S3 bucket name for the frontend assets',
            exportName: `${cdk.Stack.of(this).stackName}-S3BucketName`,
        });
    }
}
exports.FrontendStack = FrontendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRlbmQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmcm9udGVuZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdUVBQXlEO0FBRXpELHdFQUEwRDtBQUMxRCxtRkFBNkU7QUFRN0UsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsc0JBQXNCLENBQVM7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QiwrREFBK0Q7UUFDL0QsZ0VBQWdFO1FBQ2hFLG1EQUFtRDtRQUNuRCwrREFBK0Q7UUFDL0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNoRSx5QkFBeUIsRUFBRSxLQUFLLEVBQUUscUNBQXFDO1lBQ3ZFLDJCQUEyQixFQUFFO2dCQUMzQixlQUFlLEVBQUU7b0JBQ2Ysb0JBQW9CLEVBQ2xCLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUI7b0JBQ25ELFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLGlCQUFpQjtvQkFDckQsbUJBQW1CLEVBQ2pCLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjO2lCQUNoRDtnQkFDRCw0REFBNEQ7Z0JBQzVELGNBQWMsRUFBRTtvQkFDZDt3QkFDRSxVQUFVLEVBQUUsR0FBRzt3QkFDZixrQkFBa0IsRUFBRSxHQUFHO3dCQUN2QixnQkFBZ0IsRUFBRSxhQUFhO3dCQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUM3QjtvQkFDRDt3QkFDRSxVQUFVLEVBQUUsR0FBRzt3QkFDZixrQkFBa0IsRUFBRSxHQUFHO3dCQUN2QixnQkFBZ0Is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b3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCB7IENsb3VkRnJvbnRUb1MzIH0gZnJvbSAnQGF3cy1zb2x1dGlvbnMtY29uc3RydWN0cy9hd3MtY2xvdWRmcm9udC1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBGcm9udGVuZFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIGJ1aWxkT3V0cHV0UGF0aDogc3RyaW5nOyAvLyBlLmcuIFwiLi4vZGlzdFwiXG59XG5cbmV4cG9ydCBjbGFzcyBGcm9udGVuZFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGRpc3RyaWJ1dGlvbkRvbWFpbk5hbWU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRnJvbnRlbmRTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyAxLiBDbG91ZEZyb250VG9TMyBzb2x1dGlvbiBjb25zdHJ1Y3Qg4oCUIFMzIGJ1Y2tldCArIENsb3VkRnJvbnRcbiAgICAvLyAgICBkaXN0cmlidXRpb24gd2l0aCBPcmlnaW4gQWNjZXNzIENvbnRyb2wgKE9BQylcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjb25zdCBjbG91ZEZyb250VG9TMyA9IG5ldyBDbG91ZEZyb250VG9TMyh0aGlzLCAnQ2xvdWRGcm9udFRvUzMnLCB7XG4gICAgICBpbnNlcnRIdHRwU2VjdXJpdHlIZWFkZXJzOiBmYWxzZSwgLy8gV2UgYWRkIG91ciBvd24gQ1NQIHZpYSBDRiBGdW5jdGlvblxuICAgICAgY2xvdWRGcm9udERpc3RyaWJ1dGlvblByb3BzOiB7XG4gICAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OlxuICAgICAgICAgICAgY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICBjYWNoZVBvbGljeTogY2xvdWRmcm9udC5DYWNoZVBvbGljeS5DQUNISU5HX09QVElNSVpFRCxcbiAgICAgICAgICBvcmlnaW5SZXF1ZXN0UG9saWN5OlxuICAgICAgICAgICAgY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0UG9saWN5LkNPUlNfUzNfT1JJR0lOLFxuICAgICAgICB9LFxuICAgICAgICAvLyAyLiBTUEEgZXJyb3IgcmVzcG9uc2VzOiA0MDMgLyA0MDQgLT4gL2luZGV4Lmh0bWwgd2l0aCAyMDBcbiAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXG4gICAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXG4gICAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgICAvLyA2LiBQcmljZSBjbGFzcywgSFRUUCB2ZXJzaW9ucywgbWluaW11bSBUTFNcbiAgICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCxcbiAgICAgICAgaHR0cFZlcnNpb246IGNsb3VkZnJvbnQuSHR0cFZlcnNpb24uSFRUUDJfQU5EXzMsXG4gICAgICAgIG1pbmltdW1Qcm90b2NvbFZlcnNpb246XG4gICAgICAgICAgY2xvdWRmcm9udC5TZWN1cml0eVBvbGljeVByb3RvY29sLlRMU19WMV8yXzIwMjEsXG4gICAgICAgIGNvbW1lbnQ6IGAke2lkfSAtICR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBkaXN0cmlidXRpb24gPSBjbG91ZEZyb250VG9TMy5jbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uO1xuICAgIGNvbnN0IHMzQnVja2V0ID0gY2xvdWRGcm9udFRvUzMuczNCdWNrZXRJbnRlcmZhY2U7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyAzLiBDU1AgQ2xvdWRGcm9udCBGdW5jdGlvbiAocGVybWlzc2l2ZSDigJQgYWxsb3dzIHRoaXJkLXBhcnR5XG4gICAgLy8gICAgQ0ROcyAmIEFQSXMgc3VjaCBhcyBTdXBhYmFzZSwgR29vZ2xlIEZvbnRzLCBldGMuKVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIGNvbnN0IGNzcEZ1bmN0aW9uID0gbmV3IGNsb3VkZnJvbnQuRnVuY3Rpb24odGhpcywgJ0NzcEZ1bmN0aW9uJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiBgJHtjZGsuU3RhY2sub2YodGhpcykuc3RhY2tOYW1lfS1jc3BgLFxuICAgICAgcnVudGltZTogY2xvdWRmcm9udC5GdW5jdGlvblJ1bnRpbWUuSlNfMl8wLFxuICAgICAgY29kZTogY2xvdWRmcm9udC5GdW5jdGlvbkNvZGUuZnJvbUlubGluZShgXG5mdW5jdGlvbiBoYW5kbGVyKGV2ZW50KSB7XG4gIHZhciByZXNwb25zZSA9IGV2ZW50LnJlc3BvbnNlO1xuICB2YXIgaGVhZGVycyA9IHJlc3BvbnNlLmhlYWRlcnM7XG5cbiAgaGVhZGVyc1snY29udGVudC1zZWN1cml0eS1wb2xpY3knXSA9IHtcbiAgICB2YWx1ZTogW1xuICAgICAgXCJkZWZhdWx0LXNyYyAnc2VsZidcIixcbiAgICAgIFwic2NyaXB0LXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnICd1bnNhZmUtZXZhbCcgaHR0cHM6XCIsXG4gICAgICBcInN0eWxlLXNyYyAnc2VsZicgJ3Vuc2FmZS1pbmxpbmUnIGh0dHBzOlwiLFxuICAgICAgXCJpbWctc3JjICdzZWxmJyBkYXRhOiBibG9iOiBodHRwczpcIixcbiAgICAgIFwiZm9udC1zcmMgJ3NlbGYnIGRhdGE6IGh0dHBzOlwiLFxuICAgICAgXCJjb25uZWN0LXNyYyAnc2VsZicgaHR0cHM6XCIsXG4gICAgICBcImZyYW1lLXNyYyAnc2VsZicgaHR0cHM6XCIsXG4gICAgICBcIndvcmtlci1zcmMgJ3NlbGYnIGJsb2I6XCIsXG4gICAgICBcIm1lZGlhLXNyYyAnc2VsZicgaHR0cHM6XCJcbiAgICBdLmpvaW4oJzsgJylcbiAgfTtcblxuICBoZWFkZXJzWyd4LWNvbnRlbnQtdHlwZS1vcHRpb25zJ10gID0geyB2YWx1ZTogJ25vc25pZmYnIH07XG4gIGhlYWRlcnNbJ3gtZnJhbWUtb3B0aW9ucyddICAgICAgICAgID0geyB2YWx1ZTogJ1NBTUVPUklHSU4nIH07XG4gIGhlYWRlcnNbJ3gteHNzLXByb3RlY3Rpb24nXSAgICAgICAgID0geyB2YWx1ZTogJzE7IG1vZGU9YmxvY2snIH07XG4gIGhlYWRlcnNbJ3JlZmVycmVyLXBvbGljeSddICAgICAgICAgICA9IHsgdmFsdWU6ICdzdHJpY3Qtb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luJyB9O1xuXG4gIHJldHVybiByZXNwb25zZTtcbn1cbiAgICAgIGAudHJpbSgpKSxcbiAgICAgIGNvbW1lbnQ6ICdBZGRzIHBlcm1pc3NpdmUgQ1NQIGFuZCBzZWN1cml0eSBoZWFkZXJzJyxcbiAgICB9KTtcblxuICAgIC8vIEFzc29jaWF0ZSB0aGUgQ1NQIGZ1bmN0aW9uIGFzIGEgdmlld2VyLXJlc3BvbnNlIGZ1bmN0aW9uIG9uIHRoZVxuICAgIC8vIGRlZmF1bHQgY2FjaGUgYmVoYXZpb3VyIG9mIHRoZSBleGlzdGluZyBkaXN0cmlidXRpb24uXG4gICAgLy8gQ2xvdWRGcm9udFRvUzMgZXhwb3NlcyB0aGUgTDEgQ2ZuRGlzdHJpYnV0aW9uIHNvIHdlIHBhdGNoIGl0IGRpcmVjdGx5LlxuICAgIGNvbnN0IGNmbkRpc3RyaWJ1dGlvbiA9IGRpc3RyaWJ1dGlvbi5ub2RlLmRlZmF1bHRDaGlsZCBhcyBjbG91ZGZyb250LkNmbkRpc3RyaWJ1dGlvbjtcbiAgICBjZm5EaXN0cmlidXRpb24uYWRkUHJvcGVydHlPdmVycmlkZShcbiAgICAgICdEaXN0cmlidXRpb25Db25maWcuRGVmYXVsdENhY2hlQmVoYXZpb3IuRnVuY3Rpb25Bc3NvY2lhdGlvbnMnLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgRXZlbnRUeXBlOiAndmlld2VyLXJlc3BvbnNlJyxcbiAgICAgICAgICBGdW5jdGlvbkFSTjogY3NwRnVuY3Rpb24uZnVuY3Rpb25Bcm4sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyA1LiBCdWNrZXREZXBsb3ltZW50IOKAlCBzeW5jIGJ1aWxkIG91dHB1dCB0byBTMyBhbmQgaW52YWxpZGF0ZVxuICAgIC8vICAgIENsb3VkRnJvbnQgY2FjaGUgb24gZXZlcnkgZGVwbG95XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHByb3BzLmJ1aWxkT3V0cHV0UGF0aCldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IHMzQnVja2V0IGFzIGNkay5hd3NfczMuSUJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbixcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbJy8qJ10sXG4gICAgICBtZW1vcnlMaW1pdDogNTEyLFxuICAgICAgcHJ1bmU6IHRydWUsXG4gICAgfSk7XG5cbiAgICB0aGlzLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUgPSBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZTtcblxuICAgIC8vIENsb3VkRm9ybWF0aW9uIG91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVSTCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIFVSTCcsXG4gICAgICBleHBvcnROYW1lOiBgJHtjZGsuU3RhY2sub2YodGhpcykuc3RhY2tOYW1lfS1DbG91ZEZyb250VVJMYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogczNCdWNrZXQuYnVja2V0TmFtZSA/PyAnJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IG5hbWUgZm9yIHRoZSBmcm9udGVuZCBhc3NldHMnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7Y2RrLlN0YWNrLm9mKHRoaXMpLnN0YWNrTmFtZX0tUzNCdWNrZXROYW1lYCxcbiAgICB9KTtcbiAgfVxufVxuIl19