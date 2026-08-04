"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const items = [
  { href: "/about", label: "about" },
  { href: "/software", label: "software" },
  { href: "/hardware", label: "hardware" },
  { href: "/research", label: "research" },
  { href: "/communities", label: "communities" },
];

const SWIPE_MIN_X = 56;
const SWIPE_MAX_SLOPE = 1.6;
const SWIPE_HINT_KEY = "swipe-hint-done";

export default function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showHint, setShowHint] = useState(false);

  const index = items.findIndex((item) => item.href === pathname);
  const prev = index === -1 ? null : items[(index + items.length - 1) % items.length];
  const next = index === -1 ? null : items[(index + 1) % items.length];

  // The hint appears after mount (not during SSR) so hydration stays clean,
  // and only until the visitor has swiped once, ever.
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(SWIPE_HINT_KEY)) setShowHint(true);
    } catch {
      setShowHint(true);
    }
  }, []);

  useEffect(() => {
    if (!prev || !next) return;

    const isSwipeViewport = () =>
      window.matchMedia("(max-width: 900px)").matches;

    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (event) => {
      if (!isSwipeViewport() || event.touches.length !== 1) {
        tracking = false;
        return;
      }
      tracking = true;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    };

    const onTouchEnd = (event) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < SWIPE_MIN_X) return;
      if (Math.abs(dx) < Math.abs(dy) * SWIPE_MAX_SLOPE) return;
      try {
        window.localStorage.setItem(SWIPE_HINT_KEY, "1");
      } catch {}
      setShowHint(false);
      router.push(dx < 0 ? next.href : prev.href);
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [prev, next, router]);

  return (
    <>
      <nav
        className="site-nav site-nav--flow site-nav--full"
        aria-label="Primary"
      >
        {items.map((item, itemIndex) => {
          const isActive = pathname === item.href;
          const isLast = itemIndex === items.length - 1;

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

      {prev && next ? (
        <nav
          className="site-nav site-nav--flow site-nav--swipe"
          aria-label="Primary"
        >
          <div className="swipe-nav__row">
            <Link href={prev.href} className="swipe-nav__side">
              <span className="swipe-nav__chevron" aria-hidden="true">
                ‹
              </span>{" "}
              {prev.label}
            </Link>
            <span className="site-nav__separator" aria-hidden="true">
              /
            </span>
            <span className="swipe-nav__current" aria-current="page">
              {items[index].label}
            </span>
            <span className="site-nav__separator" aria-hidden="true">
              /
            </span>
            <Link href={next.href} className="swipe-nav__side">
              {next.label}{" "}
              <span className="swipe-nav__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </div>
          {showHint ? (
            <p className="swipe-nav__hint">swipe anywhere to flip pages</p>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
