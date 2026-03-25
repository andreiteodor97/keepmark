import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReadView } from "./read-view";

interface ReadPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadPage({ params }: ReadPageProps) {
  const session = await getSessionFromCookies();
  if (!session) redirect("/login");

  const { id } = await params;

  const item = await prisma.item.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!item) {
    redirect("/dashboard");
  }

  const tags = (item.tags as string[]) ?? [];

  return (
    <ReadView
      item={{
        id: item.id,
        url: item.url,
        title: item.title,
        favicon: item.favicon,
        status: item.status,
        tags,
        notes: item.notes,
        contentMarkdown: item.contentMarkdown,
        contentAvailable: item.contentAvailable,
        createdAt: item.createdAt.toISOString(),
        processedAt: item.processedAt?.toISOString() ?? null,
      }}
    />
  );
}
