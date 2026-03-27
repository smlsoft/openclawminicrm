"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useScrollHide } from "@/hooks/useScrollHide";

const ScrollHideContext = createContext(false);

export function useScrollHidden() {
  return useContext(ScrollHideContext);
}

export function ScrollHideProvider({ children }: { children: ReactNode }) {
  const hidden = useScrollHide();

  // Set data attribute on html so CSS can target .page-header globally
  useEffect(() => {
    if (hidden) {
      document.documentElement.setAttribute("data-scroll-hide", "true");
    } else {
      document.documentElement.removeAttribute("data-scroll-hide");
    }
  }, [hidden]);

  return (
    <ScrollHideContext.Provider value={hidden}>
      {children}
    </ScrollHideContext.Provider>
  );
}
