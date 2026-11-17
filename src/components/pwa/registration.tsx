"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (location.pathname.startsWith("/student-demo") && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/student-demo" });
    }
  }, []);

  return null;
}
