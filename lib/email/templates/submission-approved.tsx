import * as React from "react";
import { EmailLayout } from "./_layout";

export function getSubject() {
  return "Submission approved";
}

export function SubmissionApprovedEmail() {
  return (
    <EmailLayout preview="Your submission has been approved.">
      <p>Your submission has been approved and published.</p>
    </EmailLayout>
  );
}
