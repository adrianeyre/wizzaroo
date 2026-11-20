import type { ReactNode } from "react";

interface NewTabLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export const NewTabLink = ({ href, className, children }: NewTabLinkProps) => (
  <a
    href={href}
    className={className}
    target="_blank"
    rel="noopener noreferrer"
  >
    {children}
    <span className="visually-hidden">, opens in a new tab</span>
  </a>
);
