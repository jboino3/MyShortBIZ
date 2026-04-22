import { useState } from "react";
import "./style.scss";
import { mockVerification } from "./mockBlockchain";

const BlockchainVerification = () => {
  const [inputUrl, setInputUrl] = useState("");
  const [verification, setVerification] = useState<typeof mockVerification | null>(null);

  const handleVerify = () => {
    setVerification(mockVerification); // UI-only mockup
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Verified":
      case "Immutable":
        return "green";
      case "Timestamped":
        return "orange";
      case "Invalid":
      default:
        return "red";
    }
  };

  return (
    <div className="blockchain-verification">
      <h1>Blockchain Verification</h1>
      <p>Permanently verify and timestamp links using blockchain technology.</p>


      {/* Input */}
      <div className="verify-input">
        <input
          type="text"
          placeholder="Enter myshort.link"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
        />
        <button onClick={handleVerify}>Verify</button>
      </div>

      {/* Verification Result */}
      {verification && (
        <div className="verification-result">
          {/* Link Details Card */}
          <div className="card link-card">
            <h2>Link Details</h2>
            <p><strong>Short URL:</strong> {verification.shortUrl}</p>
            <p><strong>Original URL:</strong> {verification.originalUrl}</p>
            <p><strong>Creator:</strong> {verification.creator}</p>
            <p><strong>Created At:</strong> {verification.createdAt}</p>
            <p><strong>Expires At:</strong> {verification.expiresAt}</p>
            <p>
              <strong>Status:</strong>{" "}
              <span style={{ color: getStatusColor(verification.status), fontWeight: 600 }}>
                {verification.status}
              </span>
            </p>
          </div>

          {/* Blockchain Info Card */}
          <div className="card blockchain-card">
            <h2>Blockchain Info</h2>
            <p><strong>Transaction Hash:</strong> {verification.blockchain.txHash}</p>
            <p><strong>Timestamp:</strong> {verification.blockchain.timestamp}</p>
            <p>
              <strong>Explorer Link:</strong>{" "}
              <a href={verification.blockchain.explorerLink} target="_blank" rel="noreferrer">
                View on Explorer
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockchainVerification;