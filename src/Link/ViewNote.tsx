import { useParams } from "react-router-dom";
import { useState } from "react";

function ViewNote() {

  const { id } = useParams();

  // Simulated backend response, add the fetch api note here
  const fakeNote = {
    id,
    content: "This is a secure note message.",
    passwordProtected: id === "locked",
    expired: id === "expired",
  };

  // Determine initial state
  const [status, setStatus] = useState<"locked" | "active" | "expired">(
    fakeNote.expired
      ? "expired"
      : fakeNote.passwordProtected
      ? "locked"
      : "active"
  );

  const [password, setPassword] = useState("");

  const handleUnlock = () => {
    setStatus("active");
  };

  return (
    <main className="view-note-layout">

      <h1>Secure Note</h1>

      <p className="note-warning">
        This note will self-destruct after being viewed.
      </p>

      <div className="view-card">

        {/* LOCKED STATE */}
        {status === "locked" && (
          <>
            <h3>Password Required</h3>

            <p>This note is password protected.</p>

            <input
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              className="primary-button"
              onClick={handleUnlock}
            >
              Unlock Note
            </button>
          </>
        )}

        {/* ACTIVE STATE */}
        {status === "active" && (
          <>
            <h3>Your Secure Note</h3>

            <p className="note-content">
              {fakeNote.content}
            </p>

            <p className="note-expire-warning">
              ⚠ This note will expire after viewing.
            </p>
          </>
        )}

        {/* EXPIRED STATE */}
        {status === "expired" && (
          <>
            <h3>Note Expired</h3>

            <p className="note-expired-text">
              This note is no longer available.
            </p>
          </>
        )}

      </div>

    </main>
  );
}

export default ViewNote;