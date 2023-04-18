import {
  LambdaClient,
  ListLayersCommand,
  ListLayerVersionsCommand,
  DeleteLayerVersionCommand,
} from "@aws-sdk/client-lambda";

const regions = [
  "us-east-1",
  "us-west-2",
  "eu-west-1",
  "ap-northeast-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "eu-central-1",
  "sa-east-1",
];

// your layer name
const LayerName = "napi-rs-canvas";

// NOTE: This will only delete last 50 layers, keep running to delete all.

async function deleteOldLayerVersions(region) {
  const lambdaClient = new LambdaClient({ region });

  const layerVersionsResponse = await lambdaClient.send(
    new ListLayerVersionsCommand({ LayerName })
  );
  const layerVersions = layerVersionsResponse.LayerVersions;

  if (!layerVersions?.length) {
    console.log("No layer versions found");
    return;
  }

  for (let i = 0; i < layerVersions.length - 1; i++) {
    const version = layerVersions[i].Version;
    lambdaClient
      .send(
        new DeleteLayerVersionCommand({
          LayerName: LayerName,
          VersionNumber: version,
        })
      )
      .then(() =>
        console.log(`Deleted ${LayerName} version ${version} in ${region}`)
      );
  }
}

for (const region of regions) {
  try {
    console.log(`Processing region ${region}`);
    // don't make this async, you'll be rate limited
    await deleteOldLayerVersions(region);
    console.log(`Finished processing region ${region}`);
  } catch (error) {
    console.error(`Error processing region ${region}:`, error);
  }
}
console.log("Done.");
