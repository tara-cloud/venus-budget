"use client";
import { useMemo } from "react";
import { Grid, Layout, ConfigProvider, App, theme as antTheme } from "antd";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { useTheme } from "@/components/layout/ThemeContext";

const { Content } = Layout;
const { useBreakpoint } = Grid;

export default function DashboardClientLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { md } = useBreakpoint();
  const { dark } = useTheme();

  const themeConfig = useMemo(() => ({
    algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: { colorPrimary: "#6366f1", borderRadius: 8 },
  }), [dark]);

  const layoutStyle = useMemo(() => ({
    minHeight: "100vh",
    background: dark ? "#0f172a" : "#f8fafc",
    transition: "background 0.3s",
  }), [dark]);

  const contentStyle = useMemo(() => ({
    padding: md ? "24px" : "16px",
    paddingBottom: md ? "24px" : "88px",
    background: dark ? "#0f172a" : "#f8fafc",
    transition: "background 0.3s",
  }), [md, dark]);

  return (
    <ConfigProvider select={{ showSearch: false }} theme={themeConfig}>
      <App>
        <Layout style={layoutStyle}>
          {md && <Sidebar />}
          <Layout style={{ background: "transparent" }}>
            <Content style={contentStyle}>
              {children}
            </Content>
          </Layout>
          {md === false && <BottomNav />}
        </Layout>
      </App>
    </ConfigProvider>
  );
}
