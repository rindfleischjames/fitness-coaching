import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="app-body">{children}</main>
      <BottomNav />
    </div>
  );
}
