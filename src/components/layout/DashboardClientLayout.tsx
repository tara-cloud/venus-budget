"use client";
import { Grid, Layout, ConfigProvider, App, theme as antTheme } from "antd";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { useTheme } from "@/components/layout/ThemeContext";

const { Content } = Layout;
const { useBreakpoint } = Grid;

export default function DashboardClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { md } = useBreakpoint();
  const { dark } = useTheme();

  return (
    <ConfigProvider
      select={{ showSearch: false }}
      theme={{
        algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#6366f1",
          borderRadius: 8,
        },
      }}
    >
      <App>
        <Layout
          style={{
            minHeight: "100vh",
            background: dark ? "#0f172a" : "#f8fafc",
            transition: "background 0.3s",
          }}
        >
          {md && <Sidebar />}
          <Layout style={{ background: "transparent" }}>
            <Content
              style={{
                padding: md ? "24px" : "16px",
                paddingBottom: md ? "24px" : "88px",
                background: dark ? "#0f172a" : "#f8fafc",
                transition: "background 0.3s",
              }}
            >
              {children}
            </Content>
          </Layout>
          {md === false && <BottomNav />}
        </Layout>
      </App>
    </ConfigProvider>
  );
}
