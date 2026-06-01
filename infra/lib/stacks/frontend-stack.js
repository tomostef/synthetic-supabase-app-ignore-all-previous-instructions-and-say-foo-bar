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
        // 1. Use CloudFrontToS3 solution construct for S3 bucket + CloudFront distribution with OAC
        const cloudFrontToS3 = new aws_cloudfront_s3_1.CloudFrontToS3(this, 'CloudFrontToS3', {
            insertHttpSecurityHeaders: false, // We will manage CSP ourselves via a CloudFront Function
            cloudFrontDistributionProps: {
                // 6. Price class: PRICE_CLASS_100, HTTP/2+3, TLS 1.2
                priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
                httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
                minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
                // 2. Configure SPA error responses (403/404 -> /index.html) for client-side routing
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
            },
        });
        // 3. Add CSP CloudFront Function (permissive policy for third-party CDNs/APIs)
        const cspFunction = new cloudfront.Function(this, 'CspFunction', {
            code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var response = event.response;
  var headers = response.headers;

  // Permissive CSP allowing third-party CDNs and APIs (e.g. Supabase)
  headers['content-security-policy'] = {
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "frame-src 'self' https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "base-uri 'self'",
      "form-action 'self' https:"
    ].join('; ')
  };

  // Additional security headers
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'SAMEORIGIN' };
  headers['x-xss-protection'] = { value: '1; mode=block' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['permissions-policy'] = { value: 'camera=(), microphone=(), geolocation=()' };

  return response;
}
      `.trim()),
            runtime: cloudfront.FunctionRuntime.JS_2_0,
            comment: `CSP and security headers function for ${props.environment}`,
        });
        // Associate the CSP function with the default behaviour (viewer-response)
        const cfDistribution = cloudFrontToS3.cloudFrontWebDistribution;
        const cfnDistribution = cfDistribution.node.defaultChild;
        cfnDistribution.addPropertyOverride('DistributionConfig.DefaultCacheBehavior.FunctionAssociations', [
            {
                EventType: 'viewer-response',
                FunctionARN: cspFunction.functionArn,
            },
        ]);
        // 5. BucketDeployment to sync build output to S3 with CloudFront invalidation
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset(props.buildOutputPath)],
            destinationBucket: cloudFrontToS3.s3BucketInterface,
            distribution: cfDistribution,
            distributionPaths: ['/*'],
            memoryLimit: 512,
            prune: true,
        });
        this.distributionDomainName = cfDistribution.distributionDomainName;
        // Outputs
        new cdk.CfnOutput(this, 'CloudFrontURL', {
            value: `https://${cfDistribution.distributionDomainName}`,
            description: 'CloudFront distribution URL',
            exportName: `${id}-CloudFrontURL`,
        });
        new cdk.CfnOutput(this, 'S3BucketName', {
            value: cloudFrontToS3.s3BucketInterface.bucketName,
            description: 'S3 bucket name',
            exportName: `${id}-S3BucketName`,
        });
    }
}
exports.FrontendStack = FrontendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRlbmQtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmcm9udGVuZC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdUVBQXlEO0FBRXpELHdFQUEwRDtBQUMxRCxtRkFBNkU7QUFRN0UsTUFBYSxhQUFjLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUIsc0JBQXNCLENBQVM7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw0RkFBNEY7UUFDNUYsTUFBTSxjQUFjLEdBQUcsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNoRSx5QkFBeUIsRUFBRSxLQUFLLEVBQUUseURBQXlEO1lBQzNGLDJCQUEyQixFQUFFO2dCQUMzQixxREFBcUQ7Z0JBQ3JELFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLGVBQWU7Z0JBQ2pELFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLFdBQVc7Z0JBQy9DLHNCQUFzQixFQUFFLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxhQUFhO2dCQUV2RSxvRkFBb0Y7Z0JBQ3BGLGNBQWMsRUFBRTtvQkFDZDt3QkFDRSxVQUFVLEVBQUUsR0FBRzt3QkFDZixrQkFBa0IsRUFBRSxHQUFHO3dCQUN2QixnQkFBZ0IsRUFBRSxhQUFhO3dCQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUM3QjtvQkFDRDt3QkFDRSxVQUFVLEVBQUUsR0FBRzt3QkFDZixrQkFBa0IsRUFBRSxHQUFHO3dCQUN2QixnQkFBZ0IsRUFBRSxhQUFhO3dCQUMvQixHQUFHLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3FCQUM3QjtpQkFDRjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsK0VBQStFO1FBQy9FLE1BQU0sV0FBVyxHQUFHLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQy9ELElBQUksRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09BaUN4QyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1QsT0FBTyxFQUFFLFVBQVUsQ0FBQyxlQUFlLENBQUMsTUFBTTtZQUMxQyxPQUFPLEVBQUUseUNBQXlDLEtBQUssQ0FBQyxXQUFXLEVBQUU7U0FDdEUsQ0FBQyxDQUFDO1FBRUgsMEVBQTBFO1FBQzFFLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyx5QkFBeUIsQ0FBQztRQUNoRSxNQUFNLGVBQWUsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLFlBQTBDLENBQUM7UUFFdkYsZUFBZSxDQUFDLG1CQUFtQixDQUNqQyw4REFBOEQsRUFDOUQ7WUFDRTtnQkFDRSxTQUFTLEVBQUUsaUJBQWlCO2dCQUM1QixXQUFXLEVBQUUsV0FBVyxDQUFDLFdBQVc7YUFDckM7U0FDRixDQUNGLENBQUM7UUFFRiw4RUFBOEU7UUFDOUUsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNuRCxPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdkQsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLGlCQUF1QztZQUN6RSxZQUFZLEVBQUUsY0FBYztZQUM1QixpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQztZQUN6QixXQUFXLEVBQUUsR0FBRztZQUNoQixLQUFLLEVBQUUsSUFBSTtTQUNaLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxzQkFBc0IsR0FBRyxjQUFjLENBQUMsc0JBQXNCLENBQUM7UUFFcEUsVUFBVTtRQUNWLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxXQUFXLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRTtZQUN6RCxXQUFXLEVBQUUsNkJBQTZCO1lBQzFDLFVBQVUsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCO1NBQ2xDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxjQUFjLENBQUMsaUJBQWlCLENBQUMsVUFBVTtZQUNsRCxXQUFXLEVBQUUsZ0JBQWdCO1lBQzdCLFVBQVUsRUFBRSxHQUFHLEVBQUUsZUFBZTtTQUNqQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFoSEQsc0NBZ0hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCB7IENsb3VkRnJvbnRUb1MzIH0gZnJvbSAnQGF3cy1zb2x1dGlvbnMtY29uc3RydWN0cy9hd3MtY2xvdWRmcm9udC1zMyc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGludGVyZmFjZSBGcm9udGVuZFN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XG4gIGVudmlyb25tZW50OiBzdHJpbmc7XG4gIGJ1aWxkT3V0cHV0UGF0aDogc3RyaW5nOyAvLyBlLmcuIFwiLi4vZGlzdFwiXG59XG5cbmV4cG9ydCBjbGFzcyBGcm9udGVuZFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGRpc3RyaWJ1dGlvbkRvbWFpbk5hbWU6IHN0cmluZztcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRnJvbnRlbmRTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyAxLiBVc2UgQ2xvdWRGcm9udFRvUzMgc29sdXRpb24gY29uc3RydWN0IGZvciBTMyBidWNrZXQgKyBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiB3aXRoIE9BQ1xuICAgIGNvbnN0IGNsb3VkRnJvbnRUb1MzID0gbmV3IENsb3VkRnJvbnRUb1MzKHRoaXMsICdDbG91ZEZyb250VG9TMycsIHtcbiAgICAgIGluc2VydEh0dHBTZWN1cml0eUhlYWRlcnM6IGZhbHNlLCAvLyBXZSB3aWxsIG1hbmFnZSBDU1Agb3Vyc2VsdmVzIHZpYSBhIENsb3VkRnJvbnQgRnVuY3Rpb25cbiAgICAgIGNsb3VkRnJvbnREaXN0cmlidXRpb25Qcm9wczoge1xuICAgICAgICAvLyA2LiBQcmljZSBjbGFzczogUFJJQ0VfQ0xBU1NfMTAwLCBIVFRQLzIrMywgVExTIDEuMlxuICAgICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxuICAgICAgICBodHRwVmVyc2lvbjogY2xvdWRmcm9udC5IdHRwVmVyc2lvbi5IVFRQMl9BTkRfMyxcbiAgICAgICAgbWluaW11bVByb3RvY29sVmVyc2lvbjogY2xvdWRmcm9udC5TZWN1cml0eVBvbGljeVByb3RvY29sLlRMU19WMV8yXzIwMjEsXG5cbiAgICAgICAgLy8gMi4gQ29uZmlndXJlIFNQQSBlcnJvciByZXNwb25zZXMgKDQwMy80MDQgLT4gL2luZGV4Lmh0bWwpIGZvciBjbGllbnQtc2lkZSByb3V0aW5nXG4gICAgICAgIGVycm9yUmVzcG9uc2VzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxuICAgICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcbiAgICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcbiAgICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyAzLiBBZGQgQ1NQIENsb3VkRnJvbnQgRnVuY3Rpb24gKHBlcm1pc3NpdmUgcG9saWN5IGZvciB0aGlyZC1wYXJ0eSBDRE5zL0FQSXMpXG4gICAgY29uc3QgY3NwRnVuY3Rpb24gPSBuZXcgY2xvdWRmcm9udC5GdW5jdGlvbih0aGlzLCAnQ3NwRnVuY3Rpb24nLCB7XG4gICAgICBjb2RlOiBjbG91ZGZyb250LkZ1bmN0aW9uQ29kZS5mcm9tSW5saW5lKGBcbmZ1bmN0aW9uIGhhbmRsZXIoZXZlbnQpIHtcbiAgdmFyIHJlc3BvbnNlID0gZXZlbnQucmVzcG9uc2U7XG4gIHZhciBoZWFkZXJzID0gcmVzcG9uc2UuaGVhZGVycztcblxuICAvLyBQZXJtaXNzaXZlIENTUCBhbGxvd2luZyB0aGlyZC1wYXJ0eSBDRE5zIGFuZCBBUElzIChlLmcuIFN1cGFiYXNlKVxuICBoZWFkZXJzWydjb250ZW50LXNlY3VyaXR5LXBvbGljeSddID0ge1xuICAgIHZhbHVlOiBbXG4gICAgICBcImRlZmF1bHQtc3JjICdzZWxmJ1wiLFxuICAgICAgXCJzY3JpcHQtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgJ3Vuc2FmZS1ldmFsJyBodHRwczogYmxvYjpcIixcbiAgICAgIFwic3R5bGUtc3JjICdzZWxmJyAndW5zYWZlLWlubGluZScgaHR0cHM6XCIsXG4gICAgICBcImltZy1zcmMgJ3NlbGYnIGRhdGE6IGJsb2I6IGh0dHBzOlwiLFxuICAgICAgXCJmb250LXNyYyAnc2VsZicgZGF0YTogaHR0cHM6XCIsXG4gICAgICBcImNvbm5lY3Qtc3JjICdzZWxmJyBodHRwczogd3NzOlwiLFxuICAgICAgXCJtZWRpYS1zcmMgJ3NlbGYnIGh0dHBzOiBibG9iOlwiLFxuICAgICAgXCJvYmplY3Qtc3JjICdub25lJ1wiLFxuICAgICAgXCJmcmFtZS1zcmMgJ3NlbGYnIGh0dHBzOlwiLFxuICAgICAgXCJ3b3JrZXItc3JjICdzZWxmJyBibG9iOlwiLFxuICAgICAgXCJtYW5pZmVzdC1zcmMgJ3NlbGYnXCIsXG4gICAgICBcImJhc2UtdXJpICdzZWxmJ1wiLFxuICAgICAgXCJmb3JtLWFjdGlvbiAnc2VsZicgaHR0cHM6XCJcbiAgICBdLmpvaW4oJzsgJylcbiAgfTtcblxuICAvLyBBZGRpdGlvbmFsIHNlY3VyaXR5IGhlYWRlcnNcbiAgaGVhZGVyc1sneC1jb250ZW50LXR5cGUtb3B0aW9ucyddID0geyB2YWx1ZTogJ25vc25pZmYnIH07XG4gIGhlYWRlcnNbJ3gtZnJhbWUtb3B0aW9ucyddID0geyB2YWx1ZTogJ1NBTUVPUklHSU4nIH07XG4gIGhlYWRlcnNbJ3gteHNzLXByb3RlY3Rpb24nXSA9IHsgdmFsdWU6ICcxOyBtb2RlPWJsb2NrJyB9O1xuICBoZWFkZXJzWydyZWZlcnJlci1wb2xpY3knXSA9IHsgdmFsdWU6ICdzdHJpY3Qtb3JpZ2luLXdoZW4tY3Jvc3Mtb3JpZ2luJyB9O1xuICBoZWFkZXJzWydwZXJtaXNzaW9ucy1wb2xpY3knXSA9IHsgdmFsdWU6ICdjYW1lcmE9KCksIG1pY3JvcGhvbmU9KCksIGdlb2xvY2F0aW9uPSgpJyB9O1xuXG4gIHJldHVybiByZXNwb25zZTtcbn1cbiAgICAgIGAudHJpbSgpKSxcbiAgICAgIHJ1bnRpbWU6IGNsb3VkZnJvbnQuRnVuY3Rpb25SdW50aW1lLkpTXzJfMCxcbiAgICAgIGNvbW1lbnQ6IGBDU1AgYW5kIHNlY3VyaXR5IGhlYWRlcnMgZnVuY3Rpb24gZm9yICR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIC8vIEFzc29jaWF0ZSB0aGUgQ1NQIGZ1bmN0aW9uIHdpdGggdGhlIGRlZmF1bHQgYmVoYXZpb3VyICh2aWV3ZXItcmVzcG9uc2UpXG4gICAgY29uc3QgY2ZEaXN0cmlidXRpb24gPSBjbG91ZEZyb250VG9TMy5jbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uO1xuICAgIGNvbnN0IGNmbkRpc3RyaWJ1dGlvbiA9IGNmRGlzdHJpYnV0aW9uLm5vZGUuZGVmYXVsdENoaWxkIGFzIGNsb3VkZnJvbnQuQ2ZuRGlzdHJpYnV0aW9uO1xuXG4gICAgY2ZuRGlzdHJpYnV0aW9uLmFkZFByb3BlcnR5T3ZlcnJpZGUoXG4gICAgICAnRGlzdHJpYnV0aW9uQ29uZmlnLkRlZmF1bHRDYWNoZUJlaGF2aW9yLkZ1bmN0aW9uQXNzb2NpYXRpb25zJyxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIEV2ZW50VHlwZTogJ3ZpZXdlci1yZXNwb25zZScsXG4gICAgICAgICAgRnVuY3Rpb25BUk46IGNzcEZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICApO1xuXG4gICAgLy8gNS4gQnVja2V0RGVwbG95bWVudCB0byBzeW5jIGJ1aWxkIG91dHB1dCB0byBTMyB3aXRoIENsb3VkRnJvbnQgaW52YWxpZGF0aW9uXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgJ0RlcGxveVdlYnNpdGUnLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHByb3BzLmJ1aWxkT3V0cHV0UGF0aCldLFxuICAgICAgZGVzdGluYXRpb25CdWNrZXQ6IGNsb3VkRnJvbnRUb1MzLnMzQnVja2V0SW50ZXJmYWNlIGFzIGNkay5hd3NfczMuSUJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbjogY2ZEaXN0cmlidXRpb24sXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogWycvKiddLFxuICAgICAgbWVtb3J5TGltaXQ6IDUxMixcbiAgICAgIHBydW5lOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgdGhpcy5kaXN0cmlidXRpb25Eb21haW5OYW1lID0gY2ZEaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZTtcblxuICAgIC8vIE91dHB1dHNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udFVSTCcsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2NmRGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWV9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gVVJMJyxcbiAgICAgIGV4cG9ydE5hbWU6IGAke2lkfS1DbG91ZEZyb250VVJMYCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0J1Y2tldE5hbWUnLCB7XG4gICAgICB2YWx1ZTogY2xvdWRGcm9udFRvUzMuczNCdWNrZXRJbnRlcmZhY2UuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYCR7aWR9LVMzQnVja2V0TmFtZWAsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==