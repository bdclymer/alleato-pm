"use client";

import { PanelSection } from "../misc/panel-section";
import { BookText } from "lucide-react";

interface ConversationContextProps {
  context: {
    passenger_name?: string;
    confirmation_number?: string;
    seat_number?: string;
    flight_number?: string;
    account_number?: string;
  };
}

export function ConversationContext({ context }: ConversationContextProps) {
  const entries = Object.entries(context);
  if (entries.length === 0) return null;

  return (
    <PanelSection
      title="Conversation Context"
      icon={<BookText className="h-3.5 w-3.5" />}
    >
      <div className="space-y-1 px-1">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground capitalize">
              {key.replace(/_/g, " ")}
            </span>
            <span
              className={`text-xs font-medium ${value ? "text-foreground" : "text-muted-foreground italic"}`}
            >
              {value || "—"}
            </span>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}
