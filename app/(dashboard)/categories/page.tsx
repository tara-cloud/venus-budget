"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Button, Modal, Form, Input, Select, Space, Popconfirm,
  Tag, Typography, App, Badge, Tooltip, Empty,
} from "antd";
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FolderOutlined, TagsOutlined, HolderOutlined,
  RestOutlined, UndoOutlined,
} from "@ant-design/icons";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const { Title, Text } = Typography;

interface Category {
  id: string; name: string; color: string;
  icon?: string; type: string; group?: string | null;
  deletedAt?: string | null;
}

const TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income",  label: "Income"  },
];

const COLOR_OPTIONS = [
  "#6366f1","#22c55e","#f97316","#3b82f6","#ec4899",
  "#ef4444","#14b8a6","#f59e0b","#8b5cf6","#0ea5e9","#6b7280",
].map((c) => ({
  value: c, label: <span><span style={{color:c,marginRight:6}}>&#9632;</span>{c}</span>,
}));

function SortableCatRow({ cat, onEdit, onDelete }: { cat: Category; onEdit:(c:Category)=>void; onDelete:(id:string)=>void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", borderRadius:8, marginBottom:6, background:"var(--card,#fff)", border:"1px solid var(--border,#e5e7eb)", cursor:"default" }}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span {...attributes} {...listeners} style={{cursor:"grab",color:"#9ca3af",display:"flex",alignItems:"center"}}><HolderOutlined /></span>
        <span style={{width:10,height:10,borderRadius:"50%",background:cat.color,flexShrink:0}} />
        <span style={{fontSize:16}}>{cat.icon}</span>
        <Text style={{fontWeight:500}}>{cat.name}</Text>
        <Tag color={cat.type==="income"?"green":"volcano"}>{cat.type}</Tag>
      </div>
      <Space size="small">
        <Tooltip title="Edit"><Button size="small" type="text" icon={<EditOutlined />} onClick={()=>onEdit(cat)} /></Tooltip>
        <Popconfirm title="Move to trash? You can restore it later." onConfirm={()=>onDelete(cat.id)} okText="Move to Trash" okButtonProps={{danger:true}}>
          <Button size="small" type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    </div>
  );
}

function DragCard({ cat }: { cat: Category }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:8,background:"#6366f1",color:"#fff",boxShadow:"0 8px 24px rgba(99,102,241,0.4)",cursor:"grabbing",userSelect:"none"}}>
      <HolderOutlined /><span style={{fontSize:16}}>{cat.icon}</span><span style={{fontWeight:600}}>{cat.name}</span>
    </div>
  );
}

function DroppableGroup({ groupId, children, isEmpty }: { groupId:string; children:React.ReactNode; isEmpty:boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "group:" + groupId });
  return (
    <div ref={setNodeRef} style={{ minHeight:isEmpty?48:"auto", borderRadius:8, background:isOver?"rgba(99,102,241,0.06)":"transparent", border:isOver?"2px dashed #6366f1":"2px dashed transparent", transition:"all 0.15s", padding:isEmpty?"10px 12px":0 }}>
      {isEmpty && !isOver
        ? <Text type="secondary" style={{fontSize:12}}>Drop categories here or edit a category to assign this group.</Text>
        : children}
    </div>
  );
}

