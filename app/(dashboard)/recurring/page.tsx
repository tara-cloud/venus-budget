"use client";
import { useEffect, useState, useCallback } from "react";
import { Table, Button, Modal, Form, Input, Select, InputNumber, DatePicker, Switch, Tag, Space, Popconfirm, Typography, message } from "antd";
import { PlusOutlined, DeleteOutlined, PlayCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface Account { id: string; name: string }
interface Category { id: string; name: string }
interface Rule { id: string; description: string; amount: number; type: string; frequency: string; active: boolean; account?: Account; category?: Category; startDate: string; lastRunAt?: string }

const RULE_TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export default function RecurringPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [firing, setFiring] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    const [r, a, c] = await Promise.all([
      fetch("/api/recurring").then((x) => x.json()),
      fetch("/api/accounts").then((x) => x.json()),
      fetch("/api/categories").then((x) => x.json()),
    ]);
    setRules(r);
    setAccounts(a);
    setCategories(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function onSave(values: Record<string, unknown>) {
    const payload = { ...values, startDate: (values.startDate as dayjs.Dayjs).toISOString() };
    await fetch("/api/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setModalOpen(false);
    await load();
    message.success("Recurring rule created");
  }

  async function fireAll() {
    setFiring(true);
    const res = await fetch("/api/recurring", { method: "PUT" });
    const data = await res.json();
    setFiring(false);
    await load();
    message.success(`Fired ${data.fired} transactions`);
  }

  const columns = [
    { title: "Description", dataIndex: "description", key: "description" },
    { title: "Account", key: "account", render: (_: unknown, r: Rule) => r.account?.name },
    { title: "Category", key: "category", render: (_: unknown, r: Rule) => r.category ? <Tag>{r.category.name}</Tag> : null },
    { title: "Amount", key: "amount", render: (_: unknown, r: Rule) => <span className={r.type === "income" ? "text-green-600" : "text-red-600"}>₹{Number(r.amount).toLocaleString()}</span> },
    { title: "Frequency", dataIndex: "frequency", key: "frequency", render: (f: string) => <Tag>{f}</Tag> },
    { title: "Last Run", key: "lastRunAt", render: (_: unknown, r: Rule) => r.lastRunAt ? dayjs(r.lastRunAt).format("DD MMM YYYY") : <Text type="secondary">Never</Text> },
    { title: "Active", dataIndex: "active", key: "active", render: (a: boolean) => <Tag color={a ? "green" : "red"}>{a ? "Active" : "Paused"}</Tag> },
    {
      title: "Actions", key: "actions", render: (_: unknown, r: Rule) => (
        <Popconfirm title="Delete rule?" onConfirm={async () => { await fetch(`/api/recurring/${r.id}`, { method: "DELETE" }); await load(); }}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <Title level={4} className="!mb-0">Recurring Rules</Title>
        <Space>
          <Button icon={<PlayCircleOutlined />} loading={firing} onClick={fireAll}>Fire Due Transactions</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>Add Rule</Button>
        </Space>
      </div>
      <Table rowKey="id" columns={columns} dataSource={rules} loading={loading} scroll={{ x: "max-content" }} />
      <Modal title="New Recurring Rule" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="accountId" label="Account" rules={[{ required: true }]}>
            <Select options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={RULE_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} className="w-full" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="categoryId" label="Category">
            <Select allowClear options={categories.map((c) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="frequency" label="Frequency" rules={[{ required: true }]}>
            <Select options={FREQUENCY_OPTIONS} />
          </Form.Item>
          <Form.Item name="dayOfMonth" label="Day of Month (for monthly)">
            <InputNumber min={1} max={28} className="w-full" />
          </Form.Item>
          <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
