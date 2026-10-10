import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { readSessionToken } from "@/lib/auth";

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ switch?: string }>;
}) {
  const session = readSessionToken(
    (await cookies()).get("nilumi_session")?.value,
  );
  if (session && (await searchParams).switch !== "1") redirect("/");
  return <SignInForm />;
}
