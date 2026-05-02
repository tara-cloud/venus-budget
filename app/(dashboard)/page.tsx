"use client";
import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography, Spin, Tag, Divider, Segmented } from "antd";
import {
  ArrowUpOutlined, ArrowDownOutlined, SaveOutlined,
  BankOutlined, WalletOutlined, CreditCardOutlined,
} from "@ant-design/icons";
import {
  PieChart, Pie, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
  BarChart, Bar, Cell,
  ComposedChart, Area, ReferenceLine,
} from "recharts";

const { Title, Text } = Typography;

interface Account { id: string; name: string; type: string; balance: number; openingBalance: number; totalIncome: number; totalExpenses: number; currency: string }
interface BreakdownItem { categoryId: string; name: string; color: string; amount: number }
interface DashboardData {
  month: number;
  year: number;
  totalBalance: number;
  accounts: Account[];
  accountsByType: { bank: Account[]; cash: Account[]; credit: Account[] };
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  breakdown: BreakdownItem[];
  groupBreakdown: { group: string; amount: number; color: string }[];
  trend: { label: string; Income: number; Expenses: number; Net: number }[];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(v: number | undefined | null) { return `₹${(v ?? 0).toLocaleString("en-IN")}`; }
function formatCurrency(v: unknown): string { return v ? `₹${Number(v).toLocaleString("en-IN")}` : ""; }

function coloredValue(color: string) {
  return (v: unknown) => <span style={{ color }}>{Number(v).toLocaleString("en-IN")}</span>;
}

const formatIncome          = coloredValue("#16a34a");
const formatExpense         = coloredValue("#dc2626");
const formatSavingsPositive = coloredValue("#2563eb");
const formatSavingsNegative = coloredValue("#dc2626");

const ACCOUNT_TYPE_ICONS: Record<string, React.ReactNode> = {
  bank:   <BankOutlined />,
  cash:   <WalletOutlined />,
  credit: <CreditCardOutlined />,
};
const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  bank:   "#6366f1",
  cash:   "#22c55e",
  credit: "#f59e0b",
};

