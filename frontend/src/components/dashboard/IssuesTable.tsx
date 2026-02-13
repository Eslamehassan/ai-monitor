import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import type { ToolCall } from "@/lib/api.ts";
import { relativeTime, truncateId } from "@/lib/utils.ts";

interface Props {
  data: ToolCall[];
}

export function IssuesTable({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No recent errors
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Tool</TableHead>
                  <TableHead className="text-xs">Session</TableHead>
                  <TableHead className="text-xs">Error</TableHead>
                  <TableHead className="text-xs text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 20).map((tc) => (
                  <TableRow key={tc.id}>
                    <TableCell className="text-xs font-mono">
                      {tc.tool_name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {truncateId(tc.session_id)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">
                      <Badge variant="destructive" className="text-[10px]">
                        {tc.error_message ?? "Unknown error"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">
                      {relativeTime(tc.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
