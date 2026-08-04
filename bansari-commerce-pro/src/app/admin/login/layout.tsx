// Public layout for /admin/login — no authentication check.
// Next.js resolves this layout for all /admin/login/* segments,
// so they never reach the guarded admin/layout.tsx above.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
