"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card, Col, Row, Button, Modal, Form, Select, InputNumber,
  Progress, Typography, Tag, Empty, message, Collapse, Badge, Checkbox, Alert,
  Popconfirm, Tooltip, Space, Input,
} from "antd";
import { PlusOutlined, FolderOutlined, TagsOutlined, CopyOutlined, EditOutlined, DeleteOutlined, LockOutlined, UnlockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Category { id: string; name: string; color: string; icon?: string; type: string; group?: string | null }
interface Budget { id: string; categoryId: string; category: Category; month: number; year: number; amount: number; spent: number }

const MONTH_OPTIONS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
].map((m, i) => ({ value: i + 1, label: m }));

const now = new Date();

function statusColor(pct: number) {
  if (pct >= 100) return "#dc2626";
  if (pct >= 80) return "#f59e0b";
  return "#16a34a";
}

function BudgetCard({ b, onEdit, onDelete, onUnlock, unlockedIds }: { b: Budget; onEdit:(b:Budget)=>void; onDelete:(id:string)=>void; onUnlock:(id:string)=>void; unlockedIds:Set<string> }) {
  const pct = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
  const remaining = b.amount - b.spent;

  // Edit/delete only allowed for future months OR explicitly unlocked current month
  const todayYear   = new Date().getFullYear();
  const todayMonth  = new Date().getMonth() + 1;
  const isFuture    = b.year > todayYear || (b.year === todayYear && b.month > todayMonth);
  const isCurrent   = b.year === todayYear && b.month === todayMonth;
  const isUnlocked  = unlockedIds.has(b.id);
  const canEdit     = isFuture || isUnlocked;
  const lockedTip   = isCurrent ? "Current month — click 🔓 to unlock for editing" : "Cannot edit/delete past budgets";

  return (
    <Col key={b.id} xs={24} sm={12} lg={8}>
      <Card size="small"
        style={{ borderTop: `3px solid ${b.category.color}`, outline: isUnlocked ? "2px solid #f59e0b" : "none" }}
        extra={
          <Space size={4}>
            {/* Unlock button — only shown for current month */}
            {isCurrent && (
              <Tooltip title={isUnlocked ? "Locked after save" : "Unlock to edit current month"}>
                <Button
                  size="small" type="text"
                  icon={isUnlocked ? <UnlockOutlined style={{color:"#f59e0b"}} /> : <LockOutlined style={{color:"#9ca3af"}} />}
                  onClick={()=>!isUnlocked && onUnlock(b.id)}
                />
              </Tooltip>
            )}
            <Tooltip title={canEdit ? "Edit limit" : lockedTip}>
              <Button size="small" type="text" icon={<EditOutlined />} onClick={()=>canEdit&&onEdit(b)} disabled={!canEdit} />
            </Tooltip>
            <Popconfirm
              title="Delete this budget?"
              onConfirm={()=>onDelete(b.id)}
              okText="Delete" okButtonProps={{danger:true}}
              disabled={!isFuture}
            >
              <Tooltip title={isFuture ? "Delete budget" : "Cannot delete past/current budgets"}>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} disabled={!isFuture} />
              </Tooltip>
            </Popconfirm>
          </Space>
        }
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18 }}>{b.category.icon}</span>
            <div>
              <Tag color={b.category.color} style={{ marginBottom: 2 }}>{b.category.name}</Tag>
              {b.category.group && (
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  <FolderOutlined style={{ marginRight: 3 }} />{b.category.group}
                </div>
              )}
            </div>
          </div>
          <Text
            style={{
              fontSize: 12, fontWeight: 600,
              color: pct >= 100 ? "#dc2626" : pct >= 80 ? "#f59e0b" : "#16a34a",
            }}
          >
            {pct}%
          </Text>
        </div>
        <Progress
          percent={Math.min(pct, 100)}
          strokeColor={statusColor(pct)}
          showInfo={false}
          size="small"
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={{ fontSize: 13 }}>₹{b.spent.toLocaleString()} <Text type="secondary" style={{ fontSize: 11 }}>spent</Text></Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {remaining >= 0
              ? <>₹{remaining.toLocaleString()} left</>
              : <Text type="danger" style={{ fontSize: 13 }}>₹{Math.abs(remaining).toLocaleString()} over</Text>}
          </Text>
        </div>
        <div style={{ textAlign: "right", marginTop: 2 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>limit ₹{b.amount.toLocaleString()}</Text>
        </div>
      </Card>
    </Col>
  );
}

export default function BudgetsPage() {
  const [budgets,    setBudgets]    = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [month,      setMonth]      = useState(now.getMonth() + 1);
  const [year,       setYear]       = useState(now.getFullYear());
  const [modalOpen,  setModalOpen]  = useState(false);
  const [form]      = Form.useForm();
  const [copyForm]  = Form.useForm();
  const [editForm]  = Form.useForm();
  const [copyOpen,  setCopyOpen]  = useState(false);
  const [copying,   setCopying]   = useState(false);
  const [editBudget,setEditBudget] = useState<Budget|null>(null);
  const [editOpen,  setEditOpen]  = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockComment, setUnlockComment] = useState("");
  const [unlockModalId, setUnlockModalId] = useState<string|null>(null);

  const yearOptions = [year - 1, year, year + 1].map((y) => ({ value: y, label: String(y) }));

  const load = useCallback(async () => {
    setLoading(true);
    const [b, c] = await Promise.all([
      fetch(`/api/budgets?month=${month}&year=${year}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setBudgets(Array.isArray(b) ? b : []);
    setCategories(Array.isArray(c) ? c.filter((cat: Category) => cat.type === "expense") : []);
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  async function onSave(values: { categoryId: string; amount: number }) {
    await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, month, year }),
    });
    setModalOpen(false);
    await load();
    message.success("Budget saved");
  }

  async function onUpdateBudget(values: { amount: number }) {
    if (!editBudget) return;
    await fetch(`/api/budgets/${editBudget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: values.amount, unlockComment }),
    });
    lockAfterEdit(editBudget.id);  // re-lock after save
    setEditOpen(false);
    await load();
    message.success("Budget updated and locked");
  }

  async function onDeleteBudget(id: string) {
    await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    await load();
    message.success("Budget deleted");
  }

  function openEdit(b: Budget) {
    setEditBudget(b);
    editForm.setFieldsValue({ amount: b.amount });
    setEditOpen(true);
  }

  function requestUnlock(id: string) {
    setUnlockComment("");
    setUnlockModalId(id);
  }

  function confirmUnlock() {
    if (!unlockModalId) return;
    if (!unlockComment.trim()) { return; }
    setUnlockedIds(prev => { const s = new Set(prev); s.add(unlockModalId); return s; });
    setUnlockModalId(null);
    message.info("Budget unlocked for editing. Don't forget to save!");
  }

  function lockAfterEdit(id: string) {
    setUnlockedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  }

  async function onCopy(values: { fromMonth: number; fromYear: number; targetKeys: string[]; overwrite: boolean }) {
    if (!values.targetKeys || values.targetKeys.length === 0) {
      message.warning("Please select at least one target month");
      return;
    }
    setCopying(true);
    try {
      const targets = values.targetKeys.map((k) => {
        const [m, y] = k.split("-").map(Number);
        return { month: m, year: y };
      });
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copyFrom",
          fromMonth: values.fromMonth,
          fromYear:  values.fromYear,
          targets,
          overwrite: values.overwrite ?? false,
        }),
      });
      const data = await res.json();
      if (data.copied === 0) {
        message.warning(data.message ?? "No budgets found in source month");
      } else {
        message.success(data.message ?? `Copied ${data.copied} budget(s)`);
        setCopyOpen(false);
        await load();
      }
    } catch {
      message.error("Failed to copy budgets");
    } finally {
      setCopying(false);
    }
  }

  // Group budgets by category group
  const { grouped, ungrouped } = useMemo(() => {
    const g: Record<string, Budget[]> = {};
    const u: Budget[] = [];
    budgets.forEach((b) => {
      const grp = b.category?.group;
      if (grp) { g[grp] = g[grp] ?? []; g[grp].push(b); }
      else u.push(b);
    });
    return { grouped: g, ungrouped: u };
  }, [budgets]);

  const groupNames = Object.keys(grouped).sort();

  // Category select options grouped by group
  // IDs of categories that already have a budget this month
  const budgetedCategoryIds = useMemo(() => new Set(budgets.map((b) => b.categoryId)), [budgets]);

  const categorySelectOptions = useMemo(() => {
    // Exclude categories that already have a budget for this month
    const available = categories.filter((c) => !budgetedCategoryIds.has(c.id));
    const byGroup: Record<string, Category[]> = {};
    const noGroup: Category[] = [];
    available.forEach((c) => {
      if (c.group) { byGroup[c.group] = byGroup[c.group] ?? []; byGroup[c.group].push(c); }
      else noGroup.push(c);
    });
    const opts: { label: React.ReactNode; options: { value: string; label: React.ReactNode }[] }[] = [];
    Object.keys(byGroup).sort().forEach((g) => {
      opts.push({
        label: <span><FolderOutlined style={{ marginRight: 4, color: "#6366f1" }} />{g}</span>,
        options: byGroup[g].map((c) => ({
          value: c.id,
          label: <span>{c.icon} {c.name}</span>,
        })),
      });
    });
    if (noGroup.length > 0) {
      opts.push({
        label: <span><TagsOutlined style={{ marginRight: 4, color: "#9ca3af" }} />Ungrouped</span>,
        options: noGroup.map((c) => ({ value: c.id, label: <span>{c.icon} {c.name}</span> })),
      });
    }
    return { opts, remaining: available.length };
  }, [categories, budgetedCategoryIds]);


  // Summary stats
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent  = budgets.reduce((s, b) => s + b.spent,  0);
  const overBudget  = budgets.filter((b) => b.spent > b.amount).length;

  // Collapse items for grouped view
  const collapseItems = groupNames.map((g) => {
    const grpBudgets = grouped[g];
    const grpTotal   = grpBudgets.reduce((s, b) => s + b.amount, 0);
    const grpSpent   = grpBudgets.reduce((s, b) => s + b.spent,  0);
    const grpPct     = grpTotal > 0 ? Math.round((grpSpent / grpTotal) * 100) : 0;
    return {
      key: g,
      label: (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FolderOutlined style={{ color: "#6366f1" }} />
          <Text strong>{g}</Text>
          <Badge count={grpBudgets.length} style={{ background: "#6366f1" }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ₹{grpSpent.toLocaleString()} / ₹{grpTotal.toLocaleString()} ({grpPct}%)
          </Text>
        </div>
      ),
      children: (
        <Row gutter={[12, 12]}>
          {grpBudgets.map((b) => <BudgetCard key={b.id} b={b} onEdit={openEdit} onDelete={onDeleteBudget} onUnlock={requestUnlock} unlockedIds={unlockedIds} />)}
        </Row>
      ),
    };
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Title level={4} style={{ margin: 0 }}>Budgets</Title>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Select value={month} onChange={setMonth} options={MONTH_OPTIONS} style={{ width: 90 }} />
          <Select value={year} onChange={setYear} options={yearOptions} style={{ width: 90 }} />
          <Button icon={<CopyOutlined />} onClick={() => {
              copyForm.setFieldsValue({ fromMonth: month === 1 ? 12 : month-1, fromYear: month === 1 ? year-1 : year, overwrite: false });
              setCopyOpen(true);
            }}>Copy from Month</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }} disabled={categorySelectOptions.remaining === 0}>
            Set Budget
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      {budgets.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tag color="default">{budgets.length} budgets</Tag>
          <Tag color="blue">₹{totalBudget.toLocaleString()} total limit</Tag>
          <Tag color={totalSpent > totalBudget ? "error" : "green"}>₹{totalSpent.toLocaleString()} spent</Tag>
          {overBudget > 0 && <Tag color="error">{overBudget} over budget</Tag>}
        </div>
      )}

      {/* Budget cards */}
      {loading ? (
        <div style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Loading…</div>
      ) : budgets.length === 0 ? (
        <Empty description="No budgets set for this month" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Grouped budgets */}
          {groupNames.length > 0 && (
            <Collapse
              defaultActiveKey={groupNames}
              bordered={false}
              style={{ background: "transparent" }}
              items={collapseItems}
            />
          )}

          {/* Ungrouped budgets */}
          {ungrouped.length > 0 && (
            <div>
              {groupNames.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <TagsOutlined style={{ color: "#9ca3af" }} />
                  <Text type="secondary" style={{ fontWeight: 600 }}>Ungrouped</Text>
                  <Badge count={ungrouped.length} style={{ background: "#9ca3af" }} />
                </div>
              )}
              <Row gutter={[12, 12]}>
                {ungrouped.map((b) => <BudgetCard key={b.id} b={b} onEdit={openEdit} onDelete={onDeleteBudget} onUnlock={requestUnlock} unlockedIds={unlockedIds} />)}
              </Row>
            </div>
          )}
        </div>
      )}

      {/* Unlock confirm modal */}
      <Modal
        title={<span><UnlockOutlined style={{marginRight:8,color:"#f59e0b"}}/>Unlock Budget for Editing</span>}
        open={!!unlockModalId}
        onCancel={()=>setUnlockModalId(null)}
        onOk={confirmUnlock}
        okText="Unlock"
        okButtonProps={{style:{background:"#f59e0b",borderColor:"#f59e0b"}}}
        destroyOnHidden
      >
        <div style={{marginBottom:12,color:"#6b7280",fontSize:13}}>
          You are about to edit a <strong>current month</strong> budget. Please provide a reason — it will be saved with the change.
        </div>
        <Input.TextArea
          rows={3}
          placeholder="Reason for editing current month budget (required)..."
          value={unlockComment}
          onChange={e=>setUnlockComment(e.target.value)}
          autoFocus
        />
        {!unlockComment.trim() && unlockModalId && (
          <div style={{color:"#ef4444",fontSize:12,marginTop:4}}>A reason is required to unlock.</div>
        )}
      </Modal>

      {/* Edit Budget modal */}
      <Modal
        title={editBudget ? <span><EditOutlined style={{marginRight:8}}/>Edit Budget — {editBudget.category.icon} {editBudget.category.name}</span> : "Edit Budget"}
        open={editOpen}
        onCancel={()=>setEditOpen(false)}
        onOk={()=>editForm.submit()}
        okText="Save"
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdateBudget} style={{marginTop:8}}>
          {editBudget && (
            <div style={{marginBottom:16,padding:"8px 12px",borderRadius:8,background:"var(--card,#f8fafc)",border:"1px solid var(--border,#e5e7eb)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:10,height:10,borderRadius:"50%",background:editBudget.category.color,flexShrink:0}} />
              <Text strong>{editBudget.category.name}</Text>
              {editBudget.category.group && <Tag color="default" style={{fontSize:11}}>{editBudget.category.group}</Tag>}
              <Text type="secondary" style={{fontSize:12,marginLeft:"auto"}}>
                Currently: ₹{editBudget.amount.toLocaleString()} — ₹{editBudget.spent.toLocaleString()} spent
              </Text>
            </div>
          )}
          {unlockComment && (
            <div style={{marginBottom:12,padding:"6px 10px",borderRadius:6,background:"#fffbeb",border:"1px solid #fde68a",fontSize:12,color:"#92400e"}}>
              <strong>Unlock reason:</strong> {unlockComment}
            </div>
          )}
          <Form.Item name="amount" label="Monthly Limit (₹)" rules={[{required:true,message:"Enter an amount"},{type:"number",min:1}]}>
            <InputNumber min={1} precision={2} style={{width:"100%"}} placeholder="e.g. 5000" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Copy budgets modal */}
      <Modal
        title={<span><CopyOutlined style={{marginRight:8}} />Copy Budgets to Multiple Months</span>}
        open={copyOpen}
        onCancel={()=>setCopyOpen(false)}
        onOk={()=>copyForm.submit()}
        okText="Copy Budgets"
        confirmLoading={copying}
        destroyOnHidden
        width={520}
      >
        <Form form={copyForm} layout="vertical" onFinish={onCopy} style={{marginTop:8}}>
          {/* Source month */}
          <div style={{background:"var(--card,#f8fafc)",border:"1px solid var(--border,#e5e7eb)",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontWeight:600,marginBottom:10,fontSize:13}}>Copy FROM (source)</div>
            <div style={{display:"flex",gap:12}}>
              <Form.Item name="fromMonth" label="Month" rules={[{required:true,message:"Select source month"}]} style={{flex:2,marginBottom:0}}>
                <Select options={MONTH_OPTIONS} placeholder="Month" />
              </Form.Item>
              <Form.Item name="fromYear" label="Year" rules={[{required:true,message:"Select source year"}]} style={{flex:1,marginBottom:0}}>
                <Select options={[year-2,year-1,year,year+1].map(y=>({value:y,label:String(y)}))} placeholder="Year" />
              </Form.Item>
            </div>
          </div>
          {/* Target months — multi-select checkboxes */}
          <Form.Item
            name="targetKeys"
            label={<span style={{fontWeight:600}}>Copy TO (select one or more months)</span>}
            rules={[{required:true,message:"Select at least one target month",type:"array",min:1}]}
          >
            <Checkbox.Group style={{width:"100%"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px 12px"}}>
                {[year-1,year,year+1].flatMap(y=>
                  MONTH_OPTIONS.map(m=>{
                    const key = `${m.value}-${y}`;
                    const isSource = copyForm.getFieldValue("fromMonth")===m.value && copyForm.getFieldValue("fromYear")===y;
                    return (
                      <Checkbox key={key} value={key} disabled={isSource}
                        style={{margin:0,padding:"4px 6px",borderRadius:6,border:"1px solid var(--border,#e5e7eb)",background:"var(--card,#fff)"}}>
                        <span style={{fontSize:12}}>{m.label} {y}{isSource&&<span style={{color:"#9ca3af",fontSize:10}}> (src)</span>}</span>
                      </Checkbox>
                    );
                  })
                )}
              </div>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item name="overwrite" valuePropName="checked" style={{marginBottom:4}}>
            <Checkbox>Overwrite existing budgets in target months</Checkbox>
          </Form.Item>
          <div style={{fontSize:12,color:"#9ca3af"}}>
            If unchecked, categories that already have a budget in the target month are skipped.
          </div>
        </Form>
      </Modal>

      {/* Set Budget modal */}
      <Modal
        title={<span>Set Budget {categorySelectOptions.remaining === 0 ? <Text type="secondary" style={{fontSize:12}}>(all categories budgeted)</Text> : <Text type="secondary" style={{fontSize:12}}>({categorySelectOptions.remaining} available)</Text>}</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="categoryId" label="Category" rules={[{ required: true }]}>
            <Select
              placeholder="Select expense category"
              showSearch
              optionFilterProp="label"
              options={categorySelectOptions.opts}
            />
          </Form.Item>
          <Form.Item name="amount" label="Monthly Limit (₹)" rules={[{ required: true }]}>
            <InputNumber min={1} precision={2} style={{ width: "100%" }} placeholder="e.g. 5000" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
