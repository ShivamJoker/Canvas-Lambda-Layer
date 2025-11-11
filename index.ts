import { Lambda, Runtime } from "@aws-sdk/client-lambda";
import fs from "fs/promises";
import { resolve } from "path";

// Define the name and description of the Lambda layer
const LAYER_NAME = "napi-rs-canvas";
const LAYER_DESCRIPTION = "Lambda layer for @napi-rs/canvas";

// Define the compatible Node.js runtimes for the Lambda layer
const COMPATIBLE_RUNTIMES: Runtime[] = [
  "nodejs16.x",
  "nodejs18.x",
  "nodejs20.x",
  "nodejs22.x",
];

// Define the AWS regions to publish the Lambda layer to
const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "sa-east-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "af-south-1",
  "ap-northeast-1",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
];

async function publishLayer() {
  // Read the contents of the layer ZIP file
  const layerZipFile = await fs.readFile("./layer.zip");

  // Publish the layer to each region in parallel
  const publishPromises = regions.map((region) => {
    const lambda = new Lambda({ region });
    return lambda.publishLayerVersion({
      LayerName: LAYER_NAME,
      Description: LAYER_DESCRIPTION,
      Content: {
        ZipFile: layerZipFile,
      },
      CompatibleRuntimes: COMPATIBLE_RUNTIMES,
    });
  });

  const publishResults = await Promise.all(publishPromises);
  console.log("Published layers");

  // Make the layer public in each region in parallel
  const permissionPromises = publishResults.map((result, idx) => {
    const lambda = new Lambda({ region: regions[idx] });
    return lambda.addLayerVersionPermission({
      LayerName: LAYER_NAME,
      VersionNumber: result.Version,
      StatementId: "public-access",
      Action: "lambda:GetLayerVersion",
      Principal: "*",
    });
  });

  await Promise.all(permissionPromises);

  console.log("Made the layers public");

  let baseReadme = await fs.readFile("./README_header.md", {
    encoding: "utf8",
  });

  // Output the ARN of the Lambda layer in each region
  publishResults.forEach((result, index) => {
    const layerVersionArn = result.LayerVersionArn;
    const region = regions[index];
    baseReadme += `|\`${region}\`|\`${layerVersionArn}\`|\n`;
  });

  await fs.writeFile("./README.md", baseReadme);
  console.log("Updated the readme");
}

publishLayer().catch((error) => {
  console.error(error);
  process.exit(1);
});
