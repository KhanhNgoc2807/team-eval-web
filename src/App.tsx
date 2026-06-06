import { useState, useMemo, useEffect, useRef } from "react";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const COMPLEXITY = { 1: { label: "Nhẹ", color: "#22c55e", pts: 1 }, 2: { label: "Trung bình", color: "#f59e0b", pts: 2 }, 3: { label: "Nặng", color: "#ef4444", pts: 3 } };
const STATUS = { todo: { label: "Chưa làm", pct: 0, color: "#64748b" }, doing: { label: "Đang làm", pct: 0.5, color: "#f59e0b" }, done: { label: "Hoàn thành", pct: 1, color: "#22c55e" } };
const PEER_CRITERIA = ["Chất lượng công việc", "Chủ động & Đúng tiến độ", "Tinh thần hợp tác"];
const LEADER_CRITERIA = ["Chủ động & Trách nhiệm", "Chất lượng Output", "Phối hợp Nhóm"];
const RATING_OPTIONS = [
  { value: 0, label: "—" },
  { value: 2, label: "2 – Chưa đạt" },
  { value: 6, label: "6 – Trung bình" },
  { value: 8, label: "8 – Tốt" },
  { value: 9, label: "9 – Rất tốt" },
  { value: 10, label: "10 – Xuất sắc" },
];
const MEMBER_COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7","#e11d48","#0ea5e9","#22c55e","#eab308"];
const TABS = [
  { id: "setup", icon: "⚙️", label: "Thiết lập" },
  { id: "tasks", icon: "📋", label: "Công việc" },
  { id: "peer", icon: "👥", label: "Đánh giá đồng đội" },
  { id: "leader", icon: "👑", label: "Đánh giá trưởng nhóm" },
  { id: "schedule", icon: "📅", label: "Họp nhóm" },
  { id: "analysis", icon: "📊", label: "Phân tích" },
  { id: "result", icon: "🏆", label: "Kết quả" },
];
const uid = () => Math.random().toString(36).substring(2, 9);
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// ─── JSONBIN STORAGE (thực sự cross-browser/cross-device) ─────────────────────
// Dùng JSONBin.io - free public REST API lưu JSON, không cần đăng ký
const JSONBIN_BASE = "https://api.jsonbin.io/v3/b";
// API key public (rate limit 10k req/month - đủ cho nhóm nhỏ)
// Không có key thì vẫn dùng được với public bin
const BIN_HEADERS = {
  "Content-Type": "application/json",
  "X-Bin-Private": "false", // bin công khai, ai có ID đều đọc được
};

