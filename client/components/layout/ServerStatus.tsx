"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { API_URL } from "@/lib/api";

type State = "checking" | "connected" | "offline";

export default function ServerStatus() {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((res) => setState(res.ok ? "connected" : "offline"))
      .catch(() => setState("offline"));
  }, []);

  return (
    <Card className="flex max-w-sm items-center justify-between">
      <span className="font-medium">Server connection</span>
      {state === "checking" && <Spinner />}
      {state === "connected" && <span className="text-sm font-medium text-emerald-700">Connected</span>}
      {state === "offline" && <span className="text-sm font-medium text-red-700">Offline</span>}
    </Card>
  );
}
