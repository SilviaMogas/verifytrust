import chain31337 from "../../contracts/deployments/31337.json" with { type: "json" };

export const deployments = {
  31337: chain31337,
} as const;
