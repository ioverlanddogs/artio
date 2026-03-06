import { NotificationType } from "@prisma/client";
import React from "react";
import { render } from "@react-email/components";
import { NotificationTemplatePayload } from "@/lib/notification-templates";

type RenderedEmail = { subject: string; html: string; text: string };

export async function renderEmailTemplate(type: NotificationType, payload: NotificationTemplatePayload): Promise<RenderedEmail> {
  switch (type) {
    case "INVITE_CREATED": {
      if (payload.type !== "INVITE_CREATED") throw new Error("notification_template_payload_mismatch");
      const { VenueInviteEmail, getSubject } = await import("./templates/venue-invite");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(VenueInviteEmail, payload)),
        text: await render(React.createElement(VenueInviteEmail, payload), { plainText: true }),
      };
    }
    case "SUBMISSION_SUBMITTED": {
      if (payload.type !== "SUBMISSION_SUBMITTED") throw new Error("notification_template_payload_mismatch");
      const { SubmissionSubmittedEmail, getSubject } = await import("./templates/submission-submitted");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(SubmissionSubmittedEmail, payload)),
        text: await render(React.createElement(SubmissionSubmittedEmail, payload), { plainText: true }),
      };
    }
    case "SUBMISSION_APPROVED": {
      if (payload.type !== "SUBMISSION_APPROVED") throw new Error("notification_template_payload_mismatch");
      const { SubmissionApprovedEmail, getSubject } = await import("./templates/submission-approved");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(SubmissionApprovedEmail, payload)),
        text: await render(React.createElement(SubmissionApprovedEmail, payload), { plainText: true }),
      };
    }
    case "SUBMISSION_REJECTED": {
      if (payload.type !== "SUBMISSION_REJECTED") throw new Error("notification_template_payload_mismatch");
      const { SubmissionRejectedEmail, getSubject } = await import("./templates/submission-rejected");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(SubmissionRejectedEmail, payload)),
        text: await render(React.createElement(SubmissionRejectedEmail, payload), { plainText: true }),
      };
    }
    case "SAVED_SEARCH_MATCH": {
      if (payload.type !== "SAVED_SEARCH_MATCH") throw new Error("notification_template_payload_mismatch");
      const { SavedSearchMatchEmail, getSubject } = await import("./templates/saved-search-match");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(SavedSearchMatchEmail, payload)),
        text: await render(React.createElement(SavedSearchMatchEmail, payload), { plainText: true }),
      };
    }
    case "DIGEST_READY": {
      const { default: WeeklyDigestEmail, getSubject } = await import("./templates/weekly-digest");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(WeeklyDigestEmail, payload)),
        text: await render(React.createElement(WeeklyDigestEmail, payload), { plainText: true }),
      };
    }
    case "VENUE_CLAIM_VERIFY": {
      const { default: VenueClaimVerifyEmail, getSubject } = await import("./templates/venue-claim-verify");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(VenueClaimVerifyEmail, payload)),
        text: await render(React.createElement(VenueClaimVerifyEmail, payload), { plainText: true }),
      };
    }
    case "VENUE_CLAIM_APPROVED": {
      const { default: VenueClaimApprovedEmail, getSubject } = await import("./templates/venue-claim-approved");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(VenueClaimApprovedEmail, payload)),
        text: await render(React.createElement(VenueClaimApprovedEmail, payload), { plainText: true }),
      };
    }
    case "VENUE_CLAIM_REJECTED": {
      const { default: VenueClaimRejectedEmail, getSubject } = await import("./templates/venue-claim-rejected");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(VenueClaimRejectedEmail, payload)),
        text: await render(React.createElement(VenueClaimRejectedEmail, payload), { plainText: true }),
      };
    }
    case "RSVP_CONFIRMED": {
      const { default: RsvpConfirmationEmail, getSubject } = await import("./templates/rsvp-confirmation");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(RsvpConfirmationEmail, payload)),
        text: await render(React.createElement(RsvpConfirmationEmail, payload), { plainText: true }),
      };
    }
    case "RSVP_CANCELLED": {
      const { default: RsvpCancellationEmail, getSubject } = await import("./templates/rsvp-cancellation");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(RsvpCancellationEmail, payload)),
        text: await render(React.createElement(RsvpCancellationEmail, payload), { plainText: true }),
      };
    }
    case "EVENT_CHANGE_NOTIFY": {
      const { default: EventChangeEmail, getSubject } = await import("./templates/event-change");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(EventChangeEmail, payload)),
        text: await render(React.createElement(EventChangeEmail, payload), { plainText: true }),
      };
    }
    case "EVENT_REMINDER_24H": {
      const { default: EventReminder24hEmail, getSubject } = await import("./templates/event-reminder-24h");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(EventReminder24hEmail, payload)),
        text: await render(React.createElement(EventReminder24hEmail, payload), { plainText: true }),
      };
    }
    case "NEW_USER_WELCOME": {
      const { default: NewUserWelcomeEmail, getSubject } = await import("./templates/new-user-welcome");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(NewUserWelcomeEmail, payload)),
        text: await render(React.createElement(NewUserWelcomeEmail, payload), { plainText: true }),
      };
    }
    case "BROADCAST": {
      const { default: BroadcastEmail, getSubject } = await import("./templates/broadcast");
      return {
        subject: getSubject(payload),
        html: await render(React.createElement(BroadcastEmail, payload)),
        text: await render(React.createElement(BroadcastEmail, payload), { plainText: true }),
      };
    }
    case "ARTWORK_VIEW_MILESTONE":
      throw new Error(`template not yet implemented: ${type}`);
    default: {
      const exhaustiveType: never = type;
      throw new Error(`template not yet implemented: ${exhaustiveType}`);
    }
  }
}
