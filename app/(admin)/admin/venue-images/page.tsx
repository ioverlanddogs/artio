import { redirect } from "next/navigation";

export default function AdminVenueImagesRedirect() {
  redirect("/admin/ingest/venue-images");
}
