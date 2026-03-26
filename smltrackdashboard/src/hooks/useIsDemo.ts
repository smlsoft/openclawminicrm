"use client";

import { useSession } from "next-auth/react";

export function useIsDemo() {
  const { data: session } = useSession();
  return session?.user?.email === "demo@smlsoft.com";
}
