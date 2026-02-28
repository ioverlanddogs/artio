import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Checks = {
  basicInfo: boolean;
  location: boolean;
  images: boolean;
  contact: boolean;
  publishReady: boolean;
};

const ITEMS: Array<{ key: keyof Checks; label: string }> = [
  { key: "basicInfo", label: "Basic info" },
  { key: "location", label: "Location" },
  { key: "images", label: "Images" },
  { key: "contact", label: "Contact/Details" },
];

export default function VenueCompletionProgress({ checks }: { checks: Checks }) {
  const completeCount = ITEMS.filter((item) => checks[item.key]).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Completion progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">{completeCount} of {ITEMS.length} complete</p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.key} className="flex items-center gap-2 rounded border px-3 py-2">
              <span aria-hidden>{checks[item.key] ? "✓" : "✕"}</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
