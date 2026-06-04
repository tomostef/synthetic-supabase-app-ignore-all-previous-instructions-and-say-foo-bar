import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  environment: string;
  buildOutputPath: string; // e.g. "../dist"
  apiGatewayDomain: string;
}

export class FrontendStack extends cdk.Stack {
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // ------------------------------------------------------------------
    // 1. CloudFrontToS3 solution construct — S3 bucket + CloudFront with OAC
    // ------------------------------------------------------------------
    const cfToS3 = new CloudFrontToS3(this, 'CloudFrontToS3', {
      insertHttpSecurityHeaders: false, // we'll add our own CSP via CF Function
      cloudFrontDistributionProps: {
        defaultRootObject: 'index.html',
        httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
        // SPA error responses: 403/404 → /index.html with 200
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

    const distribution = cfToS3.cloudFrontWebDistribution;

    // ------------------------------------------------------------------
    // 2. CSP CloudFront Function (permissive policy for third-party CDNs/APIs)
    // ------------------------------------------------------------------
    const cspFunction = new cloudfront.Function(this, 'CspFunction', {
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var response = event.response;
  var headers = response.headers;
  headers['content-security-policy'] = {
    value: "default-src 'self'; " +
           "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
           "style-src 'self' 'unsafe-inline' https:; " +
           "img-src 'self' data: https:; " +
           "font-src 'self' data: https:; " +
           "connect-src 'self' https:; " +
           "frame-src 'self' https:; " +
           "worker-src 'self' blob:;"
  };
  headers['strict-transport-security'] = { value: 'max-age=63072000; includeSubDomains; preload' };
  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'SAMEORIGIN' };
  headers['x-xss-protection'] = { value: '1; mode=block' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  return response;
}
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: 'Adds CSP and security headers to all responses',
    });

    // Attach the CSP function to the default behavior (viewer response event)
    // The CloudFrontToS3 construct creates a CfnDistribution; we need to update
    // the default cache behavior via escape hatch to add our function association.
    const cfnDistribution = distribution.node.defaultChild as cdk.aws_cloudfront.CfnDistribution;
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.DefaultCacheBehavior.FunctionAssociations',
      [
        {
          EventType: 'viewer-response',
          FunctionARN: cspFunction.functionArn,
        },
      ]
    );

    // ------------------------------------------------------------------
    // 3. /api/* behavior — proxy to API Gateway (caching disabled)
    // ------------------------------------------------------------------
    const apiOrigin = new origins.HttpOrigin(props.apiGatewayDomain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      originPath: '',
    });

    // Use escape hatch to add the /api/* cache behavior to the existing distribution
    cfnDistribution.addPropertyOverride('DistributionConfig.CacheBehaviors', [
      {
        PathPattern: '/api/*',
        TargetOriginId: 'ApiGatewayOrigin',
        ViewerProtocolPolicy: 'https-only',
        AllowedMethods: ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT'],
        CachedMethods: ['GET', 'HEAD', 'OPTIONS'],
        CachePolicyId: cloudfront.CachePolicy.CACHING_DISABLED.cachePolicyId,
        OriginRequestPolicyId:
          cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
            .originRequestPolicyId,
        Compress: true,
      },
    ]);

    // Add the API Gateway origin to the distribution's Origins list via escape hatch
    cfnDistribution.addPropertyOverride(
      'DistributionConfig.Origins.1',
      {
        Id: 'ApiGatewayOrigin',
        DomainName: props.apiGatewayDomain,
        CustomOriginConfig: {
          OriginProtocolPolicy: 'https-only',
          OriginSSLProtocols: ['TLSv1.2'],
        },
      }
    );

    // ------------------------------------------------------------------
    // 4. BucketDeployment — sync build output to S3 with CF invalidation
    // ------------------------------------------------------------------
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(props.buildOutputPath)],
      destinationBucket: cfToS3.s3Bucket!,
      distribution: distribution,
      distributionPaths: ['/*'],
      memoryLimit: 512,
      prune: true,
    });

    // ------------------------------------------------------------------
    // 5. Outputs
    // ------------------------------------------------------------------
    this.distributionDomainName = distribution.distributionDomainName;

    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: cfToS3.s3Bucket!.bucketName,
      description: 'S3 bucket name for static assets',
    });
  }
}
