import { handleBakeoff } from "@/lib/bakeoff";

export async function POST(req: Request) {
  return handleBakeoff(req);
}
