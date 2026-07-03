import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

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
    <Card className="bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={href} className="block">
        <CardContent className="flex items-center gap-4">
          <span className="flex size-10 items-center justify-center rounded-md bg-[#8A5A6A]/10 text-[#8A5A6A]">
            <Icon className="size-5" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-slate-950">
              {title}
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              {description}
            </span>
          </span>

          <ArrowRight className="size-4 text-slate-400" />
        </CardContent>
      </Link>
    </Card>
  );
}
