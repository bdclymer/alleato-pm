"use client";

import { useEffect, useRef, useState } from "react";
import * as AdaptiveCards from "adaptivecards";

interface AdaptiveCardRendererProps {
  card: object;
  className?: string;
}

type AdaptiveCardWithParseError = AdaptiveCards.AdaptiveCard & {
  onParseError?: () => void;
};

export function AdaptiveCardRenderer({
  card,
  className,
}: AdaptiveCardRendererProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    try {
      const adaptiveCard: AdaptiveCardWithParseError = new AdaptiveCards.AdaptiveCard();

      // Suppress validation warnings for unsupported Teams-specific elements
      adaptiveCard.onParseError = () => {};

      adaptiveCard.parse(card);
      const rendered = adaptiveCard.render();

      if (rendered) {
        ref.current.innerHTML = "";
        ref.current.appendChild(rendered);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to render card");
    }
  }, [card]);

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-muted p-4 text-sm text-muted-foreground">
        Preview unavailable
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ fontFamily: "inherit" }}
    />
  );
}
