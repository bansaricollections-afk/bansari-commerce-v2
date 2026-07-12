import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function OrderFailedPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
        <AlertCircle
          size={90}
          className="text-red-500"
        />

        <h1 className="mt-8 font-[family:var(--font-playfair)] text-5xl font-bold">
          Payment Failed
        </h1>

        <p className="mt-6 text-lg text-gray-600">
          Your payment could not be completed.
          No amount has been charged successfully.
          Please try again.
        </p>

        <Link
          href="/checkout"
          className="mt-12 rounded-full bg-[#8A5A6A] px-10 py-4 font-semibold text-white transition hover:bg-[#734757]"
        >
          Try Again
        </Link>
      </div>
    </main>
  );
}
