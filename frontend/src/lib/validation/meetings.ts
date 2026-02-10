import { z } from "zod";

export const meetingSchema = z
  .object({
    id: z.string(),
    title: z.string().nullable().optional(),
    date: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    url: z.string().nullable().optional(),
    project: z.string().nullable().optional(),
    participants: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    fireflies_link: z.string().nullable().optional(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional(),
  })
  .passthrough();

export const meetingsSchema = z.array(meetingSchema);

export type Meeting = z.infer<typeof meetingSchema>;
