
// Disappearing Notes Reference page:
// https://disappearingnotes.com/link?id=JuAtTigUc_VNbuEzCpLmA&key=sTHgxnt83kkO8KwwgqZciENhlVQGwkepiS5BRIfZM

import { useState } from "react";

function DisappearingNotes() {
    const [expirationEnabled, setExpirationEnabled] = useState(false);
    const [passwordEnabled, setPasswordEnabled] = useState(false);

    const [viewLimitEnabled, setViewLimitEnabled] = useState(true);
    const [viewLimit, setViewLimit] = useState("1");
    const [timeExpiration, setTimeExpiration] = useState("24 Hours");

    const [notes, setNotes] = useState<any[]>([]);

    const createNote = () => {

      const id = crypto.randomUUID().slice(0,6);

      let expirationType = "";
      let expirationValue = "";

      if (viewLimitEnabled) {
        expirationType = "view";
        expirationValue = `${viewLimit} View${viewLimit !== "1" ? "s" : ""}`;
      }

      if (expirationEnabled) {
        expirationType = "time";
        expirationValue = timeExpiration;
      }

      const newNote = {
        id: id,
        created: new Date().toLocaleDateString(),

        expirationType,
        expirationValue,

        passwordProtected: passwordEnabled,

        status: "active", // future: active | viewed | expired
        link: `https://myshort.link/n/${id}`
  };

  setNotes((prev) => [newNote, ...prev]); // Adds new note

  // Reset form to default state
  setViewLimit("1");
  setTimeExpiration("24 Hours");
  setPasswordEnabled(false);
  setExpirationEnabled(false);
  setViewLimitEnabled(true);
};


const deleteNote = (id: string) => {
  setNotes((prev) => prev.filter((note) => note.id !== id));
};

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
  };

  return (
    <main className="link-page-layout">

      <h1>Disappearing Notes</h1>
      <p>Share secure notes that automatically expire after being viewed.</p>
      
      <h2>Create a Secure Note</h2>
      <form className="note-form">
        
        {/* Note Content */}
        <div className="form-card">
          <h3>Note Content</h3>
          <textarea
            className="form-textarea"
            placeholder="Write your secure note..."
          />
        </div>

        {/* Self Destruct Settings */}
        <div className="form-card">
          <h3>Self-Destruct Settings</h3>

          {/* View Limit Toggle */}
          <div className="toggle-block">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={viewLimitEnabled}
                onChange={() => {
                  // Turn view-limit off
                  if (viewLimitEnabled) {
                    setViewLimitEnabled(false);
                    // Automatically enable time expiration
                    setExpirationEnabled(true);
                  } 
                  else{
                    setExpirationEnabled(false);
                    setViewLimitEnabled(true);
                  }
                  
                }}
              />
              <span className="slider"></span>
              Limit number of views
            </label>

            {viewLimitEnabled && (
              <div className="nested-section">
                <label className="form-label">Maximum Views</label>
                <p>The note will expire after the number of views specified.</p>
                <select className="form-select small-input" value={viewLimit} onChange={(e) => setViewLimit(e.target.value)}>
                  <option value="1">1 View</option>
                  <option value="2">2 Views</option>
                  <option value="3">3 Views</option>
                  <option value="5">5 Views</option>
                  <option value="10">10 Views</option>
                </select>
              </div>
            )}
          </div>

          {/* Time Expiration Toggle */}
          <div className="toggle-block">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={expirationEnabled}
                onChange={() => {
                  if (expirationEnabled) {
                    setExpirationEnabled(false);
                    // Automatically enable view-limit
                    setViewLimitEnabled(true);
                  }
                  else{
                    setViewLimitEnabled(false);
                    setExpirationEnabled(true);
                  }
                }}
              />
              <span className="slider"></span>
              Enable time expiration
            </label>

            {expirationEnabled && (
              <div className="nested-section">
                <label className="form-label">Expiration Time</label>
                <p>Select the maximum time period after which the note will automatically expire.</p>
                <select className="form-select small-input" value={timeExpiration} onChange={(e) => setTimeExpiration(e.target.value)}>
                  <option>24 Hours</option>
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>90 Days</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Security */}
        <div className="form-card">
          <h3>Security</h3>

          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={passwordEnabled}
              onChange={() => setPasswordEnabled(!passwordEnabled)}
            />
            <span className="slider"></span>
            Password Protect
          </label>

          {passwordEnabled && (
            <div className="nested-section">
              <label className="form-label">Password Protection</label>
              <p>Require a password to view the note.</p>

              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
              />
            </div>
          )}
        </div>

        <button type="button" className="primary-button" onClick={createNote}>
          Create Secure Note
        </button>
      </form>

      {/* Your Notes List */}
<h2>Your Notes</h2>

{notes.length === 0 ? (
  <p className="empty-state">
    You haven't created any notes yet.
  </p>
) : (
  <section className="notes-section">
    <div className="notes-list">

      {notes.map((note) => (

        <div key={note.id} className="note-card">

          <div className="note-header">

            <p className="note-preview">
              Secure Note #{note.id}
            </p>

            {note.passwordProtected && (
              <span className="note-security">
                🔒 Password Protected
              </span>
            )}

          </div>

          <div className="note-meta">
            <span>Created: {note.created}</span>

            <span className="note-expiration">
              Expire: {note.expirationValue}            
            </span>
          </div>

          <p className="note-link">
            🔗 {note.link.replace("https://", "")}
          </p>

          <div className="note-actions">

            <button
              className="primary-button small"
              onClick={() => navigator.clipboard.writeText(note.link)}
            >
              Copy Link
            </button>

            <button
              className="secondary-button small"
              onClick={() => deleteNote(note.id)}
            >
              Delete
            </button>

          </div>

        </div>

      ))}

    </div>
  </section>
)}

    </main>
  )
}

export default DisappearingNotes
