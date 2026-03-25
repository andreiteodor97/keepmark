import { prisma } from "./db";
import { deleteBlob } from "./blobs";

export async function cleanupExpiredSites(): Promise<number> {
  const now = new Date();

  const expiredSites = await prisma.site.findMany({
    where: {
      ttl: { lt: now },
      status: { not: "deleted" },
    },
    include: {
      versions: {
        include: { files: true },
      },
    },
  });

  let cleaned = 0;

  for (const site of expiredSites) {
    for (const version of site.versions) {
      for (const file of version.files) {
        try {
          const blob = await prisma.fileBlob.update({
            where: { hash: file.hash },
            data: { refCount: { decrement: 1 } },
          });
          if (blob.refCount <= 0) {
            await deleteBlob(file.hash);
            await prisma.fileBlob.delete({ where: { hash: file.hash } });
          }
        } catch {
          // Blob may already be deleted by another cleanup
        }
      }
    }

    await prisma.siteVersion.deleteMany({
      where: { siteId: site.id },
    });

    await prisma.site.update({
      where: { id: site.id },
      data: { status: "deleted" },
    });

    if (site.userId) {
      const totalSize = site.versions.reduce(
        (sum, v) => sum + v.files.reduce((s, f) => s + f.size, 0),
        0,
      );
      await prisma.user
        .update({
          where: { id: site.userId },
          data: {
            siteCount: { decrement: 1 },
            storageUsedBytes: { decrement: totalSize },
          },
        })
        .catch(() => {});
    }

    cleaned++;
  }

  return cleaned;
}
