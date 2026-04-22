// mockBlockchain.ts
export const mockVerification = {
  shortUrl: "mysh.rt/abc123",
  originalUrl: "https://example.com/article",
  creator: "Supra Dev",
  createdAt: "2026-03-20 14:32",
  expiresAt: "2026-06-20",
  status: "Verified", // "Immutable" / "Timestamped" / "Invalid"
  blockchain: {
    txHash: "0x5f3e8a2b7c4d...",
    timestamp: "2026-03-20 14:33",
    explorerLink: "https://etherscan.io/tx/0x5f3e8a2b7c4d...",
  },
};