// VITE_API_URL must point to the /api prefix of the backend.
// Examples:
//   Local dev (Vite proxy):         /api               (default)
//   Railway/Render production:      https://your-backend.railway.app/api
// A URL that ends with /api is correct.  A bare origin without /api will be
// normalised automatically, but setting VITE_API_URL correctly is preferred.
function resolveApiUrl(raw) {
  const trimmed = (raw || "/api").replace(/\/+$/, "");
  // If the caller gave us a full origin without a path (e.g. https://host or
  // https://host:3000) append /api so every apiRequest path is correct.
  try {
    if (trimmed && !trimmed.startsWith("/")) {
      const parsed = new URL(trimmed);
      if (parsed.pathname === "/" || parsed.pathname === "") {
        return trimmed + "/api";
      }
    }
  } catch {
    // Not a full URL — relative path like "/api", fall through.
  }
  return trimmed;
}

export { resolveApiUrl };
const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL);

export async function apiRequest(path, options = {}) {
  const { body, headers = {}, responseType, ...requestOptions } = options;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...requestOptions,
    credentials: "include",
    headers: {
      ...(body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  let responseBody = null;
  if (response.status !== 204) {
    try {
      responseBody = response.ok && responseType === "blob"
        ? await response.blob()
        : response.headers.get("content-type")?.includes("application/json")
        ? await response.json()
        : await response.text();
    } catch {
      throw new Error("The server returned an invalid response");
    }
  }

  if (!response.ok) {
    const message =
      responseBody?.message ||
      (typeof responseBody === "string" && responseBody.trim()) ||
      `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.details = responseBody;
    throw error;
  }

  return responseBody;
}
