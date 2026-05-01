"use client";
import { useEffect, useState, useCallback } from "react";
import {
  Card, Col, Row, Select, Typography, Spin, Empty, Tabs, Statistic, Tag,
} from "antd";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, ReferenceLine, Cell,
} from "recharts";
import {
  ArrowUpOutlined, ArrowDownOutlined, SaveOutlined,
  BankOutlined, WalletOutlined, CreditCardOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const now = new Date();

function fmt(v: number) { return `₹${Math.round(v).toLocaleString("en-IN")}`; }
function fmtC(v: unknown) { return v ? `₹${Math.round(Number(v)).toLocaleString("en-IN")}` : ""; }

const ACCOUNT_ICONS: Record<string, React.ReactNode> = {
  bank: <BankOutlined />, cash: <WalletOutlined />, credit: <CreditCardOutlined />,
};

interface AccountForecast {
  id: string; name: string; type: string; currency: string;
  currentBalance: number; forecastBalance: number;
  forecastIncome: number; forecastExpense: number;
}
interface CategoryForecast {
  id: string; name: string; color: string; icon?: string|null;
  group?: string|null; forecast: number; avgActual: number;
}
interface ForecastData {
  targetMonth: number; targetYear: number; monthsAhead: number;
  summary: { forecastIncome: number; forecastExpense: number; forecastNet: number };
  accounts: AccountForecast[];
  categories: CategoryForecast[];
  trend: { label: string; income: number; expense: number; net: number }[];
}

const MONTH_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
  return { month: d.getMonth()+1, year: d.getFullYear(), label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
});

export default function ForecastingPage() {
  const [data,    setData]    = useState<ForecastData|null>(null);
  const [loading, setLoading] = useState(true);
  const [targetMonth, setTargetMonth] = useState(now.getMonth()+2>12?1:now.getMonth()+2);
  const [targetYear,  setTargetYear]  = useState(now.getMonth()+2>12?now.getFullYear()+1:now.getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try { const r=await fetch(`/api/forecast?month=${targetMonth}&year=${targetYear}`); setData(await r.json()); }
    finally { setLoading(false); }
  }, [targetMonth, targetYear]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <Title level={4} style={{margin:0}}>Forecast</Title>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Text type="secondary" style={{fontSize:13}}>Forecast for:</Text>
          <Select
            value={`${targetMonth}-${targetYear}`}
            onChange={(v)=>{const[m,y]=v.split("-").map(Number);setTargetMonth(m);setTargetYear(y);}}
            options={MONTH_OPTIONS.map(o=>({value:`${o.month}-${o.year}`,label:o.label}))}
            style={{width:150}}
          />
          {data&&data.monthsAhead>0&&<Tag color="purple">{data.monthsAhead} month{data.monthsAhead!==1?"s":""} ahead</Tag>}
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center py-20"><Spin size="large" /></div>
      ) : !data ? null : (
        <Tabs defaultActiveKey="total" type="card" items={[
          { key:"total",  label:"Total",  children:<TotalSection  data={data} /> },
          { key:"income", label:"Income", children:<IncomeSection data={data} /> },
          { key:"spent",  label:"Spent",  children:<SpentSection  data={data} /> },
        ]} />
      )}
    </div>
  );
}

