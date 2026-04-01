"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/about", label: "about" },
  { href: "/experience", label: "experience" },
  { href: "/projects", label: "projects" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
      <nav className="site-nav site-nav--flow" aria-label="Primary">
      {items.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={isActive ? "site-nav__link is-active" : "site-nav__link"}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
