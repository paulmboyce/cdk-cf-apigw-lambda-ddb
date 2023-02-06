import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";

//begin stack definition
export class ProjectStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //define dynamodb table
    const dynamodb_table = new dynamodb.Table(this, "DynamoDB Table", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: "ddb-table-users",

      // Add Global Table Replication to Region(s):
      // Uncomment following two(2) lines:
      // --------------------------------------
      // replicationRegions: ["eu-west-2"],
      // stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    //define lambda function and regeference function file
    const lambda_backend = new NodejsFunction(this, "Function lambda-scan", {
      tracing: lambda.Tracing.ACTIVE,
      functionName: "lambda-scan-name",
      entry: "lib/project-stack.lambda-scan.ts",
      environment: {
        DYNAMODB_TABLE_NAME: dynamodb_table.tableName,
      },
    });

    //grant lambda function read access to dynamodb table
    dynamodb_table.grantReadData(lambda_backend.role!);

    //define apigateway
    const api = new apigateway.RestApi(this, "Scanner Rest API", {
      deployOptions: {
        dataTraceEnabled: true,
        tracingEnabled: true,
      },
      restApiName: "api-scan-users",
    });

    //define endpoint and associate it with lambda backend
    const endpoint = api.root.addResource("scan");
    const endpointMethod = endpoint.addMethod(
      "GET",
      new apigateway.LambdaIntegration(lambda_backend)
    );
  }
}
