import { SectionHeader } from "./SectionHeader";

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="">
      <SectionHeader>{title}</SectionHeader>
      {children}
    </div>
  );
}
