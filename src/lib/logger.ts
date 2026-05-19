import pino from "pino";

// PHIPA-aware: redact common PHI fields so they never appear in logs.
const PHI_REDACT_PATHS = [
  "*.firstName",
  "*.lastName",
  "*.dob",
  "*.phone",
  "*.address",
  "*.mrn",
  "*.transcript",
  "*.subjective",
  "*.objective",
  "*.assessment",
  "*.plan",
  "*.email",
  "*.passwordHash",
  "password",
  "passwordHash",
  "transcript",
  "audioUrl",
  "rawAudioUrl",
];

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: process.env.REDACT_PHI_IN_LOGS === "true"
    ? { paths: PHI_REDACT_PATHS, censor: "[REDACTED-PHI]" }
    : undefined,
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
