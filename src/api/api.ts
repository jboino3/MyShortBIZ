const API_BASE = import.meta.env.VITE_API_URL;

// TEMPORARY TOKEN (replace later with login flow)
let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NzdhMjQ0Yi1mNTQ1LTRiMjUtYTEwNC1kMjQyOTg2MmY1NzUiLCJleHAiOjE3NzY0MDc4NjJ9.4v92Y5Own4VSDZ0Nad_hA1bmrPO6jYSgE7jjwM1sifQ";

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

// // src/api/api.ts

// const API_BASE_URL = import.meta.env.VITE_API_URL;

// let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0NzdhMjQ0Yi1mNTQ1LTRiMjUtYTEwNC1kMjQyOTg2MmY1NzUiLCJleHAiOjE3NzYyODU5MzJ9.FAnU5FReWC0xVTIaA_evYIKVFNMo_rYUyVQCHjtbF6Y";

// // Helper to get auth token
// const getAuthHeaders = () => {
//   return {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${token}`,
//   };
// };

// // Generic request handler (fixes your JSON.parse crash)
// async function handleResponse(res: Response) {
//   if (!res.ok) {
//     let errorMessage = "Something went wrong";

//     try {
//       const err = await res.json();
//       errorMessage = err.detail || errorMessage;
//     } catch {
//       // no JSON body
//     }

//     throw new Error(errorMessage);
//   }

//   // Prevent "unexpected end of JSON input"
//   if (res.status === 204) return null;

//   const text = await res.text();

// if (!text) {
//   throw new Error("Empty response from server");
// }

// try {
//   return JSON.parse(text);
// } catch (err) {
//   console.error("Raw response:", text);
//   throw new Error("Invalid JSON response from backend");
// }
// }

// //////////////////////////////////////////////////////
// // 🧠 AI CV APIs
// //////////////////////////////////////////////////////

// export const generateCV = async (data: any) => {
//   const res = await fetch(`${API_BASE_URL}/ai/cv/generate`, {
//     method: "POST",
//     headers: getAuthHeaders(),
//     body: JSON.stringify(data),
//   });

//   return handleResponse(res);
// };

// //////////////////////////////////////////////////////
// // 🔗 AI LINK APIs
// //////////////////////////////////////////////////////


// async function generateLink() {
//   const res = await fetch("http://127.0.0.1:8000/ai/link/generate", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       // only needed if you re-enable auth later:
//       // "Authorization": "Bearer <token>"
//     },
//     body: JSON.stringify({
//       original_url: "https://example.com",
//       destination_summary: "test",
//       audience: "users",
//       tone: "casual",
//       goal: "increase clicks",
//       platform: "web"
//     })
//   });

//   const data = await res.json();
//   console.log(data);
//   return data;
// }

// // export const generateLink = async (data: any) => {
// //   const res = await fetch(`${API_BASE_URL}/ai/link/generate`, {
// //     method: "POST",
// //     headers: getAuthHeaders(),
// //     body: JSON.stringify(data),
// //   });

// //   return handleResponse(res);
// // };

// export const getMyLinks = async () => {
//   const res = await fetch(`${API_BASE_URL}/ai/link/my`, {
//     method: "GET",
//     headers: getAuthHeaders(),
//   });

//   return handleResponse(res);
// };

// export const getLinkAnalytics = async () => {
//   const res = await fetch(`${API_BASE_URL}/ai/link/analytics`, {
//     method: "GET",
//     headers: getAuthHeaders(),
//   });

//   return handleResponse(res);
// };

// export const getSingleLinkAnalytics = async (linkId: number) => {
//   const res = await fetch(
//     `${API_BASE_URL}/ai/link/analytics/${linkId}`,
//     {
//       method: "GET",
//       headers: getAuthHeaders(),
//     }
//   );

//   return handleResponse(res);
// };