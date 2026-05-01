"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Drawer, Avatar, Button, Typography, Radio, Divider } from "antd";
import { useState } from "react";
import {
  DashboardOutlined, TransactionOutlined, WalletOutlined, ImportOutlined,
  AppstoreOutlined, LineChartOutlined, BankOutlined, TagsOutlined,
  ReloadOutlined, LogoutOutlined, SunOutlined, MoonOutlined, DesktopOutlined,
} from "@ant-design/icons";
import { useTheme } from "@/components/layout/ThemeContext";
import type { ThemePreference } from "@/components/layout/ThemeContext";

const { Text } = Typography;

const BOTTOM_NAV = [
  { key: "/",             label: "Dashboard",   icon: DashboardOutlined   },
  { key: "/transactions", label: "Transactions",icon: TransactionOutlined },
  { key: "/budgets",      label: "Budgets",     icon: WalletOutlined      },
  { key: "/import",       label: "Import",      icon: ImportOutlined      },
];

const DRAWER_NAV = [
  { key: "/forecasting", label: "Forecasting", icon: LineChartOutlined },
  { key: "/accounts",    label: "Accounts",    icon: BankOutlined       },
  { key: "/categories",  label: "Categories",  icon: TagsOutlined       },
  { key: "/recurring",   label: "Recurring",   icon: ReloadOutlined     },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: "light",  label: "Light",  icon: <SunOutlined />     },
  { value: "dark",   label: "Dark",   icon: <MoonOutlined />    },
  { value: "system", label: "System", icon: <DesktopOutlined /> },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { dark, preference, setPreference } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeKey = BOTTOM_NAV.find((n) => n.key !== "/" && pathname.startsWith(n.key))?.key
    ?? DRAWER_NAV.find((n) => pathname.startsWith(n.key))?.key
    ?? "/";

  const isActive = (key: string) => activeKey === key;
  const isMoreActive = DRAWER_NAV.some((n) => activeKey === n.key);

  const navBg    = dark ? "#1e293b" : "#ffffff";
  const navBorder= dark ? "#334155" : "#e5e7eb";
  const textColor= dark ? "#94a3b8" : "#6b7280";

  return (
    <>
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: navBg, borderTop: `1px solid ${navBorder}`,
        boxShadow: "0 -2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
        transition: "background 0.3s",
      }}>
        {BOTTOM_NAV.map(({ key, label, icon: Icon }) => (
          <Link key={key} href={key} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "8px 0", gap: 2,
            fontSize: 11, fontWeight: 500, textDecoration: "none",
            color: isActive(key) ? "#6366f1" : textColor,
            transition: "color 0.15s",
          }}>
            <Icon style={{ fontSize: 22 }} />
            <span>{label}</span>
          </Link>
        ))}
        <button onClick={() => setDrawerOpen(true)} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "8px 0", gap: 2,
          fontSize: 11, fontWeight: 500, border: "none",
          background: "transparent", cursor: "pointer",
          color: isMoreActive ? "#6366f1" : textColor,
          transition: "color 0.15s",
        }}>
          <AppstoreOutlined style={{ fontSize: 22 }} />
          <span>More</span>
        </button>
      </nav>

      <Drawer
        title="Menu"
        placement="bottom"
        height="auto"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: "8px 0 env(safe-area-inset-bottom)" } }}
      >
        {/* Navigation links */}
        {DRAWER_NAV.map(({ key, label, icon: Icon }) => (
          <Link key={key} href={key} onClick={() => setDrawerOpen(false)} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 20px", fontSize: 14, fontWeight: 500,
            textDecoration: "none",
            color: activeKey === key ? "#6366f1" : undefined,
            background: activeKey === key ? (dark ? "#312e81" : "#eef2ff") : "transparent",
            transition: "background 0.15s",
          }}>
            <Icon style={{ fontSize: 18 }} />
            <span>{label}</span>
          </Link>
        ))}

        <Divider style={{ margin: "8px 0" }} />

        {/* Theme selector */}
        <div style={{ padding: "4px 20px 12px" }}>
          <Text strong style={{ display: "block", marginBottom: 10, fontSize: 12, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Appearance
          </Text>
          <div style={{ display: "flex", gap: 8 }}>
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPreference(opt.value)}
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, padding: "10px 8px", borderRadius: 10,
                  border: `2px solid ${preference === opt.value ? "#6366f1" : (dark ? "#334155" : "#e5e7eb")}`,
                  background: preference === opt.value ? (dark ? "#312e81" : "#eef2ff") : "transparent",
                  color: preference === opt.value ? "#6366f1" : undefined,
                  cursor: "pointer", fontSize: 11, fontWeight: 500,
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Divider style={{ margin: "0 0 4px" }} />

        {/* User info + sign out */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px" }}>
          <Avatar size="small" style={{ background: "#6366f1", flexShrink: 0 }}>
            {session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase()}
          </Avatar>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session?.user?.name ?? "User"}
            </Text>
            <Text type="secondary" style={{ display: "block", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session?.user?.email}
            </Text>
          </div>
          <Button
            icon={<LogoutOutlined />}
            size="small"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </Button>
        </div>
      </Drawer>
    </>
  );
}
