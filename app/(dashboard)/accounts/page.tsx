"use client";
import { useEffect, useState, useCallback } from "react";
import { Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Space, Popconfirm, Typography, message, Tooltip } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface Account { id: string; name: string; type: string; balance: number; openingBalance: number; totalIncome: number; totalExpenses: number; currency: string }

const TYPE_OPTIONS = [
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "credit", label: "Credit Card" },
];

const TYPE_COLOR: Record<string, string> = { bank: "blue", cash: "green", credit: "orange" };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    setAccounts(await fetch("/api/accounts").then((r) => r.json()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openEdit(a: Account) { setEditing(a); form.setFieldsValue(a); setModalOpen(true); }
  function openAdd() { setEditing(null); form.resetFields(); setModalOpen(true); }

  async function onSave(values: Partial<Account>) {
    if (editing) {
      await fetch(`/api/accounts/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    } else {
      await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
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

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Type", dataIndex: "type", key: "type", render: (t: string) => <Tag color={TYPE_COLOR[t] ?? "default"}>{t}</Tag> },
    {
      title: "Balance (computed)", dataIndex: "balance", key: "balance",
      sorter: (a: Account, b: Account) => a.balance - b.balance,
      render: (b: number, r: Account) => (
        <Tooltip title={
          <div style={{fontSize:12,lineHeight:"1.8"}}>
            <div>Opening: {r.currency} {(r.openingBalance??0).toLocaleString()}</div>
            <div style={{color:"#86efac"}}>+ Income: {r.currency} {(r.totalIncome??0).toLocaleString()}</div>
            <div style={{color:"#fca5a5"}}>- Expenses: {r.currency} {(r.totalExpenses??0).toLocaleString()}</div>
            <div style={{borderTop:"1px solid rgba(255,255,255,0.2)",marginTop:4,paddingTop:4,fontWeight:700}}>= {r.currency} {Number(b).toLocaleString()}</div>
          </div>}>
          <span style={{fontWeight:700,color:b<0?"#dc2626":b===0?"#9ca3af":"#16a34a",cursor:"help",borderBottom:"1px dashed currentColor"}}>
            {r.currency} {Number(b).toLocaleString()}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Income / Expenses", key: "txSummary",
      render: (_: unknown, r: Account) => (
        <div style={{fontSize:12}}>
          <div style={{color:"#16a34a"}}><ArrowUpOutlined /> {r.currency} {(r.totalIncome??0).toLocaleString()}</div>
          <div style={{color:"#dc2626"}}><ArrowDownOutlined /> {r.currency} {(r.totalExpenses??0).toLocaleString()}</div>
        </div>
      ),
    },
    {
      title: "Actions", key: "actions", render: (_: unknown, r: Account) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="Delete account?" onConfirm={() => onDelete(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Title level={4} className="!mb-0">Accounts</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Add Account</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={accounts} loading={loading} scroll={{ x: "max-content" }} />
      <Modal title={editing ? "Edit Account" : "Add Account"} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="name" label="Account Name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item name="balance" label="Current Balance (₹)"><InputNumber precision={2} className="w-full" /></Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="INR"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
