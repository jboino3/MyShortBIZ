
// Disappearing Notes Reference page:
// https://disappearingnotes.com/link?id=JuAtTigUc_VNbuEzCpLmA&key=sTHgxnt83kkO8KwwgqZciENhlVQGwkepiS5BRIfZM

import { useState } from "react";

function DisappearingNotes() {
    const [expirationEnabled, setExpirationEnabled] = useState(false);
    const [passwordEnabled, setPasswordEnabled] = useState(false);

    const [viewLimitEnabled, setViewLimitEnabled] = useState(true);
    const [viewLimit, setViewLimit] = useState("1");

    const [notes, setNotes] = useState<any[]>([]);

    const createNote = () => {

    const id = crypto.randomUUID().slice(0,6);

    const useViewExpiration = Math.random() > 0.5;

    const newNote = {
      id: id,
      created: new Date().toLocaleDateString(),

      expirationType: useViewExpiration ? "view" : "time",
      expirationValue: useViewExpiration ? "1 View" : "24 Hours",

      passwordProtected: Math.random() > 0.5,
      status: "Not Opened",

      link: `https://myshort.link/n/${id}`
    };

    setNotes([newNote, ...notes]);
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
                <select className="form-select small-input">
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
                <select className="form-select small-input">
                  <option>1 Day</option>
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
      {/* <p>*ToImplement: Pending Notes search options.</p> */}

          {notes.length === 0 && (
          <p className="empty-state">
            You haven't created any notes yet.
          </p>
        )}

        

      <section className="notes-section">
        <div className="notes-list">
          {/* Example Note */}
          <div className="note-card">
            <p className="note-preview">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit...
            </p>
            <div className="note-meta">
              <span>Created: Feb 27, 2026</span>
              <span>Expires: 1 View Left</span>
            </div>
            <div className="note-actions">
              <button className="primary-button small">View</button>
              <button className="secondary-button small">Delete</button>
            </div>
          </div>

          <div className="note-card">
            <p className="note-preview">
              Another secure note content preview here...
            </p>
            <div className="note-meta">
              <span>Created: Feb 25, 2026</span>
              <span>Expires: 2 Days</span>
            </div>
            <div className="note-actions">
              <button className="primary-button small">View</button>
              <button className="secondary-button small">Delete</button>
            </div>
          </div>
        </div>
      </section>

    </main>
  )
}

export default DisappearingNotes
