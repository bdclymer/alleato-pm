// frontend/src/lib/schemas/roadmap-schema.ts
import { z } from "zod";

export const ROADMAP_PHASES = ["in_progress", "immediate", "high_priority", "future"] as const;
export type RoadmapPhase = (typeof ROADMAP_PHASES)[number];

export const PHASE_META: Record<RoadmapPhase, { label: string; dotColor: string; cardColor: string }> = {
  in_progress:   { label: "In Progress",   dotColor: "bg-blue-500",   cardColor: "border-l-blue-500" },
  immediate:     { label: "Immediate",     dotColor: "bg-orange-500", cardColor: "border-l-orange-500" },
  high_priority: { label: "High Priority", dotColor: "bg-yellow-500", cardColor: "border-l-yellow-500" },
  future:        { label: "Future",        dotColor: "bg-green-500",  cardColor: "border-l-green-500" },
};

export const roadmapItemSchema = z.object({
  id: z.string().uuid(),
  phase: z.enum(ROADMAP_PHASES),
  title: z.string().min(1, "Title is required"),
  description: z.string().nullable().optional(),
  bullet_points: z.array(z.string()).default([]),
  sort_order: z.number().int().default(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const createRoadmapItemSchema = z.object({
  phase: z.enum(ROADMAP_PHASES),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  bullet_points: z.array(z.string().min(1)).default([]),
  sort_order: z.number().int().optional().default(0),
});

export const updateRoadmapItemSchema = createRoadmapItemSchema.partial().extend({
  sort_order: z.number().int().optional(),
});

export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
export type CreateRoadmapItemInput = z.infer<typeof createRoadmapItemSchema>;
export type UpdateRoadmapItemInput = z.infer<typeof updateRoadmapItemSchema>;
