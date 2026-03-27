"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDown } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";

interface ScrollButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const ScrollButton = forwardRef<HTMLButtonElement, ScrollButtonProps>(
  ({ className, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
      const handleScroll = () => {
        const scrollContainer = document.querySelector(
          "[data-scroll-container]",
        );
        if (scrollContainer) {
          const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
          setIsVisible(scrollTop + clientHeight < scrollHeight - 100);
        }
      };

      const scrollContainer = document.querySelector("[data-scroll-container]");
      scrollContainer?.addEventListener("scroll", handleScroll);
      handleScroll();

      return () => scrollContainer?.removeEventListener("scroll", handleScroll);
    }, []);

    const scrollToBottom = () => {
      const scrollContainer = document.querySelector("[data-scroll-container]");
      scrollContainer?.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    };

    if (!isVisible) return null;

    return (
      <Button
        ref={ref}
        variant="outline"
        size="icon"
        className={cn("rounded-full", className)}
        onClick={scrollToBottom}
        {...props}
      >
        <ArrowDown />
      </Button>
    );
  },
);
ScrollButton.displayName = "ScrollButton";
