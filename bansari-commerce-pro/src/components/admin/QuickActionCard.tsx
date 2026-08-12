import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

type QuickActionCardProps = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50/60"
    >
      <span className="flex size-9 flex-shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-500">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-neutral-900">
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-neutral-500">
          {description}
        </span>
      </span>

      <ArrowRight className="size-4 flex-shrink-0 text-neutral-300 transition-colors group-hover:text-neutral-500" />
    </Link>
  );
}
