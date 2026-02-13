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
}

const columns: ColumnDef<Session>[] = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const status = getValue<string>();
      return (
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
      );
    },
    size: 90,
  },
  {
    accessorKey: "session_id",
    header: "Session",
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{truncateId(getValue<string>())}</span>
    ),
  },
  {
    accessorKey: "project",
    header: "Project",
    cell: ({ getValue }) => (
      <span className="text-xs">{getValue<string>()}</span>
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
      <span className="text-xs">{formatDuration(getValue<number>())}</span>
    ),
  },
  {
    id: "tokens",
    header: "Tokens",
    accessorFn: (row) => row.tokens_in + row.tokens_out,
    cell: ({ getValue }) => (
      <span className="text-xs">{formatTokens(getValue<number>())}</span>
    ),
  },
  {
    accessorKey: "total_cost",
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

export function SessionList({ sessions, loading, onSelect }: Props) {
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
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">All Sessions</CardTitle>
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
