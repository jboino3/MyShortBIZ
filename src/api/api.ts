const API_BASE = import.meta.env.VITE_API_URL;

// TEMPORARY TOKEN (replace later with login flow)
let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NzdhMjQ0Yi1mNTQ1LTRiMjUtYTEwNC1kMjQyOTg2MmY1NzUiLCJleHAiOjE3NzY5OTU4NDV9.C01OEJiczesEVpnJmUMtaFxB249PjlnmRbQ_XqSsZao";

// later your teammate will replace this easily
export function setToken(newToken: string) {
  token = newToken;
}

async function request(endpoint: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "API Error");
  }

  return res.json();
}

// ---- API FUNCTIONS ----

export const createLink = (data: any) =>
  request("/ai/link/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getMyLinks = () =>
  request("/ai/link/my");

export const getAnalytics = () =>
  request("/ai/link/analytics");

export const getLinkAnalyticsById = (id: number) =>
  request(`/ai/link/analytics/${id}`);