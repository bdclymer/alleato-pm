export type SignedInBriefIdentity = {
  isBrandon: boolean;
  profileName: string | null;
  profileEmail: string | null;
  personName: string | null;
  personEmail: string | null;
};

export function isDailyBriefCritiqueRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  const mentionsBrief = [
    "daily brief",
    "daily briefing",
    "daily update",
    "executive brief",
    "executive briefing",
    "brandon daily update",
  ].some((phrase) => normalized.includes(phrase));

  if (!mentionsBrief) return false;

  return [
    "format",
    "structured",
    "structure",
    "confusing",
    "not clear",
    "unclear",
    "hard to read",
    "what do you think",
    "what needs to change",
    "how should this change",
    "improve",
    "redesign",
  ].some((phrase) => normalized.includes(phrase));
}

export function isPersonalDailyBriefRequest(message: string): boolean {
  if (isDailyBriefCritiqueRequest(message)) return false;

  const normalized = message.toLowerCase();
  const asksForBrief = [
    "daily brief",
    "daily briefing",
    "daily update",
    "morning brief",
    "morning update",
    "what needs my attention",
    "what should i know today",
  ].some((phrase) => normalized.includes(phrase));

  if (!asksForBrief) return false;

  return /\b(my|me|i|today|morning)\b/i.test(normalized);
}

export function isExecutiveBriefingMetadataQuestion(message: string): boolean {
  const normalized = message.toLowerCase();
  const asksAboutTiming = [
    "when was",
    "what time",
    "when did",
    "how old",
    "is this current",
    "is this daily",
    "is this briefing",
    "is this brief",
    "is this report",
    "is it current",
  ].some((phrase) => normalized.includes(phrase));

  if (!asksAboutTiming) return false;

  const mentionsBrief = [
    "this",
    "briefing",
    "brief",
    "report",
    "daily update",
    "daily operating brief",
    "executive brief",
    "regenerated",
    "generated",
    "approved",
    "sent",
  ].some((phrase) => normalized.includes(phrase));

  return mentionsBrief;
}

export function isPersonalTaskRegisterRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  if (isPersonalDailyBriefRequest(message)) return false;

  return [
    "what are my tasks",
    "what're my tasks",
    "my tasks",
    "my task list",
    "my to-do",
    "my todo",
    "what do i need to do",
    "what am i supposed to do",
    "what is on my plate",
    "what's on my plate",
    "tasks assigned to me",
    "open tasks for me",
  ].some((phrase) => normalized.includes(phrase));
}

export function identityLooksLikeBrandon(
  identity: Omit<SignedInBriefIdentity, "isBrandon">,
): boolean {
  const haystack = [
    identity.profileName,
    identity.profileEmail,
    identity.personName,
    identity.personEmail,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return /\bbrandon\b/.test(haystack);
}
