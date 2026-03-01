import { spawnSync } from "node:child_process";

const TARGET_FAILED_MIGRATION = "20260706120000_unified_content_status";

function runPrisma(
  args: string[],
  options: { allowFailure?: boolean; step: string } = { step: "Prisma command" },
) {
  console.log(`\n[prisma-safe-deploy] ${options.step}: pnpm prisma ${args.join(" ")}`);

  const result = spawnSync("pnpm", ["prisma", ...args], {
    env: process.env,
    encoding: "utf8",
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (stdout.trim().length > 0) {
    console.log(stdout.trimEnd());
  }

  if (stderr.trim().length > 0) {
    console.error(stderr.trimEnd());
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(
      `[prisma-safe-deploy] Command failed with exit code ${result.status}: pnpm prisma ${args.join(" ")}`,
    );
  }

  return {
    status: result.status ?? 1,
    output: `${stdout}\n${stderr}`,
  };
}

function getFailedMigrations(statusOutput: string): string[] {
  const migrationMatches = statusOutput.match(/\b\d{14}_[a-z0-9_]+\b/gi) ?? [];
  const unique = Array.from(new Set(migrationMatches));
  return unique.filter((migrationName) => {
    const lineRegex = new RegExp(`.*${migrationName}.*`, "gi");
    const lines = statusOutput.match(lineRegex) ?? [];
    return lines.some((line) => /failed|error|P3009/i.test(line));
  });
}

function hasMigrationFailure(statusOutput: string): boolean {
  return /failed migration|have failed|P3009|previously failed/i.test(statusOutput);
}

async function main() {
  console.log("[prisma-safe-deploy] Starting safe Prisma migration deploy flow.");

  const statusResult = runPrisma(["migrate", "status"], {
    allowFailure: true,
    step: "Checking migration status",
  });

  const failedMigrations = getFailedMigrations(statusResult.output);
  const migrationFailureDetected = hasMigrationFailure(statusResult.output);

  console.log(
    `[prisma-safe-deploy] Migration status command exit code: ${statusResult.status}. Failure detected: ${migrationFailureDetected}.`,
  );

  if (migrationFailureDetected) {
    if (!failedMigrations.includes(TARGET_FAILED_MIGRATION)) {
      throw new Error(
        `[prisma-safe-deploy] Found failed migration(s) [${failedMigrations.join(", ") || "unknown"
        }] that are not '${TARGET_FAILED_MIGRATION}'. Refusing automatic resolve.`,
      );
    }

    console.log(
      `[prisma-safe-deploy] Detected known failed migration '${TARGET_FAILED_MIGRATION}'. Marking as rolled back so deploy can re-apply the corrected SQL.`,
    );

    runPrisma(["migrate", "resolve", "--rolled-back", TARGET_FAILED_MIGRATION], {
      step: `Resolving failed migration ${TARGET_FAILED_MIGRATION}`,
    });

    console.log("[prisma-safe-deploy] Resolve step completed.");
  } else {
    console.log("[prisma-safe-deploy] No failed migration detected. Resolve step not required.");
  }

  runPrisma(["migrate", "deploy"], {
    step: "Running migrate deploy",
  });

  runPrisma(["migrate", "status"], {
    step: "Verifying migration status after deploy",
  });

  console.log("[prisma-safe-deploy] ✅ Safe deploy completed successfully.");
}

main().catch((error) => {
  console.error("[prisma-safe-deploy] ❌ Safe deploy failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
