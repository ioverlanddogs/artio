import { notFound } from "next/navigation";
import AdminEntityForm from "@/app/(admin)/admin/_components/AdminEntityForm";
import { db } from "@/lib/db";
import { ADMIN_IMAGE_ALT_REQUIRED } from "@/lib/admin-policy";

export default async function AdminVenue({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const venue = await db.venue.findUnique({ where: { id } });
  if (!venue) notFound();

  return (
    <AdminEntityForm
      title="Edit Venue"
      endpoint={`/api/admin/venues/${id}`}
      method="PATCH"
      redirectPath="/admin/venues"
      uploadTargetType="venue"
      uploadTargetId={id}
      initial={venue}
      fields={[
        { name: "name", label: "Name" },
        { name: "slug", label: "Slug" },
        { name: "description", label: "Description" },
        { name: "addressLine1", label: "Address Line 1" },
        { name: "addressLine2", label: "Address Line 2" },
        { name: "city", label: "City" },
        { name: "region", label: "Region" },
        { name: "postcode", label: "Postcode" },
        { name: "country", label: "Country" },
        { name: "lat", label: "Latitude" },
        { name: "lng", label: "Longitude" },
        { name: "websiteUrl", label: "Website URL" },
        { name: "instagramUrl", label: "Instagram URL" },
        { name: "contactEmail", label: "Contact Email" },
        { name: "featuredImageUrl", label: "Featured Image URL" },
        { name: "featuredAssetId", label: "Featured Asset ID" },
      ]}
      altRequired={ADMIN_IMAGE_ALT_REQUIRED}
    />
  );
}
