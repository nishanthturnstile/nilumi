import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { needsStepUp, readSessionToken } from "@/lib/auth";
import { StepUpForm } from "./stepup-form";

export default async function Sensitive() {
  const store = await cookies();
  const session = readSessionToken(store.get("nilumi_session")?.value);
  if (!session) redirect("/auth/sign-in");
  if (needsStepUp(session.authAt)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-semibold">Step-up required</h1>
        <p className="text-neutral-500">Re-enter a fresh code to view this.</p>
        <StepUpForm email={session.email} />
      </main>
    );
  }
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sensitive view</h1>
      <p className="text-neutral-500">Fresh session — this is where private member data would render.</p>
    </main>
  );
}
