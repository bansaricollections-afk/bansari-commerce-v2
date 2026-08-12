import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type DashboardCardProps = {
  title: string;
  value: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export function DashboardCard({
  title,
  value,
  description,
  href,
  icon: Icon,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
          {title}
        </p>
        <Icon className="size-4 text-neutral-400" strokeWidth={1.75} />
      </div>
      <p className="mt-3 font-serif text-3xl text-neutral-900">{value}</p>
      <p className="mt-1.5 text-xs text-neutral-500">{description}</p>
    </Link>
  );
}
