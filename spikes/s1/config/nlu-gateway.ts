export type GatewayTransport = "cloudflare" | "vercel";
export function gatewayTransport(
  value: string | undefined,
): GatewayTransport | null {
  if (value === undefined || value === "vercel") return "vercel";
  return value === "cloudflare" ? "cloudflare" : null;
}
