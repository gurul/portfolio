"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/about", label: "about" },
  { href: "/projects", label: "projects" },
];

export default function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="site-nav site-nav--flow" aria-label="Primary">
      {items.map((item, index) => {
        const isActive = pathname === item.href;
        const isLast = index === items.length - 1;

        return (
          <span key={item.href} className="site-nav__item">
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "site-nav__link is-active" : "site-nav__link"}
            >
              {item.label}
            </Link>
            {!isLast ? (
              <span className="site-nav__separator" aria-hidden="true">
                /
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
