import { Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar.tsx";
import { Header } from "./components/layout/Header.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Sessions from "./pages/Sessions.tsx";
import Projects from "./pages/Projects.tsx";
import { useAutoRefresh } from "./hooks/useAutoRefresh.ts";

export default function App() {
  const { enabled, setEnabled, lastUpdated } = useAutoRefresh();

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          autoRefresh={enabled}
          onAutoRefreshToggle={setEnabled}
          lastUpdated={lastUpdated}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/sessions/:id" element={<Sessions />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
