"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Video, Clock, Users, ArrowRight } from "lucide-react";
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
    <div className="rounded-md border border-neutral-200 bg-background p-8 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          <Video className="h-5 w-5 text-brand" />
          <h3 className="text-2xs font-semibold tracking-[0.15em] uppercase text-brand">
            Meetings
          </h3>
          {meetings.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-2xs font-medium text-neutral-500 bg-neutral-100 rounded-full">
              {meetings.length}
            </span>
          )}
        </div>
        <Link
          href={`/${projectId}/meetings`}
          className="text-xs text-neutral-500 font-medium hover:underline"
        >
          View All
        </Link>
      </div>

      {/* Meeting Cards */}
      {displayMeetings.length > 0 ? (
        <div className="space-y-3">
          {displayMeetings.map((meeting) => {
            const meetingDate = meeting.date
              ? new Date(meeting.date)
              : null;
            const participants = meeting.participants
              ? [
                  ...new Set(
                    meeting.participants
                      .split(",")
                      .map((p) => p.trim())
                      .filter(Boolean)
                  ),
                ]
              : [];

            return (
              <Link
                key={meeting.id}
                href={`/${projectId}/meetings/${meeting.id}`}
                className="group flex gap-4 p-4 -mx-2 rounded-lg border border-transparent hover:border-neutral-200 hover:bg-neutral-50/50 transition-all"
              >
                {/* Date Badge */}
                {meetingDate && (
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-2xs font-semibold uppercase tracking-wider text-brand">
                      {format(meetingDate, "MMM")}
                    </div>
                    <div className="text-xl font-light text-neutral-900 leading-tight">
                      {format(meetingDate, "d")}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="text-sm font-medium text-neutral-900 group-hover:text-brand truncate transition-colors">
                    {meeting.title || "Untitled Meeting"}
                  </div>

                  {/* Summary snippet */}
                  {meeting.summary && (
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                      {meeting.summary}
                    </p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 mt-2">
                    {meeting.duration_minutes != null && meeting.duration_minutes > 0 && (
                      <span className="inline-flex items-center gap-1 text-2xs text-neutral-400">
                        <Clock className="h-3 w-3" />
                        {meeting.duration_minutes} min
                      </span>
                    )}
                    {participants.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-2xs text-neutral-400">
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
                          className="h-7 w-7 rounded-full bg-neutral-100 border-2 border-white flex items-center justify-center"
                          title={email}
                        >
                          <span className="text-[10px] font-medium text-neutral-500">
                            {getInitials(email)}
                          </span>
                        </div>
                      ))}
                      {participants.length > 3 && (
                        <div className="h-7 w-7 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center">
                          <span className="text-[10px] font-medium text-neutral-500">
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
        <p className="text-sm text-neutral-400">No meetings yet</p>
      )}

      {/* Footer link */}
      {meetings.length > maxItems && (
        <div className="mt-4 pt-4 border-t border-neutral-100">
          <Link
            href={`/${projectId}/meetings`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-brand transition-colors"
          >
            View all {meetings.length} meetings
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
