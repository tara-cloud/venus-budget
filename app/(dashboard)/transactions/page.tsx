"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Tag, Typography, Space, Popconfirm, message } from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined, FolderOutlined, TagsOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;

interface Account { id: string; name: string }
interface Category { id: string; name: string; color: string; type: string; group?: string | null; icon?: string }
interface Transaction {
  id: string; amount: number; type: string; description: string; date: string;
  source: string; account?: Account; category?: Category; notes?: string;
}

const TYPE_OPTIONS = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form] = Form.useForm();
  const selectedType = Form.useWatch("type", form);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, a, c] = await Promise.all([
      fetch("/api/transactions").then((r) => r.json()),
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setTransactions(t.items ?? []);
    setAccounts(a);
    setCategories(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Category options grouped by group, filtered by selected transaction type
  const categoryOptions = useMemo(() => {
    // Filter categories by type if a type is selected (income/expense)
    // Transfer type shows all categories
    const filtered = selectedType && selectedType !== "transfer"
      ? categories.filter((c) => c.type === selectedType)
      : categories;
    const byGroup: Record<string, Category[]> = {};
    const noGroup: Category[] = [];
    filtered.forEach((c) => {
      if (c.group) { byGroup[c.group] = byGroup[c.group] ?? []; byGroup[c.group].push(c); }
      else noGroup.push(c);
    });
    const opts: { label: React.ReactNode; options: { value: string; label: React.ReactNode }[] }[] = [];
    Object.keys(byGroup).sort().forEach((g) => {
      opts.push({
        label: <span><FolderOutlined style={{marginRight:4,color:"#6366f1"}} />{g}</span>,
        options: byGroup[g].map((c) => ({
          value: c.id,
          label: <span><span style={{marginRight:5}}>{c.icon}</span>{c.name}</span>,
        })),
      });
    });
    if (noGroup.length > 0) {
      opts.push({
        label: <span><TagsOutlined style={{marginRight:4,color:"#9ca3af"}} />Ungrouped</span>,
        options: noGroup.map((c) => ({
          value: c.id,
          label: <span><span style={{marginRight:5}}>{c.icon}</span>{c.name}</span>,
        })),
      });
    }
    return opts;
  }, [categories, selectedType]);

  function openAdd() { setEditing(null); form.resetFields(); setModalOpen(true); }

  function handleTypeChange() {
    // Clear category when type changes — old category may not match new type
    form.setFieldValue("categoryId", undefined);
  }
  function openEdit(t: Transaction) {
    setEditing(t);
    form.setFieldsValue({ ...t, date: dayjs(t.date) });
    setModalOpen(true);
  }

  async function onSave(values: Record<string, unknown>) {
    const payload = { ...values, date: (values.date as dayjs.Dayjs).toISOString() };
    if (editing) {
      await fetch(`/api/transactions/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setModalOpen(false);
    await load();
    message.success(editing ? "Transaction updated" : "Transaction added");
  }

  async function onDelete(id: string) {
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    await load();
    message.success("Deleted");
  }

  const columns = [
    { title: "Date", dataIndex: "date", key: "date", render: (d: string) => dayjs(d).format("DD MMM YYYY"), sorter: (a: Transaction, b: Transaction) => new Date(a.date).getTime() - new Date(b.date).getTime() },
    { title: "Description", dataIndex: "description", key: "description" },
    { title: "Category", key: "category", render: (_: unknown, r: Transaction) => r.category ? <Tag color={r.category.color}>{r.category.name}</Tag> : <Tag>Uncategorised</Tag> },
    { title: "Account", key: "account", render: (_: unknown, r: Transaction) => r.account?.name },
    { title: "Type", dataIndex: "type", key: "type", render: (t: string) => <Tag color={t === "income" ? "green" : "red"}>{t}</Tag> },
    { title: "Amount", dataIndex: "amount", key: "amount", render: (a: number, r: Transaction) => <span className={r.type === "income" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>₹{Number(a).toLocaleString()}</span>, sorter: (a: Transaction, b: Transaction) => a.amount - b.amount },
    { title: "Source", dataIndex: "source", key: "source", render: (s: string) => <Tag>{s}</Tag> },
    {
      title: "Actions", key: "actions", render: (_: unknown, r: Transaction) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete this transaction?" onConfirm={() => onDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Title level={4} className="!mb-0">Transactions</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Transaction</Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={transactions} loading={loading} pagination={{ pageSize: 20 }} scroll={{ x: "max-content" }} />

      <Modal
        title={editing ? "Edit Transaction" : "Add Transaction"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="accountId" label="Account" rules={[{ required: true }]}>
            <Select placeholder="Select account" options={accounts.map((a) => ({ value: a.id, label: a.name }))} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} onChange={handleTypeChange} />
          </Form.Item>
          <Form.Item name="amount" label="Amount (₹)" rules={[{ required: true }]}>
            <InputNumber min={0} precision={2} className="w-full" />
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="categoryId" label="Category">
            <Select
              showSearch
              allowClear
              placeholder="Select category"
              optionFilterProp="label"
              options={categoryOptions}
            />
          </Form.Item>
          <Form.Item name="date" label="Date" rules={[{ required: true }]}>
            <DatePicker className="w-full" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
