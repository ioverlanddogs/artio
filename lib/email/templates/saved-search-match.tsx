import * as React from "react";
import { EmailLayout } from "./_layout";

type SavedSearchMatchPayload = {
  searchName: string;
  eventTitle: string;
  eventSlug?: string | null;
};

export function getSubject({ eventTitle }: SavedSearchMatchPayload) {
  return `New saved-search match: ${eventTitle}`;
}

export function SavedSearchMatchEmail({ searchName, eventTitle, eventSlug }: SavedSearchMatchPayload) {
  return (
    <EmailLayout preview={`${eventTitle} matches your saved search.`}>
      <p>
        {eventTitle} matches your saved search "{searchName}".
      </p>
      {eventSlug ? <a href={`/events/${eventSlug}`}>View event</a> : null}
    </EmailLayout>
  );
}
