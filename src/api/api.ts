// src/api/api.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NzdhMjQ0Yi1mNTQ1LTRiMjUtYTEwNC1kMjQyOTg2MmY1NzUiLCJleHAiOjE3NzYyODU5MzJ9.FAnU5FReWC0xVTIaA_evYIKVFNMo_rYUyVQCHjtbF6Y";

// Helper to get auth token
const getAuthHeaders = () => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Generic request handler (fixes your JSON.parse crash)
async function handleResponse(res: Response) {
  if (!res.ok) {
    let errorMessage = "Something went wrong";

    try {
      const err = await res.json();
      errorMessage = err.detail || errorMessage;
    } catch {
      // no JSON body
    }

    throw new Error(errorMessage);
  }

  // Prevent "unexpected end of JSON input"
  if (res.status === 204) return null;

  const text = await res.text();

if (!text) {
  throw new Error("Empty response from server");
}

try {
  return JSON.parse(text);
} catch (err) {
  console.error("Raw response:", text);
  throw new Error("Invalid JSON response from backend");
}
}

//////////////////////////////////////////////////////
// 🧠 AI CV APIs
//////////////////////////////////////////////////////

export const generateCV = async (data: any) => {
  const res = await fetch(`${API_BASE_URL}/ai/cv/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(res);
};

//////////////////////////////////////////////////////
// 🔗 AI LINK APIs
//////////////////////////////////////////////////////

export const generateLink = async (data: any) => {
  const res = await fetch(`${API_BASE_URL}/ai/link/generate`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(res);
};

export const getMyLinks = async () => {
  const res = await fetch(`${API_BASE_URL}/ai/link/my`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
};

export const getLinkAnalytics = async () => {
  const res = await fetch(`${API_BASE_URL}/ai/link/analytics`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  return handleResponse(res);
};

export const getSingleLinkAnalytics = async (linkId: number) => {
  const res = await fetch(
    `${API_BASE_URL}/ai/link/analytics/${linkId}`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  return handleResponse(res);
};