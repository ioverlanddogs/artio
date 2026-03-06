import * as React from "react";
import { EmailLayout } from "./_layout";

type SubmissionRejectedPayload = {
  decisionReason?: string | null;
};

export function getSubject() {
  return "Submission needs changes";
}

export function SubmissionRejectedEmail({ decisionReason }: SubmissionRejectedPayload) {
  return (
    <EmailLayout preview="Your submission needs changes.">
      <p>{decisionReason ?? "Your submission was rejected by moderation."}</p>
    </EmailLayout>
  );
}
