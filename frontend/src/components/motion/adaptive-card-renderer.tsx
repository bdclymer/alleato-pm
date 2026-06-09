"use client";

import { useEffect, useRef, useState } from "react";
import * as AdaptiveCards from "adaptivecards";
import "adaptivecards/dist/adaptivecards.css";

interface AdaptiveCardRendererProps {
  card: object;
  className?: string;
}

// Teams-aligned host config — matches Teams light theme typography, spacing, and color palette
const TEAMS_HOST_CONFIG = new AdaptiveCards.HostConfig({
  fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif",
  fontSizes: {
    small: 12,
    default: 14,
    medium: 14,
    large: 18,
    extraLarge: 24,
  },
  fontWeights: {
    lighter: 200,
    default: 400,
    bolder: 600,
  },
  lineHeights: {
    small: 16,
    default: 20,
    medium: 20,
    large: 24,
    extraLarge: 32,
  },
  containerStyles: {
    default: {
      backgroundColor: "#ffffff",
      foregroundColors: {
        default: { default: "#242424", subtle: "#616161" },
        dark: { default: "#000000", subtle: "#333333" },
        light: { default: "#ffffff", subtle: "#f5f5f5" },
        accent: { default: "#6264a7", subtle: "#7b83eb" },
        good: { default: "#107c10", subtle: "#54b054" },
        warning: { default: "#f7630c", subtle: "#f98845" },
        attention: { default: "#c50f1f", subtle: "#e37d80" },
      },
    },
    emphasis: {
      backgroundColor: "#f5f5f5",
      foregroundColors: {
        default: { default: "#242424", subtle: "#616161" },
        dark: { default: "#000000", subtle: "#333333" },
        light: { default: "#ffffff", subtle: "#f5f5f5" },
        accent: { default: "#6264a7", subtle: "#7b83eb" },
        good: { default: "#107c10", subtle: "#54b054" },
        warning: { default: "#f7630c", subtle: "#f98845" },
        attention: { default: "#c50f1f", subtle: "#e37d80" },
      },
    },
  },
  imageSizes: { small: 40, medium: 80, large: 160 },
  actions: {
    maxActions: 6,
    spacing: "default",
    buttonSpacing: 8,
    showCard: { actionMode: "inline", inlineTopMargin: 8 },
    actionsOrientation: "horizontal",
    actionAlignment: "left",
  },
  adaptiveCard: { allowCustomStyle: false },
  imageSet: { imageSize: "medium", maxImageHeight: 100 },
  factSet: {
    title: { size: "default", color: "default", isSubtle: false, weight: "bolder", wrap: true },
    value: { size: "default", color: "default", isSubtle: false, weight: "default", wrap: true },
    spacing: 8,
  },
  spacing: {
    small: 4,
    default: 8,
    medium: 12,
    large: 20,
    extraLarge: 28,
    padding: 16,
  },
  separator: { lineThickness: 1, lineColor: "#e0e0e0" },
  supportsInteractivity: true,
});

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
      const adaptiveCard: AdaptiveCardWithParseError =
        new AdaptiveCards.AdaptiveCard();

      adaptiveCard.hostConfig = TEAMS_HOST_CONFIG;
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
      style={{
        fontFamily:
          "Segoe UI, system-ui, -apple-system, sans-serif",
        fontSize: "14px",
        lineHeight: "20px",
      }}
    />
  );
}
