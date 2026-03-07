import { getSiteSettings } from "@/lib/site-settings/get-site-settings";
import { logInfo, logWarn } from "@/lib/logging";
import { getGoogleAccessTokenFromServiceAccount } from "@/lib/googleapis";

type IndexingType = "URL_UPDATED" | "URL_DELETED";

type Deps = {
  getSiteSettingsFn?: typeof getSiteSettings;
  getAccessTokenFn?: typeof getGoogleAccessTokenFromServiceAccount;
  fetchFn?: typeof fetch;
};

export async function notifyGoogleIndexing(eventUrl: string, type: IndexingType, deps: Deps = {}) {
  try {
    const settings = await (deps.getSiteSettingsFn ?? getSiteSettings)();
    if (!settings.googleIndexingEnabled) return;
    if (!settings.googleServiceAccountJson?.trim()) return;

    const parsed = JSON.parse(settings.googleServiceAccountJson) as { client_email?: string; private_key?: string };
    if (!parsed.client_email || !parsed.private_key) {
      logWarn({ message: "google_indexing_invalid_service_account", eventUrl, type });
      return;
    }

    const accessToken = await (deps.getAccessTokenFn ?? getGoogleAccessTokenFromServiceAccount)({
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    });
    if (!accessToken) {
      logWarn({ message: "google_indexing_missing_access_token", eventUrl, type });
      return;
    }

    const response = await (deps.fetchFn ?? fetch)("https://indexing.googleapis.com/v3/urlNotifications:publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ url: eventUrl, type }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logWarn({ message: "google_indexing_publish_failed", eventUrl, type, status: response.status, body: text.slice(0, 500) });
      return;
    }

    logInfo({ message: "google_indexing_publish_ok", eventUrl, type });
  } catch (error) {
    logWarn({
      message: "google_indexing_publish_error",
      eventUrl,
      type,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
