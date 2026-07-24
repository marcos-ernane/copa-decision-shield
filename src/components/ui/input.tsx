import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-xl border border-op-gray/30 bg-surface-1 px-3 py-1 text-base text-[color:var(--color-text-primary)] shadow-sm transition-colors caret-[color:var(--color-text-primary)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[color:var(--color-text-primary)] placeholder:text-surface-3 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
