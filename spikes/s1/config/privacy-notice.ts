export const PILOT_NOTICE_VERSION = "founding-privacy-2026-10-10-v1";
export const PILOT_PROCESSORS = ["vercel-ai-gateway", "openai"] as const;
export const PILOT_NOTICE = [
  "Nilumi sends model requests through Vercel AI Gateway to OpenAI. These settings cover LLM and embedding requests; voice providers and calendar linking need their own notices before activation.",
  "Requests may include household facts, facts about the children, and calendar titles or locations when those features are enabled. Only approved OpenAI routes are enabled, training is disallowed, and supported generation storage is disabled.",
  "This pilot does not promise zero data retention. Published provider terms allow abuse-monitoring retention, legal or safety exceptions, and separate prompt-cache retention. Deleting information in Nilumi cannot erase copies a provider retains.",
  "The sensitive-input scanner refuses recognized secrets and financial or government identifiers. It is heuristic and may miss sensitive information; avoid submitting it.",
  "Either adult can withdraw here. Withdrawal blocks new and queued model requests; a request already sent to a provider cannot be recalled. The withdrawing adult must release their own veto before the owner can record a new household acknowledgement.",
  "By recording acknowledgement, the owner confirms that this notice has been explained to the other adult and covers both current adults. A changed notice, processor list or adult membership requires a new acknowledgement.",
] as const;
