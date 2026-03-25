import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { DashboardShell } from "../dashboard/shell";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  return (
    <DashboardShell userEmail={session.user.email}>
      {children}
    </DashboardShell>
  );
}
