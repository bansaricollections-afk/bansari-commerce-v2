import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type DashboardCardProps = {
  title: string;
  value: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: string;
};

export function DashboardCard({
  title,
  value,
  description,
  href,
  icon: Icon,
  tone,
}: DashboardCardProps) {
  return (
    <Card className="bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="block">
        <CardHeader>
          <CardTitle className="text-sm text-slate-600">{title}</CardTitle>
          <CardAction>
            <span className={`flex size-9 items-center justify-center rounded-md ${tone}`}>
              <Icon className="size-4" />
            </span>
          </CardAction>
        </CardHeader>

        <CardContent>
          <p className="text-3xl font-bold text-slate-950">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </CardContent>
      </Link>
    </Card>
  );
}
