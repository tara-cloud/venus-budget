"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Layout, Menu, Avatar, Button, Typography, Popover, Radio } from "antd";
import {
  DashboardOutlined, TransactionOutlined, WalletOutlined, TagsOutlined,
  LineChartOutlined, ImportOutlined, ReloadOutlined, LogoutOutlined,
  BankOutlined, SettingOutlined, BulbOutlined, DesktopOutlined, SunOutlined, MoonOutlined,
} from "@ant-design/icons";
import { useTheme } from "@/components/layout/ThemeContext";
import type { ThemePreference } from "@/components/layout/ThemeContext";

const { Sider } = Layout;
const { Text } = Typography;

const NAV = [
  { key: "/",             label: "Dashboard",   icon: <DashboardOutlined />   },
  { key: "/transactions", label: "Transactions",icon: <TransactionOutlined /> },
  { key: "/budgets",      label: "Budgets",     icon: <WalletOutlined />      },
  { key: "/forecasting",  label: "Forecasting", icon: <LineChartOutlined />   },
  { key: "/accounts",     label: "Accounts",    icon: <BankOutlined />        },
  { key: "/categories",   label: "Categories",  icon: <TagsOutlined />        },
  { key: "/import",       label: "Import",      icon: <ImportOutlined />      },
  { key: "/recurring",    label: "Recurring",   icon: <ReloadOutlined />      },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: "light",  label: "Light",  icon: <SunOutlined />     },
  { value: "dark",   label: "Dark",   icon: <MoonOutlined />    },
  { value: "system", label: "System", icon: <DesktopOutlined /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { dark, preference, setPreference } = useTheme();

  const activeKey = NAV.find((n) => n.key !== "/" && pathname.startsWith(n.key))?.key ?? "/";

  const settingsContent = (
    <div style={{ minWidth: 180 }}>
      <Text strong style={{ display: "block", marginBottom: 8, fontSize: 12, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Appearance
      </Text>
      <Radio.Group
        value={preference}
        onChange={e => setPreference(e.target.value as ThemePreference)}
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        {THEME_OPTIONS.map(opt => (
          <Radio key={opt.value} value={opt.value} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {opt.icon} {opt.label}
            </span>
          </Radio>
        ))}
      </Radio.Group>
    </div>
  );

  return (
    <Sider
      width={220}
      style={{
        height: "100vh",
        position: "sticky",
        top: 0,
        background: dark ? "#1e293b" : "#ffffff",
        borderRight: `1px solid ${dark ? "#334155" : "#f0f0f0"}`,
        transition: "background 0.3s",
      }}
    >
      <div style={{
        padding: "20px",
        borderBottom: `1px solid ${dark ? "#334155" : "#f0f0f0"}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Text strong style={{ fontSize: 18, color: "#6366f1" }}>Venus</Text>
        <Popover
          content={settingsContent}
          title={null}
          trigger="click"
          placement="rightBottom"
        >
          <Button
            type="text"
            icon={<SettingOutlined />}
            size="small"
            title="Settings"
            style={{ color: dark ? "#94a3b8" : "#6b7280" }}
          />
        </Popover>
      </div>

      <Menu
        mode="inline"
        selectedKeys={[activeKey]}
        theme={dark ? "dark" : "light"}
        style={{
          flex: 1,
          borderRight: "none",
          background: "transparent",
          marginTop: 8,
        }}
        items={NAV.map((n) => ({
          key: n.key,
          icon: n.icon,
          label: <Link href={n.key}>{n.label}</Link>,
        }))}
      />

      <div style={{
        padding: "16px",
        borderTop: `1px solid ${dark ? "#334155" : "#f0f0f0"}`,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <Avatar size="small" style={{ background: "#6366f1", flexShrink: 0 }}>
          {session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase()}
        </Avatar>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ display: "block", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {session?.user?.name ?? "User"}
          </Text>
          <Text type="secondary" style={{ display: "block", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {session?.user?.email}
          </Text>
        </div>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          size="small"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          style={{ color: dark ? "#94a3b8" : "#6b7280" }}
        />
      </div>
    </Sider>
  );
}
