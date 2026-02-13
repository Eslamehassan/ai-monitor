import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Search } from "lucide-react";
import type { Session } from "@/lib/api.ts";
import {
  formatDuration,
  formatTokens,
  formatCost,
  relativeTime,
  truncateId,
} from "@/lib/utils.ts";

interface Props {
  sessions: Session[];
  loading: boolean;
  onSelect: (session: Session) => void;
  search?: string;
  onSearch?: (query: string) => void;
}

const columns: ColumnDef<Session>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<string>();
      return (
        <div className="flex items-center gap-1.5">
          {status === "active" && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          <Badge
            variant={
              status === "active"
                ? "default"
                : status === "error"
                  ? "destructive"
                  : "secondary"
            }
            className="text-[10px]"
          >
            {status}
          </Badge>
        </div>
      );
    },
    size: 100,
  },
  {
    accessorKey: "session_id",
    header: "Session",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{truncateId(getValue<string>())}</span>
    ),
  },
  {
    accessorKey: "project_name",
    header: "Project",
    cell: ({ getValue }) => (
      <span className="text-xs">{getValue<string>() ?? "-"}</span>
    ),
  },
  {
    accessorKey: "model",
    header: "Model",
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "duration_seconds",
    header: "Duration",
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">
        {formatDuration(getValue<number | null>())}
      </span>
    ),
  },
  {
    accessorKey: "tool_call_count",
    header: "Tools",
    cell: ({ getValue }) => {
      const count = getValue<number>();
      return (
        <Badge variant="outline" className="text-[10px] font-mono">
          {count}
        </Badge>
      );
    },
    size: 70,
  },
  {
    id: "tokens",
    header: "Tokens",
    accessorFn: (row) => row.input_tokens + row.output_tokens,
    cell: ({ getValue }) => (
      <span className="text-xs">{formatTokens(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "estimated_cost",
    header: "Cost",
    cell: ({ getValue }) => (
      <span className="text-xs font-medium">{formatCost(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "started_at",
    header: "Started",
    cell: ({ getValue }) => (
      <span className="text-xs text-muted-foreground">
        {relativeTime(getValue<string>())}
      </span>
    ),
  },
];

export function SessionList({ sessions, loading, onSelect, search, onSearch }: Props) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "started_at", desc: true },
  ]);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return sessions;
    return sessions.filter((s) => s.status === statusFilter);
  }, [sessions, statusFilter]);

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-sm font-medium">All Sessions</CardTitle>
        <div className="flex items-center gap-2">
          {onSearch && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={search ?? ""}
                onChange={(e) => onSearch(e.target.value)}
                className="h-8 w-[180px] rounded-md border border-input bg-transparent pl-8 pr-3 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading sessions...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No sessions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="cursor-pointer select-none text-xs"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{ asc: " ↑", desc: " ↓" }[
                          header.column.getIsSorted() as string
                        ] ?? ""}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onSelect(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
