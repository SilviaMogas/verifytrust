import { describe, expect, it, vi } from "vitest";
import { getOnChainMetricsFromClient } from "./metrics.js";
import { deployments } from "./deployments.js";

describe("on-chain metrics", () => {
  it("filters verifications by merchant and preserves the registry total", async () => {
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
      ]),
      readContract: vi.fn().mockResolvedValue(5n),
    };

    await expect(
      getOnChainMetricsFromClient({
        client,
        chainId: 11155111,
        merchantIds: [`0x${"11".repeat(32)}`],
      }),
    ).resolves.toEqual({
      totalVerifications: 2,
      merchants: 1,
      lastVerifiedAt: 200,
      registryTotalVerifications: 5,
      registryAddress: deployments[11155111].verifyTrustRegistry,
    });
    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        address: deployments[11155111].verifyTrustRegistry,
        fromBlock: 11675562n,
        args: { merchantId: [`0x${"11".repeat(32)}`] },
      }),
    );
    expect(client.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: deployments[11155111].verifyTrustRegistry,
        functionName: "verificationCount",
      }),
    );
  });
});
