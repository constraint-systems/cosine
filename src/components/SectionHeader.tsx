export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 font-mono py-2 border-faint border-b text-xs uppercase truncate text-muted">
      {children}
    </div>
  );
}
