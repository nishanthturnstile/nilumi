export type EvaluationMode = "zdr" | "synthetic_hobby";
export const SYNTHETIC_FIXTURE_SHA256 =
  "962a1af2ba29d60cf3a16d6df1a2891d0d2c6713a0d852b41731dddfbf8caadd";
export function evaluationMode(
  value: string | undefined,
): EvaluationMode | null {
  if (value === undefined || value === "zdr") return "zdr";
  return value === "synthetic_hobby" ? value : null;
}

export function evaluationDisclosure(mode: EvaluationMode) {
  return {
    evaluationMode: mode,
    scope: "synthetic_s3",
    zeroDataRetentionRequired: mode === "zdr",
    noPromptTrainingRequired: true,
    productionAccepted: false,
  } as const;
}
