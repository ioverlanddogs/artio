import * as React from "react";
import { EmailLayout } from "./_layout";

type SubmissionSubmittedPayload = {
  submissionType?: "EVENT" | "VENUE" | "ARTIST" | "ARTWORK";
};

export function getSubject() {
  return "Submission received";
}

export function SubmissionSubmittedEmail({ submissionType }: SubmissionSubmittedPayload) {
  return (
    <EmailLayout preview="Your submission has been received.">
      <p>
        {submissionType === "VENUE"
          ? "Your venue submission is now pending moderation."
          : "Your submission is now pending moderation."}
      </p>
    </EmailLayout>
  );
}
