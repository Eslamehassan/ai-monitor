import { useState } from "react";
import { useParams } from "react-router-dom";
import { SessionList } from "@/components/sessions/SessionList.tsx";
import { SessionDetail } from "@/components/sessions/SessionDetail.tsx";
import { usePollingData } from "@/hooks/useAutoRefresh.ts";
import { fetchSessions, fetchSession } from "@/lib/api.ts";
import type { PaginatedResponse, Session, SessionDetail as SessionDetailType } from "@/lib/api.ts";

export default function Sessions() {
  const { id } = useParams<{ id: string }>();
  const [selectedId, setSelectedId] = useState<string | null>(id ?? null);
  const [search, setSearch] = useState("");

  const { data: sessionsRes, loading } = usePollingData<PaginatedResponse<Session>>(
    () => fetchSessions({ search: search || undefined }),
    [search]
  );

  const sessions = sessionsRes?.items ?? [];

  const { data: detail } = usePollingData<SessionDetailType>(
    () => (selectedId ? fetchSession(selectedId) : Promise.resolve(null as unknown as SessionDetailType)),
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
      sessions={sessions}
      loading={loading}
      onSelect={(s) => setSelectedId(s.session_id)}
      search={search}
      onSearch={setSearch}
    />
  );
}
