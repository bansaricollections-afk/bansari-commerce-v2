type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export default function SectionTitle({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: SectionTitleProps) {
  return (
    <div
      className={`mb-16 ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      {eyebrow && (
        <p className="mb-3 uppercase tracking-[6px] text-sm text-[#8A5A6A] font-medium">
          {eyebrow}
        </p>
      )}

      <h2 className="text-4xl md:text-5xl font-bold text-[#1D1D1D]">
        {title}
      </h2>

      {subtitle && (
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          {subtitle}
        </p>
      )}
    </div>
  );
}