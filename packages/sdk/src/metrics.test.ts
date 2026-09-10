import { describe, expect, it, vi } from "vitest";
import { getOnChainMetricsFromClient } from "./metrics.js";
import { deployments } from "./deployments.js";

describe("on-chain metrics", () => {
  it("counts verifications and distinct merchants from ReviewVerified logs", async () => {
    const client = {
      getLogs: vi.fn().mockResolvedValue([
        {
          args: {
            merchantId: `0x${"11".repeat(32)}`,
            verifiedAt: 100n,
          },
        },
        {
          args: {
            merchantId: `0x${"11".repeat(32)}`,
            verifiedAt: 200n,
          },
        },
        {
          args: {
            merchantId: `0x${"22".repeat(32)}`,
            verifiedAt: 150n,
          },
        },
      ]),
    };

    await expect(
      getOnChainMetricsFromClient({ client, chainId: 11155111 }),
    ).resolves.toEqual({
      totalVerifications: 3,
      merchants: 2,
      lastVerifiedAt: 200,
      registryAddress: deployments[11155111].verifyTrustRegistry,
    });
    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: deployments[11155111].verifyTrustRegistry,
        fromBlock: 11675562n,
      }),
    );
  });
});
