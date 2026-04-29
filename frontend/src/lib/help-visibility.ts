import type {
  HelpArticleAudience,
  HelpArticleFrontmatter,
} from "./help-articles";

export type HelpAudiencePolicy = {
  label: string;
  appearsInClientHelpCenter: boolean;
  appearsInDefaultAiHelp: boolean;
  requiresAdmin: boolean;
};

export const HELP_AUDIENCE_POLICIES: Record<
  HelpArticleAudience,
  HelpAudiencePolicy
> = {
  client: {
    label: "Client",
    appearsInClientHelpCenter: true,
    appearsInDefaultAiHelp: true,
    requiresAdmin: false,
  },
  subcontractor: {
    label: "Subcontractor/Vendor",
    appearsInClientHelpCenter: true,
    appearsInDefaultAiHelp: true,
    requiresAdmin: false,
  },
  admin: {
    label: "Admin only",
    appearsInClientHelpCenter: false,
    appearsInDefaultAiHelp: false,
    requiresAdmin: true,
  },
  internal: {
    label: "Internal team",
    appearsInClientHelpCenter: false,
    appearsInDefaultAiHelp: false,
    requiresAdmin: true,
  },
};

export function canArticleAppearInClientHelpCenter(
  frontmatter: HelpArticleFrontmatter,
): boolean {
  return (
    frontmatter.visibility === "published" &&
    frontmatter.client_visible &&
    HELP_AUDIENCE_POLICIES[frontmatter.audience].appearsInClientHelpCenter
  );
}

export function canArticleAppearInDefaultAiHelp(
  frontmatter: HelpArticleFrontmatter,
): boolean {
  return (
    frontmatter.visibility === "published" &&
    frontmatter.ai_visible &&
    HELP_AUDIENCE_POLICIES[frontmatter.audience].appearsInDefaultAiHelp
  );
}

export function validateHelpVisibilityPolicy(
  frontmatter: HelpArticleFrontmatter,
  relativePath: string,
): string[] {
  const errors: string[] = [];
  const policy = HELP_AUDIENCE_POLICIES[frontmatter.audience];

  if (frontmatter.client_visible && !policy.appearsInClientHelpCenter) {
    errors.push(
      `${relativePath}: audience "${frontmatter.audience}" cannot set client_visible: true`,
    );
  }

  if (frontmatter.client_visible && !canArticleAppearInClientHelpCenter(frontmatter)) {
    errors.push(
      `${relativePath}: client-visible articles must be published and client-safe`,
    );
  }

  if (frontmatter.ai_visible && !policy.appearsInDefaultAiHelp) {
    errors.push(
      `${relativePath}: audience "${frontmatter.audience}" cannot set ai_visible: true until role-aware AI retrieval is implemented`,
    );
  }

  return errors;
}
