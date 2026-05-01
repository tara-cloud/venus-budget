"use client";
import { useState, useCallback } from "react";
import { Tabs, Card, Input, Button, Select, Typography, Table, Alert, message, Upload } from "antd";
import { InboxOutlined, CheckCircleOutlined } from "@ant-design/icons";
import Papa from "papaparse";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Dragger } = Upload;

interface ParsedSms { amount: number; type: string; date?: string; description: string; bank?: string; confidence: string }
interface CsvRow { date: string; description: string; amount: string; [key: string]: string }

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <Title level={4} className="!mb-0">Import Transactions</Title>
      <Tabs
        items={[
          { key: "sms", label: "SMS Parsing", children: <SmsImport /> },
          { key: "csv", label: "CSV Upload", children: <CsvImport /> },
        ]}
      />
    </div>
  );
}

function SmsImport() {
  const [smsText, setSmsText] = useState("");
  const [parsed, setParsed] = useState<ParsedSms | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useState(() => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
  });

  async function parseSmsText() {
    setError(null); setParsed(null);
    const res = await fetch("/api/import/sms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: smsText }) });
    if (!res.ok) { setError((await res.json()).error); return; }
    setParsed(await res.json());
  }

  async function confirm() {
    if (!parsed || !accountId) { message.warning("Select an account first"); return; }
    setSaving(true);
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, amount: parsed.amount, type: parsed.type, description: parsed.description, date: parsed.date ?? new Date().toISOString(), source: "sms" }),
    });
    setSaving(false);
    setSmsText(""); setParsed(null);
    message.success("Transaction saved from SMS");
  }

  return (
    <Card>
      <Text type="secondary" className="block mb-3">Paste a bank SMS alert and the app will extract the transaction details automatically.</Text>
      <TextArea rows={4} value={smsText} onChange={(e) => setSmsText(e.target.value)} placeholder="e.g. Your A/c XX1234 is debited for INR 500.00 on 01-05-2026" className="mb-3" />
      <Button type="primary" onClick={parseSmsText} disabled={!smsText.trim()}>Parse SMS</Button>
      {error && <Alert type="error" message={error} className="mt-3" showIcon />}
      {parsed && (
        <div className="mt-4 space-y-3">
          <Alert
            type={parsed.confidence === "high" ? "success" : "warning"}
            message={`Parsed (${parsed.confidence} confidence) — ${parsed.bank ?? "Unknown bank"}`}
            description={
              <ul className="mt-1 text-sm space-y-1">
                <li><b>Amount:</b> ₹{parsed.amount.toLocaleString()}</li>
                <li><b>Type:</b> {parsed.type}</li>
                {parsed.date && <li><b>Date:</b> {new Date(parsed.date).toLocaleDateString()}</li>}
                <li><b>Description:</b> {parsed.description}</li>
              </ul>
            }
            icon={<CheckCircleOutlined />}
          />
          <Select placeholder="Select account to credit/debit" value={accountId || undefined} onChange={setAccountId} className="w-full">
            {accounts.map((a) => <Option key={a.id} value={a.id}>{a.name}</Option>)}
          </Select>
          <Button type="primary" onClick={confirm} loading={saving} disabled={!accountId}>Save Transaction</Button>
        </div>
      )}
    </Card>
  );
}

function CsvImport() {
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);
  const [importing, setImporting] = useState(false);

  useState(() => { fetch("/api/accounts").then((r) => r.json()).then(setAccounts); });

  const onFile = useCallback((file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setRows(result.data.slice(0, 5));
        setHeaders(result.meta.fields ?? []);
        // Auto-map common header names
        const m: Record<string, string> = {};
        for (const h of result.meta.fields ?? []) {
          const lower = h.toLowerCase();
          if (lower.includes("date")) m.date = h;
          else if (lower.includes("desc") || lower.includes("narr") || lower.includes("detail")) m.description = h;
          else if (lower.includes("amount") || lower.includes("debit") || lower.includes("credit")) m.amount = h;
        }
        setMapping(m);
      },
    });
    return false;
  }, []);

  async function doImport() {
    if (!accountId) { message.warning("Select an account"); return; }
    setImporting(true);
    const fullFile = rows; // Using preview rows as demo; in real use, re-parse full file
    const mapped = fullFile.map((r) => ({
      accountId,
      date: r[mapping.date] ?? "",
      description: r[mapping.description] ?? "",
      amount: r[mapping.amount] ?? "0",
    }));
    const res = await fetch("/api/import/csv", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: mapped }) });
    const data = await res.json();
    setImporting(false);
    message.success(`Imported ${data.created} transactions`);
    setRows([]); setHeaders([]);
  }

  const FIELDS = ["date", "description", "amount"];

  return (
    <Card>
      <Text type="secondary" className="block mb-3">Upload a CSV exported from your bank. Map columns, then confirm import.</Text>
      <Dragger accept=".csv" showUploadList={false} beforeUpload={onFile} className="mb-4">
        <p className="ant-upload-drag-icon"><InboxOutlined /></p>
        <p>Click or drag CSV file here</p>
      </Dragger>

      {headers.length > 0 && (
        <div className="space-y-4">
          <div>
            <Text strong className="block mb-2">Map columns:</Text>
            <div className="flex flex-wrap gap-3">
              {FIELDS.map((f) => (
                <div key={f} className="flex items-center gap-1">
                  <Text className="capitalize w-24">{f}:</Text>
                  <Select value={mapping[f]} onChange={(v) => setMapping((m) => ({ ...m, [f]: v }))} style={{ width: 160 }} placeholder="Select column">
                    {headers.map((h) => <Option key={h} value={h}>{h}</Option>)}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <Table
            size="small"
            dataSource={rows.map((r, i) => ({ ...r, _key: i }))}
            rowKey="_key"
            columns={FIELDS.filter((f) => mapping[f]).map((f) => ({ title: f, dataIndex: mapping[f], key: f }))}
            pagination={false}
            title={() => <Text type="secondary">Preview (first {rows.length} rows)</Text>}
          />

          <Select placeholder="Target account" value={accountId || undefined} onChange={setAccountId} className="w-60">
            {accounts.map((a) => <Option key={a.id} value={a.id}>{a.name}</Option>)}
          </Select>

          <Button type="primary" onClick={doImport} loading={importing}>Import {rows.length}+ rows</Button>
        </div>
      )}
    </Card>
  );
}
