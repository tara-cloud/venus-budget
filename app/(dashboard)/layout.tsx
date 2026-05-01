import DashboardClientLayout from "@/components/layout/DashboardClientLayout";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
