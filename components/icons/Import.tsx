import React from "react";
import type { SVGProps } from "react";

export function Import(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={21}
      height={21}
      viewBox="0 0 21 21"
      {...props}
    >
      <g
        fill="none"
        fillRule="evenodd"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
      >
        <path d="M9.5 3.5h-4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10"></path>
        <path d="m13.5 10.5l-3 3l-3-3"></path>
        <path d="M17.5 3.5h-4a3 3 0 0 0-3 3v7"></path>
      </g>
    </svg>
  );
}
