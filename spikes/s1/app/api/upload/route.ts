export async function POST(req: Request) {
  const blob = await req.blob();
  return Response.json({
    ok: true,
    provider: "spike-noop",
    bytes: blob.size,
    type: blob.type,
  });
}
