import * as React from "react";
import { cn } from "@/lib/utils";
/** * Code component for displaying inline or block code. * Use inline variant for code within text, block variant for standalone code snippets. * * @example Inline code * <Text> * Use the <Code>npm install</Code> command to install dependencies. * </Text> * * @example Block code * <Code variant="block"> * function hello() {'{'} * * {'}'} * </Code> */ export interface CodeProps {
  /** Display style */ variant?: "inline" | "block";
  /** Programming language for syntax (block only) */ language?: string;
  /** Additional CSS classes */ className?: string;
  /** Code content */ children: React.ReactNode;
}
export function Code({
  variant = "inline",
  language,
  className,
  children,
}: CodeProps) {
  if (variant === "inline") {
    return (
      <code
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem]",
          "font-mono text-sm font-semibold",
          className,
        )}
      >
        {" "}
        {children}{" "}
      </code>
    );
  } // Block variant return ( <pre className={cn( 'overflow-x-auto rounded-lg border border-border', 'bg-muted p-4', 'font-mono text-sm', className )} {...(language && { 'data-language': language })} > <code>{children}</code> </pre> );
}
