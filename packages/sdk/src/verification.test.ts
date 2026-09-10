import { describe, expect, it, vi } from "vitest";
import { getVerificationByNullifierFromClient } from "./verification.js";

const nullifier = `0x${"aa".repeat(32)}` as const;

describe("chain verification lookup", () => {
  it("returns null when the registry has not used the nullifier", async () => {
    const client = {
      readContract: vi.fn().mockResolvedValue(false),
      getLogs: vi.fn(),
    };

    await expect(
      getVerificationByNullifierFromClient({
        client,
        chainId: 11155111,
        nullifier,
      }),
    ).resolves.toBeNull();
    expect(client.getLogs).not.toHaveBeenCalled();
  });

  it("combines registry data with the ReviewVerified transaction", async () => {
    const txHash = `0x${"bb".repeat(32)}` as const;
    const client = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce([
          `0x${"11".repeat(32)}`,
          `0x${"22".repeat(32)}`,
          `0x${"33".repeat(32)}`,
          nullifier,
          123n,
        ]),
      getLogs: vi.fn().mockResolvedValue([
        {
          transactionHash: txHash,
          blockNumber: 11676625n,
        },
      ]),
    };

    await expect(
      getVerificationByNullifierFromClient({
        client,
        chainId: 11155111,
        nullifier,
      }),
    ).resolves.toEqual({
      used: true,
      reviewCommitment: `0x${"11".repeat(32)}`,
      productId: `0x${"22".repeat(32)}`,
      merchantId: `0x${"33".repeat(32)}`,
      verifiedAt: 123,
      txHash,
      blockNumber: 11676625,
    });
    expect(client.getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        fromBlock: 11675562n,
        args: { nullifier },
      }),
    );
  });
});
