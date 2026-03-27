type ApprovalErrorCode =
  | "approval_failed"
  | "approval_invalid_state"
  | "approval_artist_name_missing"
  | "approval_artist_resolution_failed"
  | "approval_unexpected_error";

type ImageImportStatus = "not_attempted" | "imported" | "failed" | "no_image_found";

const MAX_APPROVAL_ERROR_LEN = 160;
const MAX_IMAGE_WARNING_LEN = 400;

function truncate(value: string, maxLen: number): string {
  return value.length > maxLen ? `${value.slice(0, maxLen - 1)}…` : value;
}

export function normalizeApprovalError(error: unknown, fallback: ApprovalErrorCode = "approval_unexpected_error"): string {
  if (!error) return fallback;
  if (typeof error === "string") return truncate(error, MAX_APPROVAL_ERROR_LEN);
  if (error instanceof Error && error.message.trim().length > 0) {
    return truncate(error.message.trim(), MAX_APPROVAL_ERROR_LEN);
  }

  const code = (error as { code?: unknown })?.code;
  if (typeof code === "string" && code.trim().length > 0) {
    return truncate(code.trim(), MAX_APPROVAL_ERROR_LEN);
  }

  return fallback;
}

export function normalizeImageImportWarning(warning: string | null | undefined): string | null {
  if (!warning) return null;
  const cleaned = warning.trim();
  if (!cleaned) return null;
  return truncate(cleaned, MAX_IMAGE_WARNING_LEN);
}

async function patchArtistCandidate(
  db: { ingestExtractedArtist?: { updateMany?: (args: any) => Promise<unknown>; update?: (args: any) => Promise<unknown> } },
  candidateId: string,
  data: Record<string, unknown>,
) {
  if (!db.ingestExtractedArtist) return;
  if (db.ingestExtractedArtist.updateMany) {
    await db.ingestExtractedArtist.updateMany({ where: { id: candidateId }, data });
    return;
  }
  if (db.ingestExtractedArtist.update) {
    await db.ingestExtractedArtist.update({ where: { id: candidateId }, data });
  }
}

async function patchArtworkCandidate(
  db: { ingestExtractedArtwork?: { updateMany?: (args: any) => Promise<unknown>; update?: (args: any) => Promise<unknown> } },
  candidateId: string,
  data: Record<string, unknown>,
) {
  if (!db.ingestExtractedArtwork) return;
  if (db.ingestExtractedArtwork.updateMany) {
    await db.ingestExtractedArtwork.updateMany({ where: { id: candidateId }, data });
    return;
  }
  if (db.ingestExtractedArtwork.update) {
    await db.ingestExtractedArtwork.update({ where: { id: candidateId }, data });
  }
}

export async function markArtistApprovalAttempt(
  db: { ingestExtractedArtist?: { updateMany?: (args: { where: { id: string }; data: { lastApprovalAttemptAt: Date } }) => Promise<unknown>; update?: (args: { where: { id: string }; data: { lastApprovalAttemptAt: Date } }) => Promise<unknown> } },
  candidateId: string,
) {
  await patchArtistCandidate(db, candidateId, { lastApprovalAttemptAt: new Date() });
}

export async function markArtistApprovalFailure(
  db: { ingestExtractedArtist?: { updateMany?: (args: { where: { id: string }; data: { lastApprovalError: string } }) => Promise<unknown>; update?: (args: { where: { id: string }; data: { lastApprovalError: string } }) => Promise<unknown> } },
  candidateId: string,
  error: string,
) {
  await patchArtistCandidate(db, candidateId, { lastApprovalError: truncate(error, MAX_APPROVAL_ERROR_LEN) });
}

export async function markArtworkApprovalAttempt(
  db: { ingestExtractedArtwork?: { updateMany?: (args: { where: { id: string }; data: { lastApprovalAttemptAt: Date } }) => Promise<unknown>; update?: (args: { where: { id: string }; data: { lastApprovalAttemptAt: Date } }) => Promise<unknown> } },
  candidateId: string,
) {
  await patchArtworkCandidate(db, candidateId, { lastApprovalAttemptAt: new Date() });
}

export async function markArtworkApprovalFailure(
  db: { ingestExtractedArtwork?: { updateMany?: (args: { where: { id: string }; data: { lastApprovalError: string } }) => Promise<unknown>; update?: (args: { where: { id: string }; data: { lastApprovalError: string } }) => Promise<unknown> } },
  candidateId: string,
  error: string,
) {
  await patchArtworkCandidate(db, candidateId, { lastApprovalError: truncate(error, MAX_APPROVAL_ERROR_LEN) });
}

export async function markArtistImageImportOutcome(
  db: { ingestExtractedArtist?: { updateMany?: (args: { where: { id: string }; data: { imageImportStatus: ImageImportStatus; imageImportWarning: string | null } }) => Promise<unknown>; update?: (args: { where: { id: string }; data: { imageImportStatus: ImageImportStatus; imageImportWarning: string | null } }) => Promise<unknown> } },
  candidateId: string,
  status: ImageImportStatus,
  warning: string | null,
) {
  await patchArtistCandidate(db, candidateId, {
    imageImportStatus: status,
    imageImportWarning: normalizeImageImportWarning(warning),
  });
}

export async function markArtworkImageImportOutcome(
  db: { ingestExtractedArtwork?: { updateMany?: (args: { where: { id: string }; data: { imageImportStatus: ImageImportStatus; imageImportWarning: string | null } }) => Promise<unknown>; update?: (args: { where: { id: string }; data: { imageImportStatus: ImageImportStatus; imageImportWarning: string | null } }) => Promise<unknown> } },
  candidateId: string,
  status: ImageImportStatus,
  warning: string | null,
) {
  await patchArtworkCandidate(db, candidateId, {
    imageImportStatus: status,
    imageImportWarning: normalizeImageImportWarning(warning),
  });
}
