"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete();
      }, 400);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-[#111112] ${
        isFadingOut ? "animate-fade-out" : ""
      }`}
      style={{
        animation: isFadingOut ? "fade-out 0.4s ease-out forwards" : undefined,
      }}
    >
      <div className="flex flex-col items-center gap-4 animate-[fade-in_0.5s_ease-in]">
        <div className="text-sm font-light text-zinc-600 dark:text-zinc-100">
          Shadow Realm
        </div>
      </div>
    </div>
  );
}
