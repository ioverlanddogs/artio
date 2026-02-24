import { notFound } from "next/navigation";
import AdminEntityForm from "@/app/(admin)/admin/_components/AdminEntityForm";
import AdminPageHeader from "@/app/(admin)/admin/_components/AdminPageHeader";
import { db } from "@/lib/db";
import { ADMIN_IMAGE_ALT_REQUIRED } from "@/lib/admin-policy";
import { AdminArchiveActions } from "@/app/(admin)/admin/_components/AdminArchiveActions";

export default async function AdminArtist({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await db.artist.findUnique({ where: { id } });
  if (!artist) notFound();

  return (
    <main className="space-y-6">
      <AdminPageHeader title="Edit artist" backHref="/admin/artists" backLabel="Back to artists" right={<AdminArchiveActions entity="artists" id={artist.id} archived={!!artist.deletedAt} />} />
      <AdminEntityForm
        title="Edit Artist"
        endpoint={`/api/admin/artists/${id}`}
        method="PATCH"
        redirectPath="/admin/artists"
        uploadTargetType="artist"
        uploadTargetId={id}
        initial={artist}
        fields={[
          { name: "name", label: "Name" },
          { name: "slug", label: "Slug" },
          { name: "bio", label: "Bio" },
          { name: "websiteUrl", label: "Website URL" },
          { name: "instagramUrl", label: "Instagram URL" },
          { name: "avatarImageUrl", label: "Avatar Image URL" },
          { name: "featuredImageUrl", label: "Featured Image URL" },
          { name: "featuredAssetId", label: "Featured Asset ID" },
        ]}
        altRequired={ADMIN_IMAGE_ALT_REQUIRED}
      />
    </main>
  );
}