export default function CategoriesPage() {
  const { message } = App.useApp();
  const [cats,setCats]                     = useState<Category[]>([]);
  const [loading,setLoading]               = useState(true);
  const [modalOpen,setModalOpen]           = useState(false);
  const [editing,setEditing]               = useState<Category|null>(null);
  const [viewMode,setViewMode]             = useState<"group"|"type">("group");
  const [stubGroups,setStubGroups]         = useState<string[]>([]);
  const [groupModalOpen,setGroupModalOpen] = useState(false);
  const [activeId,setActiveId]             = useState<string|null>(null);
  const [showTrash,setShowTrash]           = useState(false);
  const [deletedCats,setDeletedCats]       = useState<Category[]>([]);
  const [form]      = Form.useForm();
  const [groupForm] = Form.useForm();
  const sensors = useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}));

  const load = useCallback(async()=>{
    setLoading(true);
    try { const d=await fetch("/api/categories").then(r=>r.json()); setCats(Array.isArray(d)?d:[]); }
    finally { setLoading(false); }
  },[]);

  const loadDeleted = useCallback(async()=>{
    try {
      const d=await fetch("/api/categories?includeDeleted=true").then(r=>r.json());
      setDeletedCats(Array.isArray(d)?d.filter((c:Category)=>c.deletedAt):[]);
    } catch{}
  },[]);

  useEffect(()=>{load();loadDeleted();},[load,loadDeleted]);
  useEffect(()=>{
    try { const s=JSON.parse(localStorage.getItem("category-groups")||"{}"); setStubGroups(Object.keys(s).sort()); } catch{}
  },[]);

  const existingGroups=useMemo(()=>[...new Set([...cats.map(c=>c.group).filter(Boolean) as string[],...stubGroups])].sort(),[cats,stubGroups]);
  const groupOptions=useMemo(()=>existingGroups.map(g=>({value:g,label:g})),[existingGroups]);

  function openCreate(){setEditing(null);form.resetFields();setModalOpen(true);}
  function openEdit(cat:Category){setEditing(cat);form.setFieldsValue({...cat,group:cat.group??""});setModalOpen(true);}

  async function onSave(values:Partial<Category>&{group?:string}){
    const payload={...values,group:values.group?.trim()||null};
    if(editing){await fetch(`/api/categories/${editing.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});}
    else{await fetch("/api/categories",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});}
    setModalOpen(false);await load();message.success(editing?"Category updated":"Category created");
  }

  async function onDelete(id:string){
    await fetch(`/api/categories/${id}`,{method:"DELETE"});
    await load();await loadDeleted();
    message.success("Category moved to trash");
  }

  async function onRestore(id:string){
    await fetch(`/api/categories/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({restore:true})});
    await load();await loadDeleted();
    message.success("Category restored");
  }

  async function onRenameGroup(oldName:string,newName:string){
    try{const s=JSON.parse(localStorage.getItem("category-groups")||"{}");if(s[oldName]){s[newName]=s[oldName];delete s[oldName];}localStorage.setItem("category-groups",JSON.stringify(s));setStubGroups(p=>p.map(g=>g===oldName?newName.trim():g));}catch{}
    await Promise.all(cats.filter(c=>c.group===oldName).map(c=>fetch(`/api/categories/${c.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({group:newName.trim()||null})})));
    await load();message.success(`Group renamed to "${newName}"`);
  }

  async function onDeleteGroup(groupName:string){
    await Promise.all(cats.filter(c=>c.group===groupName).map(c=>fetch(`/api/categories/${c.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({group:null})})));
    const s=JSON.parse(localStorage.getItem("category-groups")||"{}");delete s[groupName];localStorage.setItem("category-groups",JSON.stringify(s));
    setStubGroups(p=>p.filter(g=>g!==groupName));await load();message.success(`Group "${groupName}" removed`);
  }

  async function onCreateGroup(values:{name:string}){
    const name=values.name.trim();if(!name)return;
    if(existingGroups.includes(name)){message.warning(`Group "${name}" already exists`);return;}
    const s=JSON.parse(localStorage.getItem("category-groups")||"{}");s[name]={name};localStorage.setItem("category-groups",JSON.stringify(s));
    setStubGroups(p=>[...new Set([...p,name])].sort());setGroupModalOpen(false);groupForm.resetFields();message.success(`Group "${name}" created`);
  }

  function handleDragStart(e:DragStartEvent){setActiveId(String(e.active.id));}

  async function handleDragEnd(e:{active:{id:string|number};over:{id:string|number}|null}){
    setActiveId(null);
    const {active,over}=e;if(!over||active.id===over.id)return;
    const aId=String(active.id),oId=String(over.id);
    if(oId.startsWith("group:")){
      const tg=oId.replace("group:","")||null;
      const cat=cats.find(c=>c.id===aId);if(!cat||cat.group===tg)return;
      await fetch(`/api/categories/${aId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({group:tg})});
      message.success(tg?`Moved to "${tg}"`:"Removed from group");await load();return;
    }
    const ac=cats.find(c=>c.id===aId),oc=cats.find(c=>c.id===oId);
    if(!ac||!oc)return;
    if(ac.group!==oc.group){
      await fetch(`/api/categories/${aId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({group:oc.group})});
      message.success(oc.group?`Moved to "${oc.group}"`:"Removed from group");await load();
    } else {
      setCats(prev=>{const ids=prev.map(c=>c.id);return arrayMove(prev,ids.indexOf(aId),ids.indexOf(oId));});
    }
  }

  function GroupedView(){
    const grouped:Record<string,Category[]>={};const ungrouped:Category[]=[];
    cats.forEach(c=>{if(c.group){grouped[c.group]=grouped[c.group]??[];grouped[c.group].push(c);}else ungrouped.push(c);});
    const groupNames=[...new Set([...Object.keys(grouped),...existingGroups])].sort();
    return (
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {groupNames.map(g=>{
          const gCats=grouped[g]??[];
          return (
            <div key={g} style={{borderRadius:10,border:"1px solid var(--border,#e5e7eb)",overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"var(--card,#fff)",borderBottom:gCats.length>0?"1px solid var(--border,#e5e7eb)":"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <FolderOutlined style={{color:"#6366f1"}} /><Text strong>{g}</Text>
                  <Badge count={gCats.length} style={{background:"#6366f1"}} />
                  <Text type="secondary" style={{fontSize:11}}>drag handle to reorder or move between groups</Text>
                </div>
                <Space size="small">
                  <GroupRenameBtn g={g} onRename={onRenameGroup} />
                  <Popconfirm title={`Remove group "${g}"?`} onConfirm={()=>onDeleteGroup(g)} okText="Remove" okButtonProps={{danger:true}}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </div>
              <div style={{padding:"8px 12px",background:"var(--card,#fff)"}}>
                <SortableContext items={gCats.map(c=>c.id)} strategy={verticalListSortingStrategy}>
                  <DroppableGroup groupId={g} isEmpty={gCats.length===0}>
                    {gCats.map(c=><SortableCatRow key={c.id} cat={c} onEdit={openEdit} onDelete={onDelete} />)}
                  </DroppableGroup>
                </SortableContext>
              </div>
            </div>
          );
        })}
        {ungrouped.length>0&&(
          <div style={{borderRadius:10,border:"1px solid var(--border,#e5e7eb)",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"var(--card,#fff)",borderBottom:"1px solid var(--border,#e5e7eb)"}}>
              <TagsOutlined style={{color:"#9ca3af"}} /><Text type="secondary" style={{fontWeight:600}}>Ungrouped</Text><Badge count={ungrouped.length} style={{background:"#9ca3af"}} />
            </div>
            <div style={{padding:"8px 12px",background:"var(--card,#fff)"}}>
              <SortableContext items={ungrouped.map(c=>c.id)} strategy={verticalListSortingStrategy}>
                <DroppableGroup groupId="" isEmpty={false}>
                  {ungrouped.map(c=><SortableCatRow key={c.id} cat={c} onEdit={openEdit} onDelete={onDelete} />)}
                </DroppableGroup>
              </SortableContext>
            </div>
          </div>
        )}
      </div>
    );
  }

  const activeCat=cats.find(c=>c.id===activeId);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <Title level={4} style={{margin:0}}>Categories</Title>
          <Space wrap>
            <Button.Group>
              <Button type={viewMode==="group"?"primary":"default"} icon={<FolderOutlined />} onClick={()=>setViewMode("group")}>By Group</Button>
              <Button type={viewMode==="type"?"primary":"default"} icon={<TagsOutlined />} onClick={()=>setViewMode("type")}>By Type</Button>
            </Button.Group>
            <Button icon={<FolderOutlined />} onClick={()=>{groupForm.resetFields();setGroupModalOpen(true);}}>New Group</Button>
            <Button icon={<RestOutlined />} onClick={()=>setShowTrash(v=>!v)} type={showTrash?"primary":"default"} danger={showTrash}>{showTrash?"Hide Trash":"Trash"}{deletedCats.length>0&&<span style={{marginLeft:6,background:"#ef4444",color:"#fff",borderRadius:999,padding:"1px 7px",fontSize:11}}>{deletedCats.length}</span>}</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Category</Button>
          </Space>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Tag color="default">{cats.length} total</Tag>
          <Tag color="green">{cats.filter(c=>c.type==="income").length} income</Tag>
          <Tag color="volcano">{cats.filter(c=>c.type==="expense").length} expense</Tag>
          <Tag color="purple">{existingGroups.length} groups</Tag>
        </div>
        {loading?<div style={{padding:24,textAlign:"center",color:"#9ca3af"}}>Loading...</div>:<GroupedView />}

        {showTrash&&(
          <div style={{marginTop:16,borderRadius:10,border:"2px dashed #fca5a5",overflow:"hidden"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"#fef2f2",borderBottom:deletedCats.length>0?"1px solid #fecaca":"none"}}>
              <RestOutlined style={{color:"#ef4444"}} />
              <Text strong style={{color:"#ef4444"}}>Trash</Text>
              <Text type="secondary" style={{fontSize:12}}>Deleted categories — restore any time</Text>
              {deletedCats.length===0&&<Text type="secondary" style={{fontSize:12,marginLeft:"auto"}}>Empty</Text>}
            </div>
            {deletedCats.map(cat=>(
              <div key={cat.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderBottom:"1px solid #fecaca",background:"#fff5f5",opacity:0.8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{width:10,height:10,borderRadius:"50%",background:cat.color,flexShrink:0}} />
                  <span style={{fontSize:16}}>{cat.icon}</span>
                  <Text style={{fontWeight:500,textDecoration:"line-through",color:"#6b7280"}}>{cat.name}</Text>
                  <Tag color={cat.type==="income"?"green":"volcano"} style={{opacity:0.6}}>{cat.type}</Tag>
                  {cat.group&&<Tag color="default" style={{opacity:0.6,fontSize:11}}>{cat.group}</Tag>}
                  <Text type="secondary" style={{fontSize:11}}>deleted {cat.deletedAt?new Date(cat.deletedAt).toLocaleDateString():""}</Text>
                </div>
                <Tooltip title="Restore category">
                  <Button size="small" type="default" icon={<UndoOutlined />} onClick={()=>onRestore(cat.id)}>Restore</Button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}

        <Modal title={<Space><TagsOutlined />{editing?"Edit Category":"Add Category"}</Space>} open={modalOpen} onCancel={()=>setModalOpen(false)} onOk={()=>form.submit()} destroyOnHidden okText={editing?"Save":"Create"}>
          <Form form={form} layout="vertical" onFinish={onSave} style={{marginTop:8}}>
            <Form.Item name="name" label="Category Name" rules={[{required:true}]}><Input placeholder="e.g. Coffee, Groceries" /></Form.Item>
            <Form.Item name="type" label="Type" rules={[{required:true}]}><Select options={TYPE_OPTIONS} placeholder="Select type" /></Form.Item>
            <Form.Item name="group" label={<span>Group <Text type="secondary" style={{fontSize:12}}>(optional)</Text></span>}>
              <Select showSearch allowClear placeholder="e.g. Food, Housing..." options={groupOptions} filterOption={(input,opt)=>(opt?.value as string??"").toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
            <div style={{display:"flex",gap:12}}>
              <Form.Item name="icon" label="Icon (emoji)" style={{flex:1}}><Input maxLength={2} placeholder="e.g. +" /></Form.Item>
              <Form.Item name="color" label="Color" style={{flex:2}}><Select options={COLOR_OPTIONS} /></Form.Item>
            </div>
          </Form>
        </Modal>

        <Modal title={<Space><FolderOutlined />Create New Group</Space>} open={groupModalOpen} onCancel={()=>setGroupModalOpen(false)} onOk={()=>groupForm.submit()} destroyOnHidden okText="Create Group">
          <Form form={groupForm} layout="vertical" onFinish={onCreateGroup} style={{marginTop:8}}>
            <Form.Item name="name" label="Group Name" rules={[{required:true,message:"Group name is required"}]}><Input placeholder="e.g. Food, Housing, Transport" autoFocus /></Form.Item>
          </Form>
        </Modal>

        <DragOverlay>{activeCat?<DragCard cat={activeCat} />:null}</DragOverlay>
      </div>
    </DndContext>
  );
}

function GroupRenameBtn({g,onRename}:{g:string;onRename:(old:string,nw:string)=>void}){
  const [val,setVal]=React.useState(g);
  return (
    <Popconfirm
      title={<div style={{width:220}}><div style={{fontWeight:600,marginBottom:6}}>Rename group</div><Input defaultValue={g} onChange={e=>setVal(e.target.value)} onPressEnter={()=>onRename(g,val)} /></div>}
      onConfirm={()=>onRename(g,val)} okText="Rename" icon={<EditOutlined />}
    >
      <Button size="small" type="text" icon={<EditOutlined />} />
    </Popconfirm>
  );
}
