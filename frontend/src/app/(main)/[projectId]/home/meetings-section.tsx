"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Clock, Users } from "lucide-react";
import type { Database } from "@/types/database.types";

type Meeting = Database["public"]["Tables"]["document_metadata"]["Row"];

interface MeetingsSectionProps {
  meetings: Meeting[];
  projectId: number;
  maxItems?: number;
}

/**
 * Format an email address into initials for avatar display.
 * e.g. "bclymer@alleatogroup.com" -> "BC"
 */
function getInitials(email: string): string {
  const localPart = email.split("@")[0];
  if (!localPart) return "?";
  const parts = localPart.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return localPart.substring(0, 2).toUpperCase();
}

export function MeetingsSection({
  meetings,
  projectId,
  maxItems = 5,
}: MeetingsSectionProps) {
  const displayMeetings = meetings.slice(0, maxItems);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Meetings
          </h3>
          {meetings.length > 0 && (
            <span className="text-[11px] text-muted-foreground/60 tabular-nums">{meetings.length}</span>
          )}
        </div>
        <Link
          href={`/${projectId}/meetings`}
          className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Meeting Cards */}
      {displayMeetings.length > 0 ? (
        <div className="space-y-4">
          {displayMeetings.map((meeting) => {
            const meetingDate = meeting.date
              ? new Date(meeting.date)
              : null;
            const participants = meeting.participants_array
              ? [...new Set(meeting.participants_array.map((p) => p.trim()).filter(Boolean))]
              : [];

            return (
              <Link
                key={meeting.id}
                href={`/${projectId}/meetings/${meeting.id}`}
                className="group flex gap-4 py-3 px-2 -mx-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                {/* Date Badge */}
                {meetingDate && (
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      {format(meetingDate, "MMM")}
                    </div>
                    <div className="text-xl font-light text-foreground leading-tight">
                      {format(meetingDate, "d")}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="text-sm font-medium text-foreground group-hover:text-primary truncate transition-colors">
                    {meeting.title || "Untitled Meeting"}
                  </div>

                  {/* Summary snippet */}
                  {meeting.summary && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {meeting.summary}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 mt-2">
                    {meeting.duration_minutes != null && meeting.duration_minutes > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
                        <Clock className="h-3 w-3" />
                        {meeting.duration_minutes} min
                      </span>
                    )}
                    {participants.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
                        <Users className="h-3 w-3" />
                        {participants.length} attendee{participants.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Participant Avatars */}
                {participants.length > 0 && (
                  <div className="hidden sm:flex items-center flex-shrink-0">
                    <div className="flex -space-x-2">
                      {participants.slice(0, 3).map((email, idx) => (
                        <div
                          key={`${meeting.id}-${idx}`}
                          className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center"
                          title={email}
                        >
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {getInitials(email)}
                          </span>
                        </div>
                      ))}
                      {participants.length > 3 && (
                        <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            +{participants.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No meetings yet</p>
      )}

    </div>
  );
}
