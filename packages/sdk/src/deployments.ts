import chain31337 from "../../contracts/deployments/31337.json" with { type: "json" };
import chain11155111 from "../../contracts/deployments/11155111.json" with { type: "json" };

export const deployments = {
  31337: chain31337,
  11155111: chain11155111,
} as const;

export const deploymentBlocks = {
  31337: 0,
  11155111: 11675562,
} as const;
