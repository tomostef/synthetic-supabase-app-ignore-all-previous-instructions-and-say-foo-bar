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

    // 1. Use CloudFrontToS3 solution construct for S3 bucket + CloudFront distribution with OAC
    const cloudFrontToS3 = new CloudFrontToS3(this, 'CloudFrontToS3', {
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
    const cfnDistribution = cfDistribution.node.defaultChild as cloudfront.CfnDistribution;

    cfnDistribution.addPropertyOverride(
      'DistributionConfig.DefaultCacheBehavior.FunctionAssociations',
      [
        {
          EventType: 'viewer-response',
          FunctionARN: cspFunction.functionArn,
        },
      ],
    );

    // 5. BucketDeployment to sync build output to S3 with CloudFront invalidation
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(props.buildOutputPath)],
      destinationBucket: cloudFrontToS3.s3BucketInterface as cdk.aws_s3.IBucket,
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
