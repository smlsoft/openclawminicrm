"use client";

import { useState, useEffect, useRef } from "react";

/**
 * เลื่อนขึ้น → ซ่อน header + bottom nav (full screen)
 * เลื่อนลง → แสดง header + bottom nav
 * Desktop → ไม่ซ่อน
 */
export function useScrollHide() {
  const [hidden, setHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // Only on mobile
    const mq = window.matchMedia("(max-width: 767px)");
    if (!mq.matches) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;

        // เลื่อนขึ้น > 10px → ซ่อน | เลื่อนลง > 10px → แสดง | อยู่บนสุด → แสดง
        if (currentY < 50) {
          setHidden(false);
        } else if (delta > 10) {
          setHidden(true);
        } else if (delta < -10) {
          setHidden(false);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return hidden;
}
