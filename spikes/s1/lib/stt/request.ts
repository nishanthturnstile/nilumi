export type SttResult = {
  provider: string;
  model: string;
  text: string;
  ms: number;
  status: "ok" | "error";
  error?: string;
};

export async function requestTranscript(
  provider: string,
  model: string,
  url: string,
  headers: Record<string, string>,
  body: FormData,
  field: "transcript" | "text",
): Promise<SttResult> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(30_000),
    });
    const data = await res.json().catch(() => null);
    // Upstream error bodies can echo submitted family data.
    if (!res.ok) throw new Error(`Provider HTTP ${res.status}`);
    if (!data || typeof data[field] !== "string")
      throw new Error("Provider returned no valid transcript");
    return {
      provider,
      model,
      text: data[field],
      ms: Date.now() - started,
      status: "ok",
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "Provider timed out after 30 seconds"
        : error instanceof Error
          ? error.message
          : "Provider request failed";
    return {
      provider,
      model,
      text: "",
      ms: Date.now() - started,
      status: "error",
      error: message,
    };
  }
}
