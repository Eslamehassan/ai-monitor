import { useState } from "react";
import { useParams } from "react-router-dom";
import { SessionList } from "@/components/sessions/SessionList.tsx";
import { SessionDetail } from "@/components/sessions/SessionDetail.tsx";
import { usePollingData } from "@/hooks/useAutoRefresh.ts";
import { fetchSessions, fetchSession } from "@/lib/api.ts";
import type { Session } from "@/lib/api.ts";

export default function Sessions() {
  const { id } = useParams<{ id: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);

  const { data: sessions, loading } = usePollingData<Session[]>(
    fetchSessions,
    []
  );

  const { data: detail } = usePollingData<Session>(
    () => (selectedId ? fetchSession(selectedId) : Promise.resolve(null as unknown as Session)),
    [selectedId]
  );

  if (selectedId && detail) {
    return (
      <SessionDetail
        session={detail}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <SessionList
      sessions={sessions ?? []}
      loading={loading}
      onSelect={(s) => setSelectedId(s.session_id)}
    />
  );
}
