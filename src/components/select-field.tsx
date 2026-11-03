import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * A native select with our own chevron: the browser's arrow ignores padding and sits against the
 * border. Same approach as the search bars (club-search, free-court-search).
 */
export function SelectField({ className = "", ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select {...props} className={`${className} cursor-pointer appearance-none pr-10!`} />
      <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