function TotalSection({data}:{data:ForecastData}) {
  const {summary,accounts,trend}=data;
  const totalCurrent =accounts.reduce((s,a)=>s+a.currentBalance,0);
  const totalForecast=accounts.reduce((s,a)=>s+a.forecastBalance,0);
  const change=totalForecast-totalCurrent;
  const barData=accounts.map(a=>({name:a.name,current:a.currentBalance,forecast:a.forecastBalance}));
  return (
    <div className="space-y-4">
      <Row gutter={[16,16]}>
        <Col xs={24} sm={8}><Card style={{background:"linear-gradient(135deg,#4f46e5,#818cf8)",border:"none"}}>
          <Text style={{color:"rgba(255,255,255,0.7)",fontSize:12,display:"block"}}>Current Total Balance</Text>
          <div style={{fontSize:28,fontWeight:800,color:"#fff"}}>{fmt(totalCurrent)}</div>
        </Card></Col>
        <Col xs={24} sm={8}><Card style={{background:"linear-gradient(135deg,#0f766e,#14b8a6)",border:"none"}}>
          <Text style={{color:"rgba(255,255,255,0.7)",fontSize:12,display:"block"}}>Forecast Balance ({MONTH_NAMES[data.targetMonth-1]} {data.targetYear})</Text>
          <div style={{fontSize:28,fontWeight:800,color:"#fff"}}>{fmt(totalForecast)}</div>
        </Card></Col>
        <Col xs={24} sm={8}><Card style={{background:change>=0?"linear-gradient(135deg,#166534,#22c55e)":"linear-gradient(135deg,#7f1d1d,#ef4444)",border:"none"}}>
          <Text style={{color:"rgba(255,255,255,0.7)",fontSize:12,display:"block"}}>Expected Change</Text>
          <div style={{fontSize:28,fontWeight:800,color:"#fff"}}>{change>=0?"+":""}{fmt(change)}</div>
        </Card></Col>
      </Row>
      <Card title="Income vs Expense Trend + Forecast">
        {trend.length===0?<Empty description="No data"/>:(
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={trend} margin={{top:5,right:20,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="label" tick={{fontSize:11}}/>
              <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
              <Tooltip formatter={fmtC}/>
              <Legend/>
              <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3"/>
              <Bar dataKey="net" fill="#6366f1" opacity={0.6} radius={[3,3,0,0]} name="Net"/>
              <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} dot={false} name="Income"/>
              <Line type="monotone" dataKey="expense" stroke="#dc2626" strokeWidth={2} dot={false} name="Expense"/>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Card title="Account Balance — Current vs Forecast">
        {barData.length===0?<Empty description="No accounts"/>:(
          <ResponsiveContainer width="100%" height={Math.max(120,barData.length*55)}>
            <BarChart data={barData} layout="vertical" margin={{left:10,right:60}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
              <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
              <YAxis type="category" dataKey="name" width={110} tick={{fontSize:12}}/>
              <Tooltip formatter={fmtC}/>
              <Legend/>
              <Bar dataKey="current"  fill="#6366f1" opacity={0.6} radius={[0,4,4,0]} name="Current"/>
              <Bar dataKey="forecast" fill="#22c55e" opacity={0.8} radius={[0,4,4,0]} name="Forecast"/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function IncomeSection({data}:{data:ForecastData}) {
  const {summary,accounts}=data;
  const incAccs=accounts.filter(a=>a.forecastIncome>0);
  return (
    <div className="space-y-4">
      <Row gutter={[16,16]}>
        <Col xs={24} sm={12}><Card>
          <Statistic title={`Forecast Income — ${MONTH_NAMES[data.targetMonth-1]} ${data.targetYear}`}
            value={Math.round(summary.forecastIncome)} prefix="₹"
            valueStyle={{color:"#16a34a",fontSize:26}} suffix={<ArrowUpOutlined/>}/>
          <Text type="secondary" style={{fontSize:12}}>Based on last 12 months of income (linear trend projection)</Text>
        </Card></Col>
        <Col xs={24} sm={12}><Card>
          <Statistic title="Net Savings Forecast" value={Math.round(summary.forecastNet)} prefix="₹"
            valueStyle={{color:summary.forecastNet>=0?"#2563eb":"#dc2626",fontSize:26}} suffix={<SaveOutlined/>}/>
          <Text type="secondary" style={{fontSize:12}}>Income forecast minus expense forecast</Text>
        </Card></Col>
      </Row>
      <Card title="Income Forecast per Account">
        {incAccs.length===0?<Empty description="No income history for accounts"/>:(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {incAccs.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,background:"rgba(22,163,74,0.05)",border:"1px solid rgba(22,163,74,0.15)"}}>
                <span style={{color:"#16a34a",fontSize:18}}>{ACCOUNT_ICONS[a.type]}</span>
                <div style={{flex:1}}>
                  <Text strong style={{display:"block"}}>{a.name}</Text>
                  <Text type="secondary" style={{fontSize:12}}>Current: {fmt(a.currentBalance)} | After forecast: {fmt(a.currentBalance+a.forecastIncome-a.forecastExpense)}</Text>
                </div>
                <div style={{textAlign:"right"}}>
                  <Text strong style={{color:"#16a34a",fontSize:16,display:"block"}}>+{fmt(a.forecastIncome)}</Text>
                  <Text type="secondary" style={{fontSize:11}}>forecast income</Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Income Trend + Forecast">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data.trend} margin={{top:5,right:20,left:10,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:11}}/>
            <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
            <Tooltip formatter={fmtC}/>
            <Legend/>
            <Bar dataKey="income" fill="#16a34a" opacity={0.7} radius={[4,4,0,0]} name="Income"/>
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function SpentSection({data}:{data:ForecastData}) {
  const {summary,accounts,categories}=data;
  const expAccs=accounts.filter(a=>a.forecastExpense>0);
  const totalForecastExpense=summary.forecastExpense;
  return (
    <div className="space-y-4">
      <Row gutter={[16,16]}>
        <Col xs={24} sm={12}><Card>
          <Statistic title={`Forecast Spend — ${MONTH_NAMES[data.targetMonth-1]} ${data.targetYear}`}
            value={Math.round(summary.forecastExpense)} prefix="₹"
            valueStyle={{color:"#dc2626",fontSize:26}} suffix={<ArrowDownOutlined/>}/>
          <Text type="secondary" style={{fontSize:12}}>Based on last 12 months of spending (linear trend projection)</Text>
        </Card></Col>
        <Col xs={24} sm={12}><Card>
          <Statistic title="Forecast Income" value={Math.round(summary.forecastIncome)} prefix="₹"
            valueStyle={{color:"#16a34a",fontSize:26}} suffix={<ArrowUpOutlined/>}/>
          <Text type="secondary" style={{fontSize:12}}>Net: {fmt(summary.forecastNet)}</Text>
        </Card></Col>
      </Row>
      <Card title="Spend Forecast per Account">
        {expAccs.length===0?<Empty description="No expense history for accounts"/>:(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {expAccs.map(a=>(
              <div key={a.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:8,background:"rgba(220,38,38,0.04)",border:"1px solid rgba(220,38,38,0.12)"}}>
                <span style={{color:"#dc2626",fontSize:18}}>{ACCOUNT_ICONS[a.type]}</span>
                <div style={{flex:1}}>
                  <Text strong style={{display:"block"}}>{a.name}</Text>
                  <Text type="secondary" style={{fontSize:12}}>Current: {fmt(a.currentBalance)}</Text>
                </div>
                <div style={{textAlign:"right"}}>
                  <Text strong style={{color:"#dc2626",fontSize:16,display:"block"}}>-{fmt(a.forecastExpense)}</Text>
                  <Text type="secondary" style={{fontSize:11}}>forecast spend</Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card title="Spend Forecast by Category">
        {categories.length===0?<Empty description="No category expense history"/>:(
          <>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
              {categories.slice(0,10).map(c=>{
                const pct=totalForecastExpense>0?Math.round((c.forecast/totalForecastExpense)*100):0;
                return (
                  <div key={c.id} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:15,width:20}}>{c.icon}</span>
                    <Text style={{width:120,fontSize:12,fontWeight:500,flexShrink:0}}>{c.name}</Text>
                    <div style={{flex:1,height:12,borderRadius:6,background:"var(--border,#e5e7eb)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:c.color,borderRadius:6,minWidth:4}}/>
                    </div>
                    <Text style={{fontSize:12,width:70,textAlign:"right",fontWeight:600}}>{fmt(c.forecast)}</Text>
                    <Text type="secondary" style={{fontSize:11,width:32,textAlign:"right"}}>{pct}%</Text>
                  </div>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={Math.max(120,Math.min(categories.length,10)*36)}>
              <BarChart data={categories.slice(0,10).map(c=>({name:c.name,forecast:c.forecast,avg:c.avgActual,fill:c.color}))} layout="vertical" margin={{left:10,right:60}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                <XAxis type="number" tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:10}}/>
                <YAxis type="category" dataKey="name" width={100} tick={{fontSize:11}}/>
                <Tooltip formatter={fmtC}/>
                <Legend/>
                <Bar dataKey="avg" fill="#9ca3af" opacity={0.5} radius={[0,3,3,0]} name="Avg Actual"/>
                <Bar dataKey="forecast" radius={[0,4,4,0]} name="Forecast">
                  {categories.slice(0,10).map((c,i)=><Cell key={i} fill={c.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>
      <Card title="Expense Trend + Forecast">
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={data.trend} margin={{top:5,right:20,left:10,bottom:5}}>
            <CartesianGrid strokeDasharray="3 3" vertical={false}/>
            <XAxis dataKey="label" tick={{fontSize:11}}/>
            <YAxis tickFormatter={v=>`₹${(v/1000).toFixed(0)}k`} tick={{fontSize:11}}/>
            <Tooltip formatter={fmtC}/>
            <Legend/>
            <Bar dataKey="expense" fill="#dc2626" opacity={0.7} radius={[4,4,0,0]} name="Expense"/>
          </ComposedChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
