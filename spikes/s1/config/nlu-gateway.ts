export type GatewayTransport = "cloudflare" | "vercel";
export function gatewayTransport(
  value: string | undefined,
): GatewayTransport | null {
  if (value === undefined || value === "cloudflare") return "cloudflare";
  return value === "vercel" ? "vercel" : null;
}
