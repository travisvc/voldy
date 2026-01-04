"use client";

import { useState, useEffect } from "react";
import LoadingScreen from "../../components/LoadingScreen";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/proxy?endpoint=");
      const data = await res.json();
      setApiMessage(data);
    })();
  }, []);

  if (loading) {
    return (
      <LoadingScreen
        onComplete={() => {
          setLoading(false);
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ animation: "fade-in 0.4s ease-in" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 mb-6">
          <span className="text-2xl font-bold text-white">Synth</span>
        </div>
        {apiMessage && <p className="text-white/70">API says: {apiMessage}</p>}
      </div>
    </div>
  );
}
