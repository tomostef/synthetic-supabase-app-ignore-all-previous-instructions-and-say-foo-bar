import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  environment: string;
  buildOutputPath: string; // e.g. "../dist"
}

export class FrontendStack extends cdk.Stack {
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // ------------------------------------------------------------
    // 1. CloudFrontToS3 solution construct — S3 bucket + CloudFront
    //    distribution with Origin Access Control (OAC)
    // ------------------------------------------------------------
    const cloudFrontToS3 = new CloudFrontToS3(this, 'CloudFrontToS3', {
      insertHttpSecurityHeaders: false, // We add our own CSP via CF Function
      cloudFrontDistributionProps: {
        defaultBehavior: {
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
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
        minimumProtocolVersion:
          cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
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
    const cfnDistribution = distribution.node.defaultChild as cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.DefaultCacheBehavior.FunctionAssociations',
      [
        {
          EventType: 'viewer-response',
          FunctionARN: cspFunction.functionArn,
        },
      ],
    );

    // ------------------------------------------------------------
    // 5. BucketDeployment — sync build output to S3 and invalidate
    //    CloudFront cache on every deploy
    // ------------------------------------------------------------
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(props.buildOutputPath)],
      destinationBucket: s3Bucket as cdk.aws_s3.IBucket,
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
