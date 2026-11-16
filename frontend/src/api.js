const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
  .replace(/\/+$/, "");

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