export default function DashboardPage() {
  const [data,    setData]    = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cfRange,  setCfRange]  = useState<1|3|6|12>(12);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?cfRange=${cfRange}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [cfRange]);

  if (loading) return <div className="flex justify-center py-20"><Spin size="large" /></div>;
  if (!data)   return null;

  const pieData   = data.breakdown.map((b) => ({ ...b, fill: b.color }));
  const trendData = data.trend;  // API returns {label,Income,Expenses,Net} directly
  // Slice trendData to selected range (last N months)
  const filteredTrend = trendData.slice(-cfRange);

  const allAccountTypes = ["bank","cash","credit"] as const;

  return (
    <div className="space-y-6">
      <Title level={4} className="!mb-0">Dashboard</Title>

      {/* ── OVERALL BALANCE FROM ALL ACCOUNTS ─────────────────────────────── */}
      <Card
        style={{ background: "linear-gradient(135deg,#4f46e5 0%,#6366f1 60%,#818cf8 100%)", border: "none" }}
        styles={{ body: { padding: "20px 24px" } }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          {/* Total balance */}
          <div>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, display: "block", marginBottom: 4 }}>
              Total Balance — All Accounts
            </Text>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
              {fmt(data.totalBalance)}
            </div>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 4, display: "block" }}>
              across {data.accounts.length} account{data.accounts.length !== 1 ? "s" : ""}
            </Text>
          </div>
          {/* Per-type totals */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {allAccountTypes.map((type) => {
              const accs = data.accountsByType[type];
              if (accs.length === 0) return null;
              const total = accs.reduce((s, a) => s + a.balance, 0);
              return (
                <div key={type} style={{ textAlign: "right" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 }}>
                    {ACCOUNT_TYPE_ICONS[type]}
                    <span style={{ textTransform: "capitalize" }}>{type}</span>
                  </div>
                  <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>{fmt(total)}</div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{accs.length} account{accs.length !== 1 ? "s" : ""}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Individual account chips */}
        {data.accounts.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {data.accounts.map((a) => (
              <div key={a.id} title={`Opening: ${fmt(a.openingBalance)}  |  +Income: ${fmt(a.totalIncome)}  |  -Expenses: ${fmt(a.totalExpenses)}`} style={{
                background: "rgba(255,255,255,0.15)", borderRadius: 8,
                padding: "5px 12px", display: "flex", alignItems: "center", gap: 8,
                cursor: "help",
              }}>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>{ACCOUNT_TYPE_ICONS[a.type]}</span>
                <div>
                  <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ color: a.balance < 0 ? "#fca5a5" : "#86efac", fontSize: 11, fontWeight: 700 }}>
                    {fmt(a.balance)}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
                    ↑{fmt(a.totalIncome)} ↓{fmt(a.totalExpenses)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── CASH FLOW — 12 MONTHS ──────────────────────────────────────────── */}
      <Card
        title="Cash Flow"
        extra={
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Segmented
              size="small"
              value={cfRange}
              onChange={(v)=>setCfRange(v as 1|3|6|12)}
              options={[
                {label:"1M",value:1},
                {label:"3M",value:3},
                {label:"6M",value:6},
                {label:"12M",value:12},
              ]}
            />
            <Text type="secondary" style={{fontSize:11}}>
              {filteredTrend[0]?.label} → {filteredTrend[filteredTrend.length-1]?.label}
              {cfRange<=3?" (daily)":""}
            </Text>
          </div>
        }
      >
        {trendData.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No data yet — add transactions to see your cash flow</p>
        ) : (
          <>
            {/* Summary chips */}
            <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
              <div style={{flex:1,minWidth:120,padding:"10px 14px",borderRadius:8,background:"rgba(22,163,74,0.08)",border:"1px solid rgba(22,163,74,0.2)"}}>
                <Text type="secondary" style={{fontSize:11,display:"block"}}>Total Income</Text>
                <Text strong style={{color:"#16a34a",fontSize:16}}>{fmt(filteredTrend.reduce((s,t)=>s+t.Income,0))}</Text>
              </div>
              <div style={{flex:1,minWidth:120,padding:"10px 14px",borderRadius:8,background:"rgba(220,38,38,0.08)",border:"1px solid rgba(220,38,38,0.2)"}}>
                <Text type="secondary" style={{fontSize:11,display:"block"}}>Total Expenses</Text>
                <Text strong style={{color:"#dc2626",fontSize:16}}>{fmt(filteredTrend.reduce((s,t)=>s+t.Expenses,0))}</Text>
              </div>
              {(() => { const net=filteredTrend.reduce((s,t)=>s+t.Net,0); return (
              <div style={{flex:1,minWidth:120,padding:"10px 14px",borderRadius:8,background:net>=0?"rgba(37,99,235,0.08)":"rgba(220,38,38,0.08)",border:`1px solid ${net>=0?"rgba(37,99,235,0.2)":"rgba(220,38,38,0.2)"}`}}>
                <Text type="secondary" style={{fontSize:11,display:"block"}}>Net Savings</Text>
                <Text strong style={{color:net>=0?"#2563eb":"#dc2626",fontSize:16}}>{fmt(net)}</Text>
              </div>
              ); })()}
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={filteredTrend} margin={{top:5,right:20,left:10,bottom:5}}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{fontSize:11}} />
                <YAxis tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11}} />
                <Tooltip formatter={(v: unknown, name: unknown) => [formatCurrency(v), String(name)]} />
                <Legend />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="Income" stroke="#16a34a" strokeWidth={2} fill="url(#incomeGrad)" dot={false} />
                <Area type="monotone" dataKey="Expenses" stroke="#dc2626" strokeWidth={2} fill="url(#expenseGrad)" dot={false} />
                <Bar dataKey="Net" fill="#6366f1" opacity={0.7} radius={[3,3,0,0]}
                  label={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>

      {/* ── THIS MONTH SUMMARY ────────────────────────────────────────────── */}
      <div>
        <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
          {MONTH_NAMES[data.month - 1]} {data.year} — This Month
        </Text>
        <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Income"
                value={data.totalIncome}
                prefix="₹"
                formatter={formatIncome}
                suffix={<ArrowUpOutlined style={{ color: "#16a34a" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Expenses"
                value={data.totalExpenses}
                prefix="₹"
                formatter={formatExpense}
                suffix={<ArrowDownOutlined style={{ color: "#dc2626" }} />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Net Savings"
                value={data.netSavings}
                prefix="₹"
                formatter={data.netSavings >= 0 ? formatSavingsPositive : formatSavingsNegative}
                suffix={<SaveOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* ── CHARTS ─────────────────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={`Spending by Category — ${MONTH_NAMES[data.month-1]} ${data.year}`}>
            {pieData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No expense data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pieData} layout="vertical" margin={{top:0,right:60,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v)=>`₹${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={90} tick={{fontSize:11}} />
                  <Tooltip formatter={formatCurrency} />
                  <Bar dataKey="amount" radius={[0,6,6,0]} label={{position:"right",formatter:(v: unknown)=>`₹${(Number(v)/1000).toFixed(1)}k`,fontSize:10}}>
                    {pieData.map((entry,idx)=><Cell key={idx} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        {data.groupBreakdown.length > 0 && (
          <Col xs={24} md={12}>
            <Card title={`Spending by Group — ${MONTH_NAMES[data.month-1]} ${data.year}`}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={data.groupBreakdown.map(g=>({...g,fill:g.color}))}
                    dataKey="amount"
                    nameKey="group"
                    cx="50%" cy="50%"
                    outerRadius={90}
                    label={(props: { name?: unknown; percent?: number }) => `${props.name} ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                  />
                  <Tooltip formatter={(v:unknown)=>[`₹${Number(v).toLocaleString("en-IN")}`,"Spent"]} labelFormatter={(l)=>`Group: ${l}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:10,paddingTop:10,borderTop:"1px solid var(--border,#e5e7eb)"}}>
                {data.groupBreakdown.map((g)=>(
                  <div key={g.group} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 8px",borderRadius:5,background:`${g.color}18`,border:`1px solid ${g.color}40`}}>
                    <span style={{width:7,height:7,borderRadius:"50%",background:g.color,flexShrink:0}} />
                    <Text style={{fontSize:11,fontWeight:600}}>{g.group}</Text>
                    <Text type="secondary" style={{fontSize:11}}>₹{g.amount.toLocaleString("en-IN")}</Text>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
