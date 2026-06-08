import {
  extractEmailDomain,
  matchAttributionRule,
  type ActiveAttributionRule,
} from "../attribution-rule-match";

const rules: ActiveAttributionRule[] = [
  {
    projectId: 5,
    ruleType: "domain",
    patternNormalized: "acme.com",
    confidence: 0.9,
    priority: 22,
  },
  {
    projectId: 9,
    ruleType: "email",
    patternNormalized: "pm@acme.com",
    confidence: 0.97,
    priority: 12,
  },
  {
    projectId: 7,
    ruleType: "title_keyword",
    patternNormalized: "danville",
    confidence: 0.75,
    priority: 42,
  },
];

describe("extractEmailDomain", () => {
  it("returns the lowercased domain", () => {
    expect(extractEmailDomain("Alice@Acme.com")).toBe("acme.com");
  });
  it("returns null for malformed addresses", () => {
    expect(extractEmailDomain("not-an-email")).toBeNull();
    expect(extractEmailDomain(null)).toBeNull();
  });
});

describe("matchAttributionRule", () => {
  it("prefers a specific email rule over a domain rule for the same sender", () => {
    const match = matchAttributionRule(
      { fromEmail: "pm@acme.com", title: "Anything" },
      rules,
    );
    expect(match?.projectId).toBe(9);
    expect(match?.ruleType).toBe("email");
  });

  it("falls back to a domain rule when no email rule matches", () => {
    const match = matchAttributionRule(
      { fromEmail: "bob@acme.com", title: "Anything" },
      rules,
    );
    expect(match?.projectId).toBe(5);
    expect(match?.ruleType).toBe("domain");
  });

  it("matches a title keyword on word boundaries", () => {
    const match = matchAttributionRule(
      { fromEmail: "someone@elsewhere.com", title: "Weekly Danville Theatre sync" },
      rules,
    );
    expect(match?.projectId).toBe(7);
    expect(match?.ruleType).toBe("title_keyword");
  });

  it("does not match a keyword embedded inside a larger word", () => {
    const match = matchAttributionRule(
      { fromEmail: "someone@elsewhere.com", title: "Danvilleshire update" },
      rules,
    );
    expect(match).toBeNull();
  });

  it("returns null when nothing matches", () => {
    expect(
      matchAttributionRule(
        { fromEmail: "x@other.com", title: "Unrelated" },
        rules,
      ),
    ).toBeNull();
  });

  it("returns null with no rules", () => {
    expect(
      matchAttributionRule({ fromEmail: "pm@acme.com", title: "x" }, []),
    ).toBeNull();
  });
});
