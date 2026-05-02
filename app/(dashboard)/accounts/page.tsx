"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Space,
  Popconfirm, Typography, message, Tooltip, Segmented, Card, Statistic,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  ArrowUpOutlined, ArrowDownOutlined, UnorderedListOutlined, TagsOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Account {
  id: string; name: string; type: string; tags: string[];
  balance: number; openingBalance: number; totalIncome: number;
  totalExpenses: number; currency: string;
}

const TYPE_OPTIONS = [
  { value: "bank",   label: "Bank" },
  { value: "cash",   label: "Cash" },
  { value: "credit", label: "Credit Card" },
  { value: "stock",  label: "Stock / Investment" },
];

const TYPE_COLOR: Record<string, string> = {
  bank: "blue", cash: "green", credit: "orange", stock: "purple",
};

// Palette cycles for tag colours
const TAG_PALETTE = [
  "magenta","red","volcano","orange","gold",
  "lime","cyan","geekblue","purple","pink",
];
function tagColor(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + (tag.codePointAt(i) ?? 0)) & 0xffff;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

export default function AccountsPage() {
  const [accounts, setAccounts]     = useState<Account[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [editing, setEditing]       = useState<Account | null>(null);
  const [view, setView]             = useState<"list" | "grouped">("list");
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setAccounts(await fetch("/api/accounts").then((r) => r.json()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(a: Account) {
    setEditing(a);
    form.setFieldsValue({ ...a, tags: a.tags ?? [] });
    setModalOpen(true);
  }
  function openAdd() {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  }

  async function onSave(values: Partial<Account>) {
    const payload = { ...values, tags: values.tags ?? [] };
    if (editing) {
      await fetch(`/api/accounts/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setModalOpen(false);
    await load();
    message.success(editing ? "Account updated" : "Account created");
  }

  async function onDelete(id: string) {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    await load();
    message.success("Deleted");
  }

  // Collect all unique tags across accounts
  const allTags = useMemo(() =>
    [...new Set(accounts.flatMap((a) => a.tags ?? []))].sort((a, b) => a.localeCompare(b)),
    [accounts],
  );

  // Group accounts by tag (accounts with no tags go under "Untagged")
  const grouped = useMemo(() => {
    const map: Record<string, Account[]> = {};
    for (const a of accounts) {
      const tags = a.tags?.length ? a.tags : ["Untagged"];
      for (const tag of tags) {
        if (!map[tag]) map[tag] = [];
        map[tag].push(a);
      }
    }
    // Sort: named tags first, "Untagged" last
    return Object.entries(map).sort(([a], [b]) => {
      if (a === "Untagged") return 1;
      if (b === "Untagged") return -1;
      return a.localeCompare(b);
    });
  }, [accounts]);

  const balanceCell = (b: number, r: Account) => {
    let balanceColor = "#16a34a";
    if (b < 0) balanceColor = "#dc2626";
    else if (b === 0) balanceColor = "#9ca3af";
    return (
    <Tooltip title={
      <div style={{ fontSize: 12, lineHeight: "1.8" }}>
        <div>Opening: {r.currency} {(r.openingBalance ?? 0).toLocaleString()}</div>
        <div style={{ color: "#86efac" }}>+ Income: {r.currency} {(r.totalIncome ?? 0).toLocaleString()}</div>
        <div style={{ color: "#fca5a5" }}>- Expenses: {r.currency} {(r.totalExpenses ?? 0).toLocaleString()}</div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", marginTop: 4, paddingTop: 4, fontWeight: 700 }}>
          = {r.currency} {Number(b).toLocaleString()}
        </div>
      </div>
    }>
      <span style={{
        fontWeight: 700,
        color: balanceColor,
        cursor: "help",
        borderBottom: "1px dashed currentColor",
      }}>
        {r.currency} {Number(b).toLocaleString()}
      </span>
    </Tooltip>
  );};

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Type", dataIndex: "type", key: "type",
      render: (t: string) => <Tag color={TYPE_COLOR[t] ?? "default"}>{t}</Tag>,
    },
    {
      title: "Tags", dataIndex: "tags", key: "tags",
      render: (tags: string[]) =>
        tags?.length
          ? tags.map((t) => <Tag key={t} color={tagColor(t)}>{t}</Tag>)
          : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: "Balance",
      dataIndex: "balance",
      key: "balance",
      sorter: (a: Account, b: Account) => a.balance - b.balance,
      render: balanceCell,
    },
    {
      title: "Income / Expenses", key: "txSummary",
      render: (_: unknown, r: Account) => (
        <div style={{ fontSize: 12 }}>
          <div style={{ color: "#16a34a" }}><ArrowUpOutlined /> {r.currency} {(r.totalIncome ?? 0).toLocaleString()}</div>
          <div style={{ color: "#dc2626" }}><ArrowDownOutlined /> {r.currency} {(r.totalExpenses ?? 0).toLocaleString()}</div>
        </div>
      ),
    },
    {
      title: "Actions", key: "actions",
      render: (_: unknown, r: Account) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete account?" onConfirm={() => onDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <Title level={4} className="!mb-0">Accounts</Title>
        <Space wrap>
          <Segmented
            value={view}
            onChange={(v) => setView(v as "list" | "grouped")}
            options={[
              { value: "list",    label: "List",    icon: <UnorderedListOutlined /> },
              { value: "grouped", label: "By Tag",  icon: <TagsOutlined /> },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Account</Button>
        </Space>
      </div>

      {view === "list" ? (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={accounts}
          loading={loading}
          scroll={{ x: "max-content" }}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([tag, accs]) => {
            const total   = accs.reduce((s, a) => s + a.balance, 0);
            const income  = accs.reduce((s, a) => s + (a.totalIncome ?? 0), 0);
            const expense = accs.reduce((s, a) => s + (a.totalExpenses ?? 0), 0);
            return (
              <Card
                key={tag}
                size="small"
                title={
                  <Space>
                    <Tag color={tag === "Untagged" ? "default" : tagColor(tag)} style={{ margin: 0 }}>
                      {tag}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>{accs.length} account{accs.length === 1 ? "" : "s"}</Text>
                  </Space>
                }
                extra={
                  <Space size="large">
                    <Statistic
                      title="Total Balance"
                      value={total}
                      precision={2}
                      prefix="₹"
                      styles={{ content: { fontSize: 14, color: total < 0 ? "#dc2626" : "#16a34a" } }}
                    />
                    <Statistic
                      title="Income"
                      value={income}
                      precision={2}
                      prefix="₹"
                      styles={{ content: { fontSize: 14, color: "#16a34a" } }}
                    />
                    <Statistic
                      title="Expenses"
                      value={expense}
                      precision={2}
                      prefix="₹"
                      styles={{ content: { fontSize: 14, color: "#dc2626" } }}
                    />
                  </Space>
                }
              >
                <Table
                  rowKey="id"
                  size="small"
                  columns={columns}
                  dataSource={accs}
                  pagination={false}
                  scroll={{ x: "max-content" }}
                />
              </Card>
            );
          })}
          {grouped.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>
              No accounts yet. Add one to get started.
            </div>
          )}
        </div>
      )}

      <Modal
        title={editing ? "Edit Account" : "Add Account"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="name" label="Account Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="tags" label="Tags">
            <Select
              mode="tags"
              placeholder="Add tags (e.g. personal, savings, business)"
              options={allTags.map((t) => ({ value: t, label: t }))}
            />
          </Form.Item>
          <Form.Item name="balance" label="Current Balance (₹)">
            <InputNumber precision={2} className="w-full" />
          </Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="INR">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
