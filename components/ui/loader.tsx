"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const loaderVariants = cva("inline-block", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
    },
    variant: {
      default: "text-foreground",
      primary: "text-primary",
      secondary: "text-secondary-foreground",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
  },
});

export interface LoaderProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof loaderVariants> {}

const Loader = React.forwardRef<SVGSVGElement, LoaderProps>(
  ({ className, size, variant, ...props }, ref) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    return (
      <svg
        ref={ref}
        className={cn(
          loaderVariants({ size, variant }),
          isMounted && "animate-spin",
          className,
        )}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 16 16"
        role="status"
        aria-label="Loading"
        suppressHydrationWarning
        {...props}
      >
        <g clipPath="url(#clip0_2393_1490)">
          <path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
          <path
            opacity="0.5"
            d="M8 16V12"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.9"
            d="M3.29773 1.52783L5.64887 4.7639"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.1"
            d="M12.7023 1.52783L10.3511 4.7639"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.4"
            d="M12.7023 14.472L10.3511 11.236"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.6"
            d="M3.29773 14.472L5.64887 11.236"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.2"
            d="M15.6085 5.52783L11.8043 6.7639"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.7"
            d="M0.391602 10.472L4.19583 9.23598"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.3"
            d="M15.6085 10.4722L11.8043 9.2361"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            opacity="0.8"
            d="M0.391602 5.52783L4.19583 6.7639"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>
        <defs>
          <clipPath id="clip0_2393_1490">
            <rect width="16" height="16" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  },
);

Loader.displayName = "Loader";

export { Loader, loaderVariants };
