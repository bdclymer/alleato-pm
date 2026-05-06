export type SignedInBriefIdentity = {
  isBrandon: boolean;
  profileName: string | null;
  profileEmail: string | null;
  personName: string | null;
  personEmail: string | null;
};

export function isPersonalDailyBriefRequest(message: string): boolean {
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
