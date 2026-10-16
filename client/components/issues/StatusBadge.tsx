import Badge from "@/components/ui/Badge";
import { STATUS_META } from "@/lib/constants";
import type { IssueStatus } from "@/lib/types";

export default function StatusBadge({ status }: { status: IssueStatus }) {
  const meta = STATUS_META[status];
  return <Badge className={meta.badge}>{meta.label}</Badge>;
}
