import { Sidebar } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex-1 min-w-0 sm:pl-56 pb-24 sm:pb-0">
        {children}
      </div>
    </div>
  );
}
