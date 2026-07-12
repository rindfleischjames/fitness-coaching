import Sidebar from "@/components/Sidebar";

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="coach-shell">
      <Sidebar />
      <main className="coach-main">{children}</main>
    </div>
  );
}
