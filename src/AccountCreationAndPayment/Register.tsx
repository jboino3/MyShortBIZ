import { useState } from "react"; 
import { useNavigate } from "react-router-dom";
import "./Register.scss";
import testVid from "../assets/test.mp4"
import testLink from "../assets/linktest.gif"

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?~`]/.test(password)
  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // enforce client-side length rule before any network request
    if (!validLength) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (!hasUpper){
      setError("Password must have at least one uppercase character");
      return;
    }
    if (!hasNumber){
      setError("Password must have at least one number");
      return;
    }
    if (!hasSpecial){
      setError("Password must have at least one special character");
      return;
    }
    if (!email || !password) {
      setError("Please provide an email and password.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        email,
        password,
        full_name: fullName || undefined,
      };

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        //error check
        throw new Error((data && data.detail) || `Registration failed (${res.status})`);
      }

      //success, navigated to sign in
      navigate("/signin");
    } catch (err: any) {
      setError(err?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="account-page">
      <div className="card">
        <h2>Create account</h2>
        <form onSubmit={handleSubmit} className="account-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </label>

          <label>
            Full name (optional)
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Example Name"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 8 characters"
              minLength={8}
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat password"
              minLength={8}
            />
          </label>

          {validLength ? (
            <p style={{ color: 'green' }}>✓ Password has at least 8 characters</p>
          ) : (
            <p style={{ color: 'red' }}>✗ Password must be at least 8 characters</p>
          )}

          {error ? <div className="error" role="alert">{error}</div> : null}

          <button
            type="submit"
            className="btn"
            disabled={loading || !validLength}
            aria-disabled={loading || !validLength}
            title={!validLength ? "Password must be at least 8 characters" : (loading ? "Creating..." : "Create account")}
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          <div className="foot">
            Already have an account?
            <button
              type="button"
              className="linklike"
              onClick={() => navigate("/signin")}
            >
              Sign in
            </button>
          </div>
        </form>
      </div>
      <div className="demos">
        <video width="100%" autoPlay muted loop>
          <source src={testVid} type="video/mp4"/>
        </video>
        <img src={testLink} width="40%"/>
        <video width="10%" autoPlay muted loop>
          <source src={testVid} type="video/mp4"/>
        </video>
      </div>
    </div>
  );
}
