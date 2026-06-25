import {
  buildAiProfileContextPacket,
  type AiProfileContextUser,
} from "@/lib/ai/ai-profile-context-packet";
import type { AiProfileMemory } from "@/lib/ai/ai-profile-summary";

const user: AiProfileContextUser = {
  id: "user_1",
  fullName: "Test User",
  email: "test@example.com",
  company: "Alleato",
  title: "Project Manager",
  role: "pm",
  profileCompleteness: 80,
  isAdmin: false,
  isDeveloper: false,
};

const memory = (overrides: Partial<AiProfileMemory>): AiProfileMemory => ({
  id: "mem_1",
  type: "preference",
  content: "Prefers concise project risk summaries.",
  confidence: 0.9,
  importance: 0.8,
  project_id: null,
  source: "manual",
  visibility: "private",
  created_at: "2026-06-01T12:00:00.000Z",
  last_accessed_at: null,
  access_count: 0,
  ...overrides,
});

describe("ai profile context packet", () => {
  it("builds a bounded packet with identity and preview-only default for standard users", () => {
    const packet = buildAiProfileContextPacket({
      user,
      memories: [
        memory({ id: "global", project_id: null, importance: 0.7 }),
        memory({ id: "project", project_id: 25125, importance: 0.6 }),
        memory({ id: "other", project_id: 1009, importance: 1 }),
      ],
      activeProjectId: 25125,
      maxMemories: 2,
    });

    expect(packet.identity).toMatchObject({
      userId: "user_1",
      displayName: "Test User",
      email: "test@example.com",
      title: "Project Manager",
    });
    expect(packet.approvalPolicy).toMatchObject({
      authority: "standard",
      defaultWriteMode: "preview_only",
    });
    expect(packet.memoryContext.included.map((item) => item.id)).toEqual([
      "project",
      "global",
    ]);
    expect(packet.memoryContext.omittedCount).toBe(1);
  });

  it("allows commit after preview for admin profiles", () => {
    const packet = buildAiProfileContextPacket({
      user: { ...user, isAdmin: true },
      memories: [],
      leadershipContext: {
        state: "available",
        source: "leadership_profile",
        items: [],
      },
    });

    expect(packet.status).toBe("ready");
    expect(packet.approvalPolicy).toMatchObject({
      authority: "admin",
      defaultWriteMode: "commit_allowed",
    });
  });

  it("fails loudly when identity and approval authority are unresolved", () => {
    const packet = buildAiProfileContextPacket({
      user: null,
      memories: [],
    });

    expect(packet.status).toBe("degraded");
    expect(packet.identity.displayName).toBe("Unknown user");
    expect(packet.approvalPolicy).toMatchObject({
      authority: "unknown",
      defaultWriteMode: "preview_only",
    });
    expect(packet.blockedCapabilities).toEqual([
      "write_actions",
      "delivery_actions",
    ]);
    expect(packet.warnings).toContain("User identity is unresolved.");
    expect(packet.warnings).toContain("Approval authority is unknown.");
  });

  it("caps memory context even when callers request too many memories", () => {
    const memories = Array.from({ length: 12 }, (_, index) =>
      memory({
        id: `mem_${index}`,
        importance: index / 10,
        created_at: `2026-06-${String(index + 1).padStart(2, "0")}T12:00:00.000Z`,
      }),
    );

    const packet = buildAiProfileContextPacket({
      user,
      memories,
      maxMemories: 25,
    });

    expect(packet.memoryContext.included).toHaveLength(8);
    expect(packet.memoryContext.omittedCount).toBe(4);
  });

  it("keeps leadership context explicit when it is not configured", () => {
    const packet = buildAiProfileContextPacket({
      user,
      memories: [],
    });

    expect(packet.leadershipContext).toMatchObject({
      state: "not_configured",
    });
    expect(packet.warnings).toContain(
      "Leadership coaching context has no durable source or visibility policy yet.",
    );
  });
});