const remoteStorage = {
  async create(data) {
    const res = await fetch(JSONBIN_BASE, {
      method: "POST",
      headers: { ...BIN_HEADERS, "X-Bin-Name": "teameval" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể tạo bin");
    const json = await res.json();
    return json.metadata.id; // binId
  },
  async save(binId, data) {
    const res = await fetch(`${JSONBIN_BASE}/${binId}`, {
      method: "PUT",
      headers: BIN_HEADERS,
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Không thể lưu");
  },
  async load(binId) {
    const res = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
      headers: { "X-Bin-Meta": "false" }, // chỉ lấy data, không lấy metadata
    });
    if (!res.ok) return null;
    return await res.json();
  },
};

// ─── THEME ────────────────────────────────────────────────────────────────────
const getInitialTheme = () => {
  try { const s = localStorage.getItem("theme"); if (s) return s; } catch(e) {}
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};
const T = {
  dark:  { bg:"#0a0a10", cardBg:"#13131a", border:"#1e2235", text:"#e2e8f0", muted:"#475569", hdr:"linear-gradient(135deg,#0f0c29,#1a1040,#0f0c29)", inp:"#0a0a10" },
  light: { bg:"#f3f4f6", cardBg:"#ffffff", border:"#e2e8f0", text:"#1e293b", muted:"#64748b", hdr:"linear-gradient(135deg,#e0e7ff,#c7d2fe,#e0e7ff)", inp:"#ffffff" },
};

// ─── BASE COMPONENTS ──────────────────────────────────────────────────────────
function Tag({ color, children, style={} }) {
  return <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:6, padding:"2px 10px", fontSize:12, fontWeight:700, ...style }}>{children}</span>;
}
function Card({ children, style={}, theme }) {
  const s = T[theme];
  return <div className="card" style={{ background:s.cardBg, border:`1px solid ${s.border}`, borderRadius:16, padding:24, ...style }}>{children}</div>;
}
function Btn({ children, onClick, variant="primary", style={}, disabled=false, theme }) {
  const base = { border:"none", borderRadius:10, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", transition:"all .15s", opacity:disabled?0.4:1 };
  const vars = {
    primary: { background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff" },
    ghost:   { background:"transparent", border:`1px solid ${T[theme].border}`, color:T[theme].muted },
    danger:  { background:"#450a0a", color:"#fca5a5", border:"1px solid #7f1d1d" },
    success: { background:"#052e16", color:"#86efac", border:"1px solid #166534" },
  };
  return <button onClick={disabled?undefined:onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}
function Inp({ value, onChange, placeholder, style={}, type="text", onKeyDown, theme }) {
  const s = T[theme];
  return <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
    style={{ background:s.inp, border:`1px solid ${s.border}`, borderRadius:10, padding:"10px 14px", color:s.text, fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", boxSizing:"border-box", ...style }}
    onFocus={e=>e.currentTarget.style.borderColor="#6366f1"} onBlur={e=>e.currentTarget.style.borderColor=s.border} onKeyDown={onKeyDown} />;
}
function Sel({ value, onChange, children, style={}, theme }) {
  const s = T[theme];
  return <select value={value||""} onChange={e=>onChange(e.target.value)} style={{ background:s.inp, border:`1px solid ${s.border}`, borderRadius:10, padding:"10px 14px", color:value?s.text:s.muted, fontSize:14, outline:"none", fontFamily:"inherit", width:"100%", cursor:"pointer", ...style }}>{children}</select>;
}
function RatingSel({ value, onChange, theme }) {
  const s = T[theme];
  return <select value={value??0} onChange={e=>onChange(Number(e.target.value))} style={{ background:s.inp, border:`1px solid ${s.border}`, borderRadius:8, padding:"7px 10px", color:s.text, fontSize:13, outline:"none", fontFamily:"inherit", cursor:"pointer", width:"100%" }}>
    {RATING_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}
function Bar({ value, max, color="#6366f1" }) {
  const pct = max>0 ? Math.min((value/max)*100,100) : 0;
  return <div style={{ height:8, background:"#1e2235", borderRadius:4, overflow:"hidden" }}><div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${color},${color}99)`, borderRadius:4, transition:"width .5s ease" }} /></div>;
}
const lbl = { fontSize:11, color:"#475569", display:"block", marginBottom:6, fontWeight:700, letterSpacing:1, textTransform:"uppercase" };
const fbtn = (theme) => ({ padding:"6px 14px", borderRadius:20, border:`1px solid ${T[theme].border}`, background:"transparent", color:T[theme].muted, fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6, transition:"all .15s" });
const fact = { borderColor:"#6366f1", color:"#a5b4fc", background:"#1e1b4b" };

// ─── SYNC STATUS ──────────────────────────────────────────────────────────────
function SyncBadge({ status }) {
  const map = {
    idle:    { color:"#475569", text:"Đã lưu", icon:"☁️" },
    saving:  { color:"#f59e0b", text:"Đang lưu...", icon:"⏳" },
    saved:   { color:"#22c55e", text:"Lưu cloud ✓", icon:"☁️" },
    error:   { color:"#ef4444", text:"Lỗi! Thử lại", icon:"⚠️" },
    loading: { color:"#6366f1", text:"Đang tải...", icon:"⏳" },
  };
  const c = map[status]||map.idle;
  return <div style={{ fontSize:11, color:c.color, display:"flex", alignItems:"center", gap:4, padding:"4px 8px", borderRadius:6, background:c.color+"15" }}><span>{c.icon}</span><span>{c.text}</span></div>;
}

function showToast(msg, color="#22c55e") {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;bottom:20px;right:20px;background:${color};color:white;padding:12px 24px;border-radius:8px;z-index:10000;font-family:DM Sans,sans-serif;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.3)`;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

// ─── SCHEDULE TAB ─────────────────────────────────────────────────────────────
function ScheduleTab({ members, scheduleSlots, setScheduleSlots, scheduleSelections, setScheduleSelections, theme }) {
  const s = T[theme];
  const [date, setDate] = useState(""); const [start, setStart] = useState(""); const [end, setEnd] = useState("");
  const [selMember, setSelMember] = useState(""); const [showForm, setShowForm] = useState(false); const [copied, setCopied] = useState(false);

  const addSlot = () => {
    if (!date||!start||!end) return;
    setScheduleSlots(p=>[...p, { id:uid(), date, start, end, label:`${new Date(date).toLocaleDateString("vi-VN")} - ${start}→${end}` }]);
    setDate(""); setStart(""); setEnd(""); setShowForm(false);
  };
  const delSlot = (id) => {
    setScheduleSlots(p=>p.filter(x=>x.id!==id));
    const n={...scheduleSelections}; Object.keys(n).forEach(m=>{ if(n[m][id]) delete n[m][id]; }); setScheduleSelections(n);
  };
  const toggle = (slotId) => {
    if (!selMember) return;
    setScheduleSelections(p=>({...p,[selMember]:{...(p[selMember]||{}),[slotId]:!(p[selMember]?.[slotId]||false)}}));
  };
  const totals = useMemo(()=>{
    const t={};
    scheduleSlots.forEach(sl=>{ let c=0; members.forEach(m=>{ if(scheduleSelections[m.id]?.[sl.id]) c++; }); t[sl.id]=c; });
    return t;
  },[scheduleSlots,scheduleSelections,members]);
  const best = useMemo(()=>{
    if (!scheduleSlots.length) return null;
    let b=scheduleSlots[0],bc=0;
    scheduleSlots.forEach(sl=>{ if(totals[sl.id]>bc){bc=totals[sl.id];b=sl;} });
    return {slot:b,count:bc,total:members.length};
  },[scheduleSlots,totals,members]);

  return (
    <Card theme={theme} style={{marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <h3 style={{margin:0,fontSize:15,color:"#a5b4fc"}}>📅 KHẢO SÁT LỊCH RẢNH</h3>
        <Btn onClick={()=>setShowForm(!showForm)} variant="ghost" theme={theme}>{showForm?"✖ Đóng":"+ Thêm khung giờ"}</Btn>
      </div>
      {showForm&&<div style={{background:s.inp,borderRadius:12,padding:16,marginBottom:16}}>
        <div className="sched-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:12,alignItems:"end"}}>
          <div><label style={lbl}>Ngày</label><Inp type="date" value={date} onChange={setDate} theme={theme}/></div>
          <div><label style={lbl}>Từ giờ</label><Inp type="time" value={start} onChange={setStart} theme={theme}/></div>
          <div><label style={lbl}>Đến giờ</label><Inp type="time" value={end} onChange={setEnd} theme={theme}/></div>
          <Btn onClick={addSlot} theme={theme}>Thêm</Btn>
        </div>
      </div>}
      {scheduleSlots.length===0?(
        <div style={{textAlign:"center",padding:40,color:s.muted}}><div style={{fontSize:48,marginBottom:12}}>📅</div><div>Chưa có khung giờ. Thêm khung giờ để cả nhóm chọn.</div></div>
      ):(
        <>
          <div style={{marginBottom:20}}><label style={lbl}>Bạn là:</label>
            <Sel value={selMember} onChange={setSelMember} theme={theme} style={{maxWidth:300}}>
              <option value="">Chọn tên của bạn...</option>
              {members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </Sel>
          </div>
          {selMember&&<div style={{overflowX:"auto",marginBottom:24}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
              <thead><tr style={{borderBottom:`1px solid ${s.border}`}}>
                <th style={{textAlign:"left",padding:12}}>Khung giờ</th>
                <th style={{textAlign:"center",padding:12}}>Rảnh?</th>
                <th style={{textAlign:"center",padding:12}}>Số người rảnh</th>
                <th style={{textAlign:"center",padding:12}}></th>
              </tr></thead>
              <tbody>{scheduleSlots.map(sl=>(
                <tr key={sl.id} style={{borderBottom:`1px solid ${s.border}`}}>
                  <td style={{padding:12}}>{sl.label}</td>
                  <td style={{textAlign:"center",padding:12}}>
                    <button onClick={()=>toggle(sl.id)} style={{width:32,height:32,borderRadius:8,background:scheduleSelections[selMember]?.[sl.id]?"#22c55e":s.inp,border:`1px solid ${scheduleSelections[selMember]?.[sl.id]?"#22c55e":s.border}`,cursor:"pointer",color:scheduleSelections[selMember]?.[sl.id]?"#fff":s.muted}}>
                      {scheduleSelections[selMember]?.[sl.id]?"✓":"○"}
                    </button>
                  </td>
                  <td style={{textAlign:"center",padding:12}}><span style={{fontWeight:700,color:"#22c55e"}}>{totals[sl.id]}</span>/{members.length}</td>
                  <td style={{textAlign:"center",padding:12}}><button onClick={()=>delSlot(sl.id)} style={{background:"none",border:"none",color:s.muted,cursor:"pointer",fontSize:18}}>🗑️</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>}
          {best&&best.count>0&&<div style={{background:"#1e1b4b",borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:13,color:"#a5b4fc",marginBottom:4}}>🏆 KHUNG GIỜ ĐƯỢC CHỌN NHIỀU NHẤT</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fcd34d"}}>{best.slot.label}</div>
            <div style={{fontSize:13,color:"#818cf8"}}>{best.count}/{best.total} người rảnh</div>
          </div>}
          <div>{scheduleSlots.map(sl=>{
            const av=members.filter(m=>scheduleSelections[m.id]?.[sl.id]);
            return <div key={sl.id} style={{marginBottom:12,padding:12,background:s.inp,borderRadius:10}}>
              <div style={{fontWeight:600,marginBottom:6}}>{sl.label}</div>
              <div style={{fontSize:13,color:av.length>0?"#22c55e":s.muted}}>{av.length>0?`✅ ${av.map(m=>m.name).join(", ")}`:"❌ Chưa có ai rảnh"}</div>
            </div>;
          })}</div>
        </>
      )}
    </Card>
  );
}

// ─── SETUP TAB ────────────────────────────────────────────────────────────────
function SetupTab({ members, setMembers, projectName, setProjectName, leader, setLeader, theme }) {
  const [name, setName] = useState(""); const [mssv, setMssv] = useState("");
  const s = T[theme];
  const add = () => { if (!name.trim()) return; setMembers(m=>[...m,{id:uid(),name:name.trim(),mssv:mssv.trim()}]); setName(""); setMssv(""); };
  return (
    <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
      <Card theme={theme}>
        <h3 style={{margin:"0 0 20px",fontSize:15,color:"#a5b4fc",fontFamily:"'Space Mono',monospace"}}>⚙️ THIẾT LẬP</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div><label style={lbl}>Tên dự án / môn học</label><Inp value={projectName} onChange={setProjectName} placeholder="VD: Dự án Marketing" theme={theme}/></div>
          <div><label style={lbl}>Trưởng nhóm</label><Sel value={leader} onChange={setLeader} theme={theme}><option value="">Chọn trưởng nhóm...</option>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</Sel></div>
        </div>
        <div style={{marginTop:20,padding:16,background:s.inp,borderRadius:12,fontSize:13,color:s.muted,lineHeight:1.8}}>
          <div style={{color:"#a5b4fc",fontWeight:700,marginBottom:8}}>📐 CÔNG THỨC TÍNH ĐIỂM</div>
          <div>Thành viên = <b style={{color:"#6366f1"}}>CV×40%</b> + <b style={{color:"#22c55e"}}>Đồng đội×40%</b> + <b style={{color:"#f59e0b"}}>Trưởng nhóm×20%</b></div>
          <div>Trưởng nhóm = <b style={{color:"#6366f1"}}>CV×40%</b> + <b style={{color:"#22c55e"}}>Đồng đội×60%</b></div>
        </div>
      </Card>
      <Card theme={theme}>
        <h3 style={{margin:"0 0 20px",fontSize:15,color:"#a5b4fc",fontFamily:"'Space Mono',monospace"}}>👥 DANH SÁCH THÀNH VIÊN</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,marginBottom:16}}>
          <Inp value={name} onChange={setName} placeholder="Họ và tên" onKeyDown={e=>e.key==="Enter"&&add()} theme={theme}/>
          <Inp value={mssv} onChange={setMssv} placeholder="MSSV" onKeyDown={e=>e.key==="Enter"&&add()} theme={theme}/>
          <Btn onClick={add} theme={theme}>Thêm</Btn>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:380,overflowY:"auto"}}>
          {members.length===0&&<div style={{textAlign:"center",padding:40,color:s.muted}}>Chưa có thành viên</div>}
          {members.map((m,i)=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:12,background:s.inp,borderRadius:10,padding:"10px 14px"}}>
              <div style={{width:32,height:32,borderRadius:8,background:MEMBER_COLORS[i%MEMBER_COLORS.length]+"22",border:`2px solid ${MEMBER_COLORS[i%MEMBER_COLORS.length]}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:MEMBER_COLORS[i%MEMBER_COLORS.length],flexShrink:0}}>
                {m.name.split(" ").pop().charAt(0)}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:600,color:s.text}}>{m.name}</div>
                {m.mssv&&<div style={{fontSize:11,color:s.muted}}>MSSV: {m.mssv}</div>}
              </div>
              {leader===m.id&&<Tag color="#f59e0b">Trưởng nhóm</Tag>}
              <button onClick={()=>setMembers(ms=>ms.filter(x=>x.id!==m.id))} style={{background:"none",border:"none",color:s.muted,cursor:"pointer",fontSize:18}}>×</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TASK TAB ─────────────────────────────────────────────────────────────────
function TaskTab({ members, tasks, setTasks, theme }) {
  const [form, setForm] = useState({name:"",assignees:[],deadline:"",complexity:2});
  const [filter, setFilter] = useState("all"); const [showForm, setShowForm] = useState(false);
  const s = T[theme];
  const add = () => {
    if (!form.name.trim()||form.assignees.length===0) return;
    setTasks(t=>[...t,{id:uid(),name:form.name,assignees:form.assignees,deadline:form.deadline,complexity:form.complexity,status:"todo"}]);
    setForm({name:"",assignees:[],deadline:"",complexity:2}); setShowForm(false);
  };
  const toggleA = (id) => setForm(f=>({...f,assignees:f.assignees.includes(id)?f.assignees.filter(x=>x!==id):[...f.assignees,id]}));
  const cycle = (id) => { const o=["todo","doing","done"]; setTasks(ts=>ts.map(t=>t.id!==id?t:{...t,status:o[(o.indexOf(t.status)+1)%3]})); };
  const filtered = filter==="all"?tasks:tasks.filter(t=>t.assignees?.includes(filter));
  const overdue = (t) => { if (!t.deadline||t.status==="done") return false; const d=new Date(); d.setHours(0,0,0,0); return new Date(t.deadline+"T00:00:00")<d; };
  const bs = fbtn(theme);
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{flex:1,display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setFilter("all")} style={{...bs,...(filter==="all"?fact:{})}}>Tất cả ({tasks.length})</button>
          {members.map(m=>{const mc=MEMBER_COLORS[members.indexOf(m)%MEMBER_COLORS.length]; return(
            <button key={m.id} onClick={()=>setFilter(filter===m.id?"all":m.id)} style={{...bs,...(filter===m.id?{borderColor:mc,color:mc,background:mc+"18"}:{})}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:mc,display:"inline-block"}}/>
              <span className="hide-mobile">{m.name.split(" ").pop()}</span>
              <span> ({tasks.filter(t=>t.assignees?.includes(m.id)).length})</span>
            </button>
          );})}
        </div>
        <Btn onClick={()=>setShowForm(true)} theme={theme}>+ Thêm công việc</Btn>
      </div>
      {showForm&&<Card style={{marginBottom:20,borderColor:"#312e81"}} theme={theme}>
        <div className="task-grid" style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr auto",gap:12,alignItems:"end"}}>
          <div><label style={lbl}>Tên công việc *</label><Inp value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Mô tả ngắn..." theme={theme}/></div>
          <div><label style={lbl}>Giao cho *</label>
            <div style={{display:"flex",flexDirection:"column",gap:6,background:s.inp,border:`1px solid ${s.border}`,borderRadius:10,padding:10,maxHeight:180,overflowY:"auto"}}>
              {members.length===0&&<span style={{color:s.muted,fontSize:13}}>Chưa có thành viên</span>}
              {members.map(m=>(
                <button key={m.id} type="button" onClick={()=>toggleA(m.id)} style={{padding:"8px 10px",borderRadius:8,border:`1px solid ${form.assignees.includes(m.id)?"#22c55e":s.border}`,background:form.assignees.includes(m.id)?"#22c55e22":"transparent",color:form.assignees.includes(m.id)?"#22c55e":s.text,cursor:"pointer",fontSize:13,textAlign:"left"}}>
                  {form.assignees.includes(m.id)?"✓ ":"○ "}{m.name}
                </button>
              ))}
            </div>
          </div>
          <div><label style={lbl}>Hạn chót</label><Inp type="date" value={form.deadline} onChange={v=>setForm(f=>({...f,deadline:v}))} theme={theme}/></div>
          <div><label style={lbl}>Độ khó</label>
            <div style={{display:"flex",gap:6}}>
              {[1,2,3].map(v=><button key={v} onClick={()=>setForm(f=>({...f,complexity:v}))} style={{flex:1,padding:"10px 4px",borderRadius:8,border:`1px solid ${form.complexity===v?COMPLEXITY[v].color:s.border}`,background:form.complexity===v?COMPLEXITY[v].color+"22":"transparent",color:form.complexity===v?COMPLEXITY[v].color:s.muted,fontSize:12,fontWeight:700,cursor:"pointer"}}>Cấp {v}</button>)}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn onClick={()=>setShowForm(false)} variant="ghost" theme={theme}>Hủy</Btn>
          <Btn onClick={add} theme={theme}>✓ Thêm</Btn>
        </div>
      </Card>}
      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"80px 0",color:s.muted}}><div style={{fontSize:48,marginBottom:12}}>📋</div><div style={{fontSize:16,fontWeight:600}}>Chưa có công việc</div></div>
      ):(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
          {filtered.map(t=>{
            const am=members.filter(m=>t.assignees?.includes(m.id));
            const sc=STATUS[t.status]; const od=overdue(t);
            return <div key={t.id} style={{background:s.cardBg,border:`1px solid ${t.status==="done"?"#166534":od?"#7f1d1d":s.border}`,borderRadius:14,padding:18}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:12,gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {am.map(m=><span key={m.id} style={{background:MEMBER_COLORS[members.indexOf(m)%MEMBER_COLORS.length]+"22",color:MEMBER_COLORS[members.indexOf(m)%MEMBER_COLORS.length],border:`1px solid ${MEMBER_COLORS[members.indexOf(m)%MEMBER_COLORS.length]}44`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:600}}>{m.name.split(" ").pop()}</span>)}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <Tag color={COMPLEXITY[t.complexity].color}>Cấp {t.complexity}</Tag>
                  <button onClick={()=>setTasks(ts=>ts.filter(x=>x.id!==t.id))} style={{background:"none",border:"none",color:s.muted,cursor:"pointer",fontSize:18}}>×</button>
                </div>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:t.status==="done"?"#4ade80":s.text,textDecoration:t.status==="done"?"line-through":"none",marginBottom:8}}>{t.name}</div>
              {t.deadline&&<div style={{fontSize:12,color:od?"#f87171":s.muted,marginBottom:10}}>{od?"⚠️ Quá hạn: ":"📅 Hạn: "}{new Date(t.deadline+"T00:00:00").toLocaleDateString("vi-VN")}</div>}
              <button onClick={()=>cycle(t.id)} style={{width:"100%",padding:"9px 0",borderRadius:9,border:`1px solid ${sc.color}44`,background:sc.color+"18",color:sc.color,fontSize:13,fontWeight:600,cursor:"pointer"}}>{sc.label} → Nhấn để đổi</button>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}

// ─── PEER TAB ─────────────────────────────────────────────────────────────────
function PeerTab({ members, peerScores, setPeerScores, theme, onRefresh }) {
  const [reviewer, setReviewer] = useState(""); const [temp, setTemp] = useState({});
  const s = T[theme];
  const reviewees = members.filter(m=>m.id!==reviewer);
  const getT = (rid,c) => temp[rid]?.[c]??0;
  const setT = (rid,c,v) => setTemp(p=>({...p,[rid]:{...(p[rid]||{}),[c]:v}}));
  const submit = () => {
    const allDone = reviewees.every(r=>PEER_CRITERIA.every(c=>getT(r.id,c)>0));
    if (!allDone){alert("Vui lòng đánh giá đầy đủ tất cả tiêu chí!"); return;}
    setPeerScores(prev=>{
      const next={...prev};
      reviewees.forEach(r=>{ PEER_CRITERIA.forEach(c=>{ const sc=getT(r.id,c); if(sc>0){if(!next[r.id])next[r.id]={}; if(!next[r.id][c])next[r.id][c]=[]; next[r.id][c].push(sc);} }); });
      next[reviewer]={...next[reviewer],completed:true};
      return next;
    });
    setTemp({}); setReviewer("");
    showToast("✅ Đã gửi! Data tự động lưu cloud. Thành viên khác bấm 🔄 để xem.");
  };
  const done = Object.keys(peerScores).filter(k=>peerScores[k]?.completed===true).length;
  if (members.length<2) return <div style={{textAlign:"center",padding:80,color:s.muted}}><div style={{fontSize:48}}>👥</div><div>Cần ít nhất 2 thành viên</div></div>;
  return (
    <div>
      <Card theme={theme} style={{marginBottom:20,background:"#0c2a1a",borderColor:"#166534"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#22c55e"}}>☁️ ĐỒNG BỘ CLOUD (JSONBin)</div>
            <div style={{fontSize:12,color:s.muted}}>Data lưu trên cloud qua JSONBin.io. Mở cùng link → cùng data.</div>
          </div>
          <Btn onClick={onRefresh} variant="success" theme={theme}>🔄 Tải dữ liệu mới nhất</Btn>
        </div>
      </Card>
      <Card style={{marginBottom:20}} theme={theme}>
        <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
          <div style={{fontSize:14,color:s.muted,fontWeight:600}}>Bạn là:</div>
          <div style={{flex:1,minWidth:200}}>
            <Sel value={reviewer} onChange={v=>{ if(peerScores[v]?.completed){alert("Bạn đã đánh giá rồi!"); return;} setReviewer(v); }} theme={theme}>
              <option value="">Chọn tên của bạn...</option>
              {members.map(m=><option key={m.id} value={m.id} disabled={peerScores[m.id]?.completed===true}>{m.name} {peerScores[m.id]?.completed?"(✅ Đã đánh giá)":""}</option>)}
            </Sel>
          </div>
          <div style={{fontSize:13,color:s.muted}}>📊 <b style={{color:"#22c55e"}}>{done}</b>/{members.length} người đã đánh giá</div>
        </div>
        <div style={{marginTop:16,padding:12,background:"#1e1b4b",borderRadius:10,fontSize:13,color:"#818cf8"}}>
          🔒 <b>Ẩn danh hoàn toàn</b>: Sau khi gửi, tên bạn biến mất.
        </div>
      </Card>
      {done===members.length&&members.length>0&&<Card theme={theme} style={{textAlign:"center",background:"#0c2a1a",borderColor:"#166534",marginBottom:20}}>
        <div style={{fontSize:48,marginBottom:12}}>🎉</div>
        <div style={{fontSize:16,fontWeight:700,color:"#86efac"}}>Tất cả thành viên đã đánh giá xong!</div>
      </Card>}
      {reviewer&&!peerScores[reviewer]?.completed&&<>
        <Card theme={theme} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div><span style={{fontSize:14,color:"#a5b4fc"}}>👤 Đang đánh giá: </span><span style={{fontSize:14,fontWeight:700,color:s.text}}>{members.find(m=>m.id===reviewer)?.name}</span></div>
            <Btn onClick={()=>{setReviewer("");setTemp({});}} variant="ghost" theme={theme}>↺ Thoát</Btn>
          </div>
        </Card>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {reviewees.map(r=>{
            const mc=MEMBER_COLORS[members.indexOf(r)%MEMBER_COLORS.length];
            const done=PEER_CRITERIA.every(c=>getT(r.id,c)>0);
            return <Card key={r.id} style={{borderColor:done?"#22c55e44":s.border}} theme={theme}>
              <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
                <div style={{width:40,height:40,borderRadius:10,background:mc+"22",border:`2px solid ${mc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:mc}}>{r.name.split(" ").pop().charAt(0)}</div>
                <div style={{flex:1}}><div style={{fontSize:15,fontWeight:700,color:s.text}}>{r.name}</div>{done&&<div style={{fontSize:11,color:"#22c55e"}}>✓ Đã đánh giá</div>}</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                {PEER_CRITERIA.map(c=><div key={c}><div style={{fontSize:12,color:s.muted,marginBottom:8}}>{c}</div><RatingSel value={getT(r.id,c)} onChange={v=>setT(r.id,c,v)} theme={theme}/></div>)}
              </div>
            </Card>;
          })}
        </div>
        <div style={{textAlign:"center",marginTop:24}}>
          <Btn onClick={submit} variant="success" theme={theme} disabled={!reviewees.every(r=>PEER_CRITERIA.every(c=>getT(r.id,c)>0))} style={{padding:"12px 32px",fontSize:16}}>
            🔒 Gửi đánh giá (ẩn danh)
          </Btn>
        </div>
      </>}
    </div>
  );
}

// ─── LEADER TAB ───────────────────────────────────────────────────────────────
function LeaderTab({ members, leader, leaderScores, setLeaderScores, theme }) {
  const lm = members.find(m=>m.id===leader);
  const s = T[theme];
  const getScore = (mid,c) => leaderScores?.[mid]?.[c]??0;
  const setScore = (mid,c,v) => setLeaderScores(ls=>({...ls,[mid]:{...(ls[mid]||{}),[c]:v}}));
  if (!leader) return <div style={{textAlign:"center",padding:80,color:s.muted}}><div style={{fontSize:48}}>👑</div><div>Chưa chọn trưởng nhóm</div></div>;
  const others = members.filter(m=>m.id!==leader);
  if (others.length===0) return <div style={{textAlign:"center",padding:80,color:s.muted}}><div style={{fontSize:48}}>👥</div><div>Nhóm chỉ có trưởng nhóm</div></div>;
  return (
    <div>
      <Card style={{marginBottom:20,borderColor:"#451a03"}} theme={theme}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{fontSize:28}}>👑</div>
          <div><div style={{fontSize:15,fontWeight:700,color:"#fcd34d"}}>Trưởng nhóm: {lm?.name}</div><div style={{fontSize:13,color:"#92400e"}}>Đánh giá {others.length} thành viên</div></div>
        </div>
      </Card>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {others.map(m=>{
          const mc=MEMBER_COLORS[members.indexOf(m)%MEMBER_COLORS.length];
          const mAvg=avg(LEADER_CRITERIA.map(c=>getScore(m.id,c)).filter(x=>x>0));
          return <Card key={m.id} theme={theme}>
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16,flexWrap:"wrap"}}>
              <div style={{width:38,height:38,borderRadius:9,background:mc+"22",border:`2px solid ${mc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:mc}}>{m.name.split(" ").pop().charAt(0)}</div>
              <div style={{flex:1,fontSize:14,fontWeight:600,color:s.text}}>{m.name}</div>
              {mAvg>0&&<Tag color={mAvg>=8?"#22c55e":mAvg>=6?"#f59e0b":"#ef4444"}>TB: {mAvg.toFixed(1)}</Tag>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {LEADER_CRITERIA.map(c=><div key={c}><div style={{fontSize:12,color:s.muted,marginBottom:8}}>{c}</div><RatingSel value={getScore(m.id,c)} onChange={v=>setScore(m.id,c,v)} theme={theme}/></div>)}
            </div>
          </Card>;
        })}
      </div>
    </div>
  );
}

// ─── ANALYSIS TAB ─────────────────────────────────────────────────────────────
function AnalysisTab({ members, tasks, peerScores, leaderScores, leader, theme }) {
  const s = T[theme];
  const getMScores = (mid) => {
    const sc={...Object.fromEntries(PEER_CRITERIA.map(c=>[c,[]]))};
    PEER_CRITERIA.forEach(c=>{ const a=peerScores[mid]?.[c]; if(a&&Array.isArray(a)) sc[c].push(...a); });
    if(leaderScores[mid]){
      if(leaderScores[mid]["Chủ động & Trách nhiệm"]) sc["Chủ động & Đúng tiến độ"].push(leaderScores[mid]["Chủ động & Trách nhiệm"]);
      if(leaderScores[mid]["Chất lượng Output"]) sc["Chất lượng công việc"].push(leaderScores[mid]["Chất lượng Output"]);
      if(leaderScores[mid]["Phối hợp Nhóm"]) sc["Tinh thần hợp tác"].push(leaderScores[mid]["Phối hợp Nhóm"]);
    }
    return Object.fromEntries(PEER_CRITERIA.map(c=>[c,sc[c].length>0?avg(sc[c]):0]));
  };
  const teamAvg = useMemo(()=>{
    const tot=Object.fromEntries(PEER_CRITERIA.map(c=>[c,0])),cnt=Object.fromEntries(PEER_CRITERIA.map(c=>[c,0]));
    members.forEach(m=>{ const sc=getMScores(m.id); PEER_CRITERIA.forEach(c=>{ if(sc[c]>0){tot[c]+=sc[c];cnt[c]++;} }); });
    return Object.fromEntries(PEER_CRITERIA.map(c=>[c,cnt[c]>0?tot[c]/cnt[c]:0]));
  },[members,peerScores,leaderScores]);
  const level = (n) => n>=8.5?{text:"Xuất sắc",color:"#22c55e",icon:"⭐"}:n>=7?{text:"Tốt",color:"#22c55e",icon:"🟢"}:n>=5?{text:"Trung bình",color:"#f59e0b",icon:"🟡"}:{text:"Cần cải thiện",color:"#ef4444",icon:"🔴"};
  const suggest = (c,n) => {
    if(n>=7) return null;
    const m={"Chất lượng công việc":"📌 Review kỹ, học hỏi từ người giỏi hơn","Chủ động & Đúng tiến độ":"📌 Báo cáo thường xuyên, chia nhỏ task, đặt reminder","Tinh thần hợp tác":"📌 Hỗ trợ đồng đội, phản hồi nhanh, tham gia đầy đủ"};
    return m[c]||"📌 Cần cải thiện tiêu chí này";
  };
  const worst = Object.entries(teamAvg).reduce((a,b)=>a[1]<b[1]?a:b);
  return (
    <div>
      <Card theme={theme} style={{marginBottom:24}}>
        <h3 style={{margin:"0 0 20px",fontSize:15,color:"#a5b4fc",fontFamily:"'Space Mono',monospace"}}>📈 THỐNG KÊ CẢ NHÓM</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${s.border}`}}>
              <th style={{textAlign:"left",padding:12}}>Tiêu chí</th>
              <th style={{textAlign:"center",padding:12}}>Điểm TB</th>
              <th style={{textAlign:"center",padding:12}}>Đánh giá</th>
              <th style={{textAlign:"center",padding:12}}>Trạng thái</th>
            </tr></thead>
            <tbody>{PEER_CRITERIA.map(c=>{ const sc=teamAvg[c],lv=level(sc); return(
              <tr key={c} style={{borderBottom:`1px solid ${s.border}`}}>
                <td style={{padding:12}}>{c}</td>
                <td style={{textAlign:"center",padding:12,fontWeight:700,fontSize:16}}>{sc.toFixed(1)}</td>
                <td style={{textAlign:"center",padding:12,color:lv.color}}>{lv.icon} {lv.text}</td>
                <td style={{textAlign:"center",padding:12}}>{sc<7?<span style={{color:"#ef4444"}}>🔴 CẦN CẢI THIỆN</span>:<span style={{color:"#22c55e"}}>✅ Tốt</span>}</td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
        {worst[1]<7&&<div style={{marginTop:20,padding:16,background:"#1e1b4b",borderRadius:12}}>
          <div style={{fontWeight:700,marginBottom:8,color:"#fcd34d"}}>🎯 KHUYẾN NGHỊ</div>
          <div style={{fontSize:14,color:s.text}}>Nhóm cần cải thiện <b style={{color:"#f59e0b"}}>"{worst[0]}"</b> ({worst[1].toFixed(1)}/10)</div>
        </div>}
      </Card>
      <h3 style={{fontSize:15,color:"#a5b4fc",marginBottom:16}}>👤 PHÂN TÍCH TỪNG THÀNH VIÊN</h3>
      <div style={{display:"flex",flexDirection:"column",gap:20}}>
        {members.map(m=>{
          const sc=getMScores(m.id),mc=MEMBER_COLORS[members.indexOf(m)%MEMBER_COLORS.length];
          const weak=PEER_CRITERIA.filter(c=>sc[c]<7&&sc[c]>0),strong=PEER_CRITERIA.filter(c=>sc[c]>=7&&sc[c]>0);
          const mt=tasks.filter(t=>t.assignees?.includes(m.id)),ct=mt.filter(t=>t.status==="done").length;
          return <Card key={m.id} style={{borderColor:mc+"44"}} theme={theme}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
              <div style={{width:40,height:40,borderRadius:10,background:mc+"22",border:`2px solid ${mc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:700,color:mc}}>{m.name.split(" ").pop().charAt(0)}</div>
              <div style={{fontSize:16,fontWeight:700,color:s.text}}>{m.name}</div>
              {m.id===leader&&<Tag color="#f59e0b">Trưởng nhóm</Tag>}
              <div style={{fontSize:12,color:s.muted,marginLeft:"auto"}}>📋 {ct}/{mt.length} công việc</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#22c55e",marginBottom:8}}>✅ ĐIỂM MẠNH</div>
                {strong.length>0?strong.map(c=>{ const lv=level(sc[c]); return <div key={c} style={{marginBottom:8}}><div style={{fontSize:13,color:s.text}}>{c}</div><div style={{fontSize:12,color:lv.color}}>{sc[c].toFixed(1)}/10 - {lv.text}</div></div>; }):<div style={{fontSize:13,color:s.muted}}>Chưa có dữ liệu</div>}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:8}}>⚠️ ĐIỂM YẾU</div>
                {weak.length>0?weak.map(c=><div key={c} style={{marginBottom:12}}><div style={{fontSize:13,color:s.text}}>{c}</div><div style={{fontSize:12,color:"#ef4444",marginBottom:4}}>{sc[c].toFixed(1)}/10</div><div style={{fontSize:12,color:"#818cf8",background:"#1e1b4b",padding:6,borderRadius:6}}>{suggest(c,sc[c])}</div></div>):<div style={{fontSize:13,color:s.muted}}>{sc[PEER_CRITERIA[0]]===0?"Chưa có dữ liệu":"✅ Không có điểm yếu!"}</div>}
              </div>
            </div>
          </Card>;
        })}
      </div>
    </div>
  );
}

// ─── RESULT TAB ───────────────────────────────────────────────────────────────
function ResultTab({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore, theme }) {
  const s = T[theme];
  const getPeer = (mid) => {
    const all=[];
    Object.keys(peerScores).forEach(rid=>{ if(rid===mid) return; const rd=peerScores[rid]; if(rd&&rd[mid]) PEER_CRITERIA.forEach(c=>{ const sc=rd[mid][c]; if(sc&&Array.isArray(sc)) all.push(...sc); }); });
    return all.length===0?null:avg(all)*10;
  };
  const results = useMemo(()=>{
    if (!members.length) return [];
    return members.map(m=>{
      const mt=tasks.filter(t=>t.assignees?.includes(m.id));
      let ts=100;
      if(mt.length>0){const tp=mt.reduce((a,t)=>a+COMPLEXITY[t.complexity].pts*100,0),ep=mt.reduce((a,t)=>a+COMPLEXITY[t.complexity].pts*100*STATUS[t.status].pct,0); ts=tp>0?(ep/tp)*100:100;}
      const ps=getPeer(m.id)??100;
      const ls2=LEADER_CRITERIA.map(c=>leaderScores?.[m.id]?.[c]??0).filter(x=>x>0);
      const ls=ls2.length>0?avg(ls2)*10:100;
      const il=m.id===leader;
      const fs=il?ts*0.4+ps*0.6:ts*0.4+ps*0.4+ls*0.2;
      return {...m,ts,ps,ls,fs,il,mc:mt.length,dc:mt.filter(t=>t.status==="done").length};
    });
  },[members,tasks,peerScores,leaderScores,leader]);
  const total=results.reduce((a,r)=>a+r.fs,0);
  const sorted=[...results].sort((a,b)=>b.fs-a.fs);
  const maxF=Math.max(...results.map(r=>r.fs),1);
  const tAvg=avg(results.map(r=>r.fs));
  const tv=parseFloat(teacherScore),hasTV=!isNaN(tv)&&tv>=0&&tv<=10;
  const pct=(sc)=>total>0?(sc/total)*100:(100/(members.length||1));
  const grade=(sc)=>hasTV?tv*(pct(sc)/100)*members.length:null;
  return (
    <div>
      <Card style={{marginBottom:24,borderColor:"#1e3a5f",background:theme==="dark"?"linear-gradient(135deg,#0c1929,#13131a)":"linear-gradient(135deg,#e0e7ff,#c7d2fe)"}} theme={theme}>
        <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
          <div style={{fontSize:36}}>🎓</div>
          <div style={{flex:1}}><div style={{fontSize:16,fontWeight:800,color:"#93c5fd",marginBottom:4}}>Điểm giảng viên cho nhóm</div><div style={{fontSize:13,color:s.muted}}>Nhập điểm (thang 10) → tự tính điểm cá nhân theo % đóng góp</div></div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <input type="number" min="0" max="10" step="0.1" value={teacherScore} onChange={e=>setTeacherScore(e.target.value)} placeholder="VD: 9" style={{width:100,background:s.inp,border:"2px solid #1e3a5f",borderRadius:12,padding:"12px 16px",color:"#93c5fd",fontSize:22,fontWeight:800,textAlign:"center"}}/>
            <div style={{fontSize:13,color:s.muted}}>/ 10</div>
          </div>
        </div>
      </Card>
      <div className="stats-grid" style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        {[
          {label:"Điểm TB hệ thống",value:tAvg.toFixed(1),icon:"📊",color:"#6366f1",sub:"thang 100"},
          {label:hasTV?"Điểm giảng viên":"Chờ điểm",value:hasTV?tv.toFixed(1):"—",icon:"🎓",color:"#3b82f6",sub:"thang 10"},
          {label:"Cao nhất",value:hasTV&&results.length?Math.max(...results.map(r=>grade(r.fs))).toFixed(2):"—",icon:"⭐",color:"#22c55e",sub:"thang 10"},
          {label:"Thấp nhất",value:hasTV&&results.length?Math.min(...results.map(r=>grade(r.fs))).toFixed(2):"—",icon:"⚠️",color:"#f59e0b",sub:"thang 10"},
        ].map(x=><Card key={x.label} style={{textAlign:"center"}} theme={theme}>
          <div style={{fontSize:24}}>{x.icon}</div>
          <div style={{fontSize:"clamp(20px,5vw,30px)",fontWeight:800,fontFamily:"'Space Mono',monospace",color:x.color,margin:"8px 0 2px"}}>{x.value}</div>
          <div style={{fontSize:11,color:s.muted,marginBottom:2}}>{x.sub}</div>
          <div style={{fontSize:12,color:s.muted}}>{x.label}</div>
        </Card>)}
      </div>
      <Card style={{padding:0,overflow:"hidden"}} theme={theme}>
        <div style={{overflowX:"auto"}}>
          <div style={{padding:"14px 24px",background:s.inp,borderBottom:`1px solid ${s.border}`,display:"grid",gridTemplateColumns:"minmax(150px,1fr) 80px 80px 80px 90px 110px 100px",fontSize:11,fontWeight:700,letterSpacing:1,color:s.muted,textTransform:"uppercase",gap:8,alignItems:"center",minWidth:750}}>
            <span>Thành viên</span><span style={{textAlign:"center"}}>Công việc</span><span style={{textAlign:"center"}}>Đồng đội</span><span style={{textAlign:"center"}}>Trưởng nhóm</span><span style={{textAlign:"center"}}>Tổng (100)</span><span style={{textAlign:"center"}}>% Đóng góp</span><span style={{textAlign:"center"}}>{hasTV?"Điểm thực tế":"Chờ điểm"}</span>
          </div>
          {sorted.map(r=>{
            const mi=members.findIndex(m=>m.id===r.id),mc=MEMBER_COLORS[mi>=0?mi%MEMBER_COLORS.length:0];
            const p=pct(r.fs),g=grade(r.fs),gc=g===null?s.muted:g>=8.5?"#22c55e":g>=7?"#6366f1":g>=5.5?"#f59e0b":"#ef4444";
            return <div key={r.id} style={{display:"grid",gridTemplateColumns:"minmax(150px,1fr) 80px 80px 80px 90px 110px 100px",padding:"14px 24px",borderBottom:`1px solid ${s.border}`,alignItems:"center",gap:8}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:32,height:32,borderRadius:8,background:mc+"22",border:`2px solid ${mc}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:mc,flexShrink:0}}>{r.name.split(" ").pop().charAt(0)}</div>
                <div><div style={{fontSize:13,fontWeight:600,color:s.text}}>{r.name.split(" ").pop()}</div><div style={{fontSize:11,color:s.muted}}>{r.mc>0?`${r.dc}/${r.mc} công việc`:"Chưa có"}</div></div>
              </div>
              <div style={{textAlign:"center",fontSize:13,fontWeight:700,fontFamily:"'Space Mono',monospace",color:"#22c55e"}}>{r.ts.toFixed(0)}</div>
              <div style={{textAlign:"center",fontSize:13,fontWeight:700,fontFamily:"'Space Mono',monospace",color:"#22c55e"}}>{r.ps.toFixed(0)}</div>
              <div style={{textAlign:"center",fontSize:13,fontWeight:700,fontFamily:"'Space Mono',monospace",color:"#22c55e"}}>{r.il?"–":r.ls.toFixed(0)}</div>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:800,fontFamily:"'Space Mono',monospace",color:"#a5b4fc",marginBottom:4}}>{r.fs.toFixed(1)}</div>
                <Bar value={r.fs} max={maxF} color={mc}/>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{background:mc+"18",border:`1px solid ${mc}44`,borderRadius:10,padding:"6px 10px",display:"inline-block",minWidth:80}}>
                  <div style={{fontSize:16,fontWeight:800,fontFamily:"'Space Mono',monospace",color:mc}}>{p.toFixed(1)}%</div>
                </div>
              </div>
              <div style={{textAlign:"center"}}>
                {g!==null?<div style={{background:gc+"18",border:`1px solid ${gc}44`,borderRadius:10,padding:"6px 10px",display:"inline-block",minWidth:70}}><div style={{fontSize:16,fontWeight:800,fontFamily:"'Space Mono',monospace",color:gc}}>{g.toFixed(2)}</div></div>:<span style={{color:s.muted,fontSize:20}}>—</span>}
              </div>
            </div>;
          })}
          <div style={{display:"grid",gridTemplateColumns:"minmax(150px,1fr) 80px 80px 80px 90px 110px 100px",padding:"14px 24px",background:s.inp,alignItems:"center",gap:8,borderTop:`2px solid ${s.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:"#6366f1"}}>Trung bình nhóm</div>
            <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:12,color:"#6366f1"}}>{avg(results.map(r=>r.ts)).toFixed(1)}</div>
            <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:12,color:"#6366f1"}}>{avg(results.map(r=>r.ps)).toFixed(1)}</div>
            <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:12,color:"#6366f1"}}>{avg(results.filter(r=>!r.il).map(r=>r.ls)).toFixed(1)}</div>
            <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:800,color:"#a5b4fc"}}>{tAvg.toFixed(1)}</div>
            <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:13,color:"#6366f1"}}>100%</div>
            <div style={{textAlign:"center",fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:800,color:hasTV?"#93c5fd":s.muted}}>{hasTV?tv.toFixed(1):"—"}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("setup");
  const [projectName, setProjectName] = useState("");
  const [leader, setLeader] = useState("");
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [peerScores, setPeerScores] = useState({});
  const [leaderScores, setLeaderScores] = useState({});
  const [teacherScore, setTeacherScore] = useState("");
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [scheduleSelections, setScheduleSelections] = useState({});
  const [isCopied, setIsCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasGroup, setHasGroup] = useState(false);
  const [theme, setTheme] = useState(getInitialTheme);
  const [syncStatus, setSyncStatus] = useState("idle");
  const [binId, setBinId] = useState(null); // JSONBin ID
  const saveTimerRef = useRef(null);

  // Lấy binId từ URL (?room=...)
  const roomParam = useMemo(()=>{ const p=new URLSearchParams(window.location.search); return p.get("room")||null; },[]);

  // Load data lần đầu
  useEffect(()=>{
    const init = async () => {
      if (roomParam) {
        // Có room ID → tải từ cloud
        setSyncStatus("loading");
        try {
          const data = await remoteStorage.load(roomParam);
          if (data) {
            setBinId(roomParam);
            if(data.projectName!==undefined) setProjectName(data.projectName);
            if(data.leader!==undefined) setLeader(data.leader);
            if(data.members) setMembers(data.members);
            if(data.tasks) setTasks(data.tasks);
            if(data.peerScores) setPeerScores(data.peerScores);
            if(data.leaderScores) setLeaderScores(data.leaderScores);
            if(data.teacherScore!==undefined) setTeacherScore(data.teacherScore);
            if(data.scheduleSlots) setScheduleSlots(data.scheduleSlots);
            if(data.scheduleSelections) setScheduleSelections(data.scheduleSelections);
            setHasGroup(true);
            setSyncStatus("saved");
            setTimeout(()=>setSyncStatus("idle"),2000);
          } else {
            // Bin không tồn tại
            setSyncStatus("error");
            showToast("❌ Không tìm thấy Room! Link có thể hết hạn.", "#ef4444");
          }
        } catch(e) {
          setSyncStatus("error");
        }
      }
      setIsReady(true);
    };
    init();
  },[]);

  // Auto-save với debounce
  useEffect(()=>{
    if (!isReady||!binId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSyncStatus("saving");
    saveTimerRef.current = setTimeout(async ()=>{
      const data={projectName,leader,members,tasks,peerScores,leaderScores,teacherScore,scheduleSlots,scheduleSelections};
      try {
        await remoteStorage.save(binId, data);
        setSyncStatus("saved");
        setTimeout(()=>setSyncStatus("idle"),2000);
      } catch(e) {
        setSyncStatus("error");
        showToast("⚠️ Lỗi lưu data! Kiểm tra kết nối mạng.", "#ef4444");
      }
    }, 1000);
    return ()=>clearTimeout(saveTimerRef.current);
  },[projectName,leader,members,tasks,peerScores,leaderScores,teacherScore,scheduleSlots,scheduleSelections,binId,isReady]);

  const createNewGroup = async () => {
    setSyncStatus("saving");
    try {
      const initData={projectName:"",leader:"",members:[],tasks:[],peerScores:{},leaderScores:{},teacherScore:"",scheduleSlots:[],scheduleSelections:{}};
      const id = await remoteStorage.create(initData);
      setBinId(id);
      setProjectName(""); setLeader(""); setMembers([]); setTasks([]);
      setPeerScores({}); setLeaderScores({}); setTeacherScore("");
      setScheduleSlots([]); setScheduleSelections({});
      // Cập nhật URL
      const url=`${window.location.origin}${window.location.pathname}?room=${id}`;
      window.history.replaceState(null,"",url);
      setHasGroup(true);
      setSyncStatus("saved");
      setTimeout(()=>setSyncStatus("idle"),2000);
      showToast("✅ Tạo nhóm thành công! Chia sẻ link để cả nhóm vào cùng.");
    } catch(e) {
      setSyncStatus("error");
      showToast("❌ Không thể tạo nhóm. Kiểm tra kết nối mạng!", "#ef4444");
    }
  };

  const generateShareLink = () => {
    const url=`${window.location.origin}${window.location.pathname}?room=${binId}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(()=>setIsCopied(false),2500);
  };

  const refreshData = async () => {
    if (!binId) return;
    setSyncStatus("loading");
    try {
      const data = await remoteStorage.load(binId);
      if (data) {
        if(data.projectName!==undefined) setProjectName(data.projectName);
        if(data.leader!==undefined) setLeader(data.leader);
        if(data.members) setMembers(data.members);
        if(data.tasks) setTasks(data.tasks);
        if(data.peerScores) setPeerScores(data.peerScores);
        if(data.leaderScores) setLeaderScores(data.leaderScores);
        if(data.teacherScore!==undefined) setTeacherScore(data.teacherScore);
        if(data.scheduleSlots) setScheduleSlots(data.scheduleSlots);
        if(data.scheduleSelections) setScheduleSelections(data.scheduleSelections);
        setSyncStatus("saved");
        setTimeout(()=>setSyncStatus("idle"),2000);
        showToast("✅ Đã tải dữ liệu mới nhất từ cloud!");
      }
    } catch(e) {
      setSyncStatus("error");
      showToast("❌ Lỗi tải dữ liệu", "#ef4444");
    }
  };

  const toggleTheme = () => {
    const n=theme==="dark"?"light":"dark";
    setTheme(n);
    try{localStorage.setItem("theme",n);}catch(e){}
  };

  const styles = T[theme];
  const peerDone = members.length>=2?members.filter(m=>peerScores[m.id]?.completed===true).length:null;
  const badge = { tasks:tasks.length||null, peer:peerDone!==null?`${peerDone}/${members.length}`:null, schedule:scheduleSlots.length>0?scheduleSlots.length:null };

  if (!isReady) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:styles.bg,color:styles.text,gap:16}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <div style={{fontSize:48,animation:"spin 1s linear infinite"}}>⏳</div>
      <div style={{fontSize:16,fontWeight:600,color:"#a5b4fc"}}>Đang tải dữ liệu từ cloud...</div>
      {roomParam&&<div style={{fontSize:12,color:styles.muted}}>Room: {roomParam}</div>}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!hasGroup) return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:styles.bg,color:styles.text,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>
      <Card style={{textAlign:"center",maxWidth:480,width:"100%"}} theme={theme}>
        <div style={{fontSize:64,marginBottom:20}}>🚀</div>
        <h2 style={{color:"#a5b4fc",marginBottom:8,fontFamily:"'Space Mono',monospace"}}>TEAM EVAL</h2>
        <p style={{color:styles.muted,marginBottom:16,lineHeight:1.6}}>Công cụ đánh giá nhóm học tập trực tuyến</p>
        <div style={{padding:14,background:"#0c2a1a",borderRadius:10,marginBottom:24,fontSize:13,color:"#86efac",textAlign:"left"}}>
          <div style={{marginBottom:6}}>☁️ <b>Lưu trữ cloud thực sự</b> qua JSONBin.io</div>
          <div style={{marginBottom:6}}>🔗 Chia sẻ link → mọi người mở cùng link đều thấy cùng data</div>
          <div>🔄 Bấm "Tải dữ liệu mới nhất" để đồng bộ khi người khác vừa cập nhật</div>
        </div>
        <Btn onClick={createNewGroup} variant="primary" theme={theme} style={{padding:"12px 24px",fontSize:16,width:"100%"}}>
          {syncStatus==="saving"?"⏳ Đang tạo...":"➕ Tạo nhóm mới"}
        </Btn>
      </Card>
    </div>
  );

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:styles.bg,color:styles.text}}>
      <style>{`
        @media(max-width:768px){
          .two-col{grid-template-columns:1fr!important}
          .task-grid{grid-template-columns:1fr!important}
          .stats-grid{grid-template-columns:repeat(2,1fr)!important}
          .sched-grid{grid-template-columns:1fr!important}
          .card{padding:16px!important}
          .hide-mobile{display:none}
          .app-nav button .nav-label{display:none}
        }
        @media(max-width:480px){.stats-grid{grid-template-columns:1fr!important}}
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{background:styles.hdr,borderBottom:`1px solid ${styles.border}`,padding:"0 16px"}}>
        <div style={{maxWidth:1200,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12,padding:"12px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:40,height:40,borderRadius:12,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✦</div>
            <div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,fontWeight:700,color:"#a5b4fc",letterSpacing:2}}>TEAM EVAL</div>
              <div style={{fontSize:11,color:"#5c54c7",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{projectName||"NHÓM CỦA BẠN"}</div>
            </div>
          </div>
          <nav className="app-nav" style={{display:"flex",gap:4,background:styles.inp,borderRadius:14,padding:5,overflowX:"auto",flex:"1 1 auto",justifyContent:"center"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 12px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,transition:"all .2s",background:tab===t.id?"linear-gradient(135deg,#6366f1,#8b5cf6)":"transparent",color:tab===t.id?"#fff":styles.muted,display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap"}}>
                <span>{t.icon}</span><span className="nav-label">{t.label}</span>
                {badge[t.id]&&<span style={{background:tab===t.id?"rgba(255,255,255,.25)":styles.border,borderRadius:10,padding:"1px 6px",fontSize:10,fontWeight:800}}>{badge[t.id]}</span>}
              </button>
            ))}
          </nav>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <SyncBadge status={syncStatus}/>
            <Btn onClick={toggleTheme} variant="ghost" theme={theme} style={{padding:"8px 12px",fontSize:18}}>{theme==="dark"?"☀️":"🌙"}</Btn>
            <Btn onClick={generateShareLink} variant={isCopied?"success":"primary"} theme={theme} style={{padding:"8px 16px",fontSize:12,whiteSpace:"nowrap"}}>
              {isCopied?"✓ Đã copy!":"🔗 Chia sẻ link"}
            </Btn>
          </div>
        </div>
        {/* Room bar */}
        <div style={{maxWidth:1200,margin:"0 auto",paddingBottom:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:styles.muted}}>🔑 Room:</span>
          <code style={{fontSize:11,color:"#a5b4fc",background:styles.inp,padding:"2px 8px",borderRadius:4}}>{binId}</code>
          <span style={{fontSize:11,color:"#334155"}}>— Chia sẻ link để cả nhóm cùng truy cập</span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px"}}>
        {tab==="setup"&&<SetupTab members={members} setMembers={setMembers} projectName={projectName} setProjectName={setProjectName} leader={leader} setLeader={setLeader} theme={theme}/>}
        {tab==="tasks"&&<TaskTab members={members} tasks={tasks} setTasks={setTasks} theme={theme}/>}
        {tab==="peer"&&<PeerTab members={members} peerScores={peerScores} setPeerScores={setPeerScores} theme={theme} onRefresh={refreshData}/>}
        {tab==="leader"&&<LeaderTab members={members} leader={leader} leaderScores={leaderScores} setLeaderScores={setLeaderScores} theme={theme}/>}
        {tab==="schedule"&&<ScheduleTab members={members} scheduleSlots={scheduleSlots} setScheduleSlots={setScheduleSlots} scheduleSelections={scheduleSelections} setScheduleSelections={setScheduleSelections} theme={theme}/>}
        {tab==="analysis"&&<AnalysisTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} theme={theme}/>}
        {tab==="result"&&<ResultTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} teacherScore={teacherScore} setTeacherScore={setTeacherScore} theme={theme}/>}
      </div>
    </div>
  );
}

