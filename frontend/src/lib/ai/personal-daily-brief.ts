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
