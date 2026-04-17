// app/page.tsx
// This is a fallback in case middleware doesn't fire.
// Middleware handles the real redirect at the edge.
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
