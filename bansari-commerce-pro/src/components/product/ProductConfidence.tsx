import {
  ShieldCheck,
  Truck,
  RotateCcw,
  BadgeCheck,
} from "lucide-react";

export default function ProductConfidence() {
  const items = [
    {
      icon: Truck,
      title: "Fast Delivery",
      text: "Dispatched within 24–48 hours.",
    },
    {
      icon: RotateCcw,
      title: "Easy Returns",
      text: "Simple return process where applicable.",
    },
    {
      icon: ShieldCheck,
      title: "Secure Payments",
      text: "100% secure checkout experience.",
    },
    {
      icon: BadgeCheck,
      title: "Quality Checked",
      text: "Each garment is inspected before dispatch.",
    },
  ];

  return (
    <div className="rounded-3xl border border-[#ECE7E2] bg-[#FFFDF9] p-6">
      <div className="space-y-5">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.title}
              className="flex items-start gap-4"
            >
              <div className="rounded-full bg-[#F6F0EB] p-3">
                <Icon
                  size={22}
                  className="text-[#8A5A6A]"
                />
              </div>

              <div>
                <h4 className="font-semibold">
                  {item.title}
                </h4>

                <p className="text-sm text-gray-600">
                  {item.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}