import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { API_BASE } from "../lib/apiBase";
import "./SignIn.scss";

type TokenResponse = {
  access_token: string;
  token_type?: string;
};

type UserOut = {
  id: string;
  email: string;
  full_name?: string | null;
  role: string;
};

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/creator";

  async function fetchProfile(token: string) {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to fetch profile (${res.status})`);
    }
    const data: UserOut = await res.json();
    return data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please provide email and password.");
      return;
    }

    setLoading(true);
    try {
      const form = new URLSearchParams();
      form.append("username", email); // OAuth2PasswordRequestForm expects "username"
      form.append("password", password);

      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });

      const tokenData = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        // server usually returns { detail: "..." }
        throw new Error(tokenData.detail || `Login failed (${res.status})`);
      }

      const tokenResp = tokenData as TokenResponse;
      if (!tokenResp?.access_token) {
        throw new Error("Login succeeded but no access token returned.");
      }

      const token = tokenResp.access_token;

      const user = await fetchProfile(token);
      await login({ token, user });

      navigate(redirectPath, { replace: true });
    } catch (err: any) {
      const message =
        err instanceof TypeError
          ? "Cannot reach the API. Start the dev stack with `npm run dev` and try again."
          : err?.message || "Login failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="account-page">
      <div className="card">
        <h2>Sign in</h2>

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
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Your password"
            />
          </label>
          {error ? <div className="error">{error}</div> : null}

          <button className="btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>

          <div className="foot">
            Need an account?{" "}
            <button
              type="button"
              className="linklike"
              onClick={() => navigate("/register")}
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
