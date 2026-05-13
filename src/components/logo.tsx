import type { SVGProps } from "react";

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 370 40" className={className} {...props}>
      <text
        x="0"
        y="30"
        fontFamily="var(--font-sans)"
        fontWeight="800"
        fontSize="30"
        fill="currentColor"
      >
        WeShare EduTech
      </text>
      <circle cx="300" cy="11" r="4" fill="currentColor" opacity={0.8} />
    </svg>
  );
}