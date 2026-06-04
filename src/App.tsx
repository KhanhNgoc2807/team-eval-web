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
  { id: "tasks", icon: "📋", label: "Task Log" },
  { id: "peer", icon: "👥", label: "Peer Review" },
  { id: "leader", icon: "👑", label: "Leader" },
  { id: "result", icon: "🏆", label: "Kết quả" },
];
const uid = () => Math.random().toString(36).substring(2, 9);
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// ─── COMPONENTS ───────────────────────────────────────────────────────────────
function Tag({ color, children, style = {} }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, ...style }}>{children}</span>;
}

function Card({ children, style = {} }) {
  return <div style={{ background: "#13131a", border: "1px solid #1e2235", borderRadius: 16, padding: 24, ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const base = { border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: disabled ? 0.4 : 1 };
  const vars = {
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" },
    ghost: { background: "transparent", border: "1px solid #1e2235", color: "#94a3b8" },
    danger: { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" },
    success: { background: "#052e16", color: "#86efac", border: "1px solid #166534" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style = {}, type = "text", onKeyDown }) {
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ background: "#0a0a10", border: "1px solid #1e2235", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...style }}
    onKeyDown={onKeyDown} />;
}

function Select({ value, onChange, children, style = {} }) {
  return <select value={value || ""} onChange={e => onChange(e.target.value)}
    style={{ background: "#0a0a10", border: "1px solid #1e2235", borderRadius: 10, padding: "10px 14px", color: value ? "#e2e8f0" : "#475569", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer", ...style }}>
    {children}
  </select>;
}

function RatingSelect({ value, onChange }) {
  return <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))}
    style={{ background: "#0a0a10", border: "1px solid #1e2235", borderRadius: 8, padding: "7px 10px", color: "#e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
    {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

function ProgressBar({ value, max, color = "#6366f1" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ height: 8, background: "#1e2235", borderRadius: 4, overflow: "hidden" }}>
    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4, transition: "width .5s ease" }} />
  </div>;
}

const lbl = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const filterBtn = { padding: "6px 14px", borderRadius: 20, border: "1px solid #1e2235", background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s" };
const filterActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

// ─── SETUP TAB ────────────────────────────────────────────────────────────────
function SetupTab({ members, setMembers, projectName, setProjectName, leader, setLeader }) {
  const [name, setName] = useState("");
  const [mssv, setMssv] = useState("");

  const add = () => {
    if (!name.trim()) return;
    setMembers(m => [...m, { id: uid(), name: name.trim(), mssv: mssv.trim() }]);
    setName(""); setMssv("");
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") add(); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <Card>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>⚙️ THÔNG TIN DỰ ÁN</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Tên dự án / môn học</label><Input value={projectName} onChange={setProjectName} placeholder="VD: Dự án Marketing" /></div>
          <div><label style={lbl}>Nhóm trưởng</label><Select value={leader} onChange={setLeader}><option value="">Chọn nhóm trưởng...</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: "#0a0a10", borderRadius: 12, fontSize: 13, color: "#475569" }}>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 Công thức tính điểm</div>
          <div>Thành viên = Task × 40% + Peer × 40% + Leader × 20%</div>
          <div>Nhóm trưởng = Task × 40% + Peer × 60%</div>
        </div>
      </Card>
      <Card>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>👥 THÀNH VIÊN NHÓM</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
          <Input value={name} onChange={setName} placeholder="Họ và tên" onKeyDown={handleKeyDown} />
          <Input value={mssv} onChange={setMssv} placeholder="MSSV" onKeyDown={handleKeyDown} />
          <Btn onClick={add}>Thêm</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {members.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#334155" }}>Chưa có thành viên</div>}
          {members.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0a0a10", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: MEMBER_COLORS[i % MEMBER_COLORS.length] + "22", border: `2px solid ${MEMBER_COLORS[i % MEMBER_COLORS.length]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }}>{m.name.charAt(0)}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</div>{m.mssv && <div style={{ fontSize: 11, color: "#475569" }}>{m.mssv}</div>}</div>
              {leader === m.id && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
              <button onClick={() => setMembers(ms => ms.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TASK TAB ─────────────────────────────────────────────────────────────────
function TaskTab({ members, tasks, setTasks }) {
  const [form, setForm] = useState({ name: "", assignee: "", deadline: "", complexity: 2 });
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const addTask = () => {
    if (!form.name.trim() || !form.assignee) return;
    setTasks(t => [...t, { id: uid(), ...form, status: "todo" }]);
    setForm({ name: "", assignee: "", deadline: "", complexity: 2 });
    setShowForm(false);
  };

  const cycleStatus = (id) => {
    const order = ["todo", "doing", "done"];
    setTasks(ts => ts.map(t => t.id !== id ? t : { ...t, status: order[(order.indexOf(t.status) + 1) % 3] }));
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.assignee === filter);
  const overdue = (t) => {
    if (!t.deadline || t.status === "done") return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const dl = new Date(t.deadline); dl.setHours(0,0,0,0);
    return dl < today;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ ...filterBtn, ...(filter === "all" ? filterActive : {}) }}>Tất cả ({tasks.length})</button>
          {members.map(m => (
            <button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)} style={{ ...filterBtn, ...(filter === m.id ? { borderColor: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], color: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length] } : {}) }}>
              {m.name} ({tasks.filter(t => t.assignee === m.id).length})
            </button>
          ))}
        </div>
        <Btn onClick={() => setShowForm(true)}>+ Thêm Task</Btn>
      </div>
      {showForm && (
        <Card style={{ marginBottom: 20, borderColor: "#312e81" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div><label style={lbl}>Tên công việc</label><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Mô tả công việc..." /></div>
            <div><label style={lbl}>Giao cho</label><Select value={form.assignee} onChange={v => setForm(f => ({ ...f, assignee: v }))}><option value="">Chọn...</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
            <div><label style={lbl}>Deadline</label><Input type="date" value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} /></div>
            <div><label style={lbl}>Độ khó</label><div style={{ display: "flex", gap: 6 }}>{[1,2,3].map(v => (<button key={v} onClick={() => setForm(f => ({ ...f, complexity: v }))} style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1px solid ${form.complexity === v ? COMPLEXITY[v].color : "#1e2235"}`, background: form.complexity === v ? COMPLEXITY[v].color + "22" : "transparent", color: form.complexity === v ? COMPLEXITY[v].color : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>LV{v}</button>))}</div></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}><Btn onClick={() => setShowForm(false)} variant="ghost">Huỷ</Btn><Btn onClick={addTask}>✓ Thêm</Btn></div>
        </Card>
      )}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "#334155" }}><div style={{ fontSize: 48 }}>📋</div><div>Chưa có task nào</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {filtered.map(t => {
            const member = members.find(m => m.id === t.assignee);
            const mc = MEMBER_COLORS[members.indexOf(member) % MEMBER_COLORS.length];
            const sc = STATUS[t.status];
            const od = overdue(t);
            return (
              <div key={t.id} style={{ background: "#13131a", border: `1px solid ${t.status === "done" ? "#166534" : od ? "#7f1d1d" : "#1e2235"}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <Tag color={mc}>{member?.name}</Tag>
                  <div style={{ display: "flex", gap: 6 }}><Tag color={COMPLEXITY[t.complexity].color}>LV{t.complexity}</Tag><button onClick={() => setTasks(ts => ts.filter(x => x.id !== t.id))} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 18 }}>×</button></div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.status === "done" ? "#4ade80" : "#e2e8f0", textDecoration: t.status === "done" ? "line-through" : "none", marginBottom: 10 }}>{t.name}</div>
                {t.deadline && <div style={{ fontSize: 12, color: od ? "#f87171" : "#475569", marginBottom: 12 }}>{od ? "⚠️ Quá hạn" : "📅"} {new Date(t.deadline).toLocaleDateString("vi-VN")}</div>}
                <button onClick={() => cycleStatus(t.id)} style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${sc.color}44`, background: sc.color + "18", color: sc.color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{sc.label} → click đổi</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PEER TAB (giữ nguyên giao diện) ──────────────────────────────────────────
function PeerTab({ members, peerScores, setPeerScores }) {
  const [reviewer, setReviewer] = useState("");
  const setScore = (reviewee, criterion, val) => { setPeerScores(ps => { const next = { ...ps }; if (!next[reviewer]) next[reviewer] = {}; if (!next[reviewer][reviewee]) next[reviewer][reviewee] = {}; next[reviewer][reviewee][criterion] = val; return next; }); };
  const getScore = (reviewee, criterion) => peerScores?.[reviewer]?.[reviewee]?.[criterion] ?? 0;
  if (members.length < 2) return <Card>Cần ít nhất 2 thành viên</Card>;
  return (<div><Card><div style={{ display: "flex", alignItems: "center", gap: 16 }}><div>Bạn là:</div><Select value={reviewer} onChange={setReviewer}><option value="">Chọn tên...</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div></Card>
  {reviewer && members.filter(m => m.id !== reviewer).map(r => (<Card key={r.id}><h4>{r.name}</h4>{PEER_CRITERIA.map(c => (<div key={c} style={{ marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{c}</div><RatingSelect value={getScore(r.id, c)} onChange={v => setScore(r.id, c, v)} /></div>))}</Card>))}</div>);
}

// ─── LEADER TAB ───────────────────────────────────────────────────────────────
function LeaderTab({ members, leader, leaderScores, setLeaderScores }) {
  const setScore = (memberId, criterion, val) => { setLeaderScores(ls => ({ ...ls, [memberId]: { ...ls[memberId], [criterion]: val } })); };
  const getScore = (memberId, criterion) => leaderScores?.[memberId]?.[criterion] ?? 0;
  if (!leader) return <Card>Chưa chọn nhóm trưởng</Card>;
  return (<div>{members.map(m => (<Card key={m.id}><h4>{m.name} {m.id === leader && "(Trưởng nhóm)"}</h4>{LEADER_CRITERIA.map(c => (<div key={c} style={{ marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{c}</div><RatingSelect value={getScore(m.id, c)} onChange={v => setScore(m.id, c, v)} /></div>))}</Card>))}</div>);
}

// ─── RESULT TAB ───────────────────────────────────────────────────────────────
function ResultTab({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore }) {
  const results = useMemo(() => members.map(m => {
    const myTasks = tasks.filter(t => t.assignee === m.id);
    let taskScore = 100;
    if (myTasks.length > 0) {
      const totalPossible = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100, 0);
      const earned = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100 * STATUS[t.status].pct, 0);
      taskScore = totalPossible > 0 ? (earned / totalPossible) * 100 : 100;
    }
    const receivedScores = []; members.forEach(r => { if (r.id === m.id) return; PEER_CRITERIA.forEach(c => { const s = peerScores?.[r.id]?.[m.id]?.[c] ?? 0; if (s > 0) receivedScores.push(s); }); });
    const peerScore = receivedScores.length > 0 ? avg(receivedScores) * 10 : 100;
    const leaderScore = 100;
    const isLeader = m.id === leader;
    const finalScore = isLeader ? taskScore * 0.4 + peerScore * 0.6 : taskScore * 0.4 + peerScore * 0.4 + leaderScore * 0.2;
    return { ...m, taskScore, peerScore, finalScore, isLeader, taskCount: myTasks.length, doneCount: myTasks.filter(t => t.status === "done").length };
  }), [members, tasks, peerScores, leaderScores, leader]);
  const totalScore = results.reduce((s, r) => s + r.finalScore, 0);
  const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);
  return (<div><Card><h3>🎓 Điểm thầy cô</h3><Input value={teacherScore} onChange={setTeacherScore} placeholder="Nhập điểm (0-10)" type="number" /></Card>
  <Card><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr style={{ borderBottom: "1px solid #333" }}><th style={{ textAlign: "left", padding: 8 }}>Thành viên</th><th style={{ padding: 8 }}>Task</th><th style={{ padding: 8 }}>Peer</th><th style={{ padding: 8 }}>Tổng</th></tr></thead>
  <tbody>{sorted.map(r => (<tr key={r.id} style={{ borderBottom: "1px solid #222" }}><td style={{ padding: 8 }}>{r.name} {r.isLeader && "(Trưởng nhóm)"}<br/><span style={{ fontSize: 11, color: "#666" }}>{r.doneCount}/{r.taskCount} task</span></td><td style={{ textAlign: "center", padding: 8 }}>{r.taskScore.toFixed(0)}</td><td style={{ textAlign: "center", padding: 8 }}>{r.peerScore.toFixed(0)}</td><td style={{ textAlign: "center", padding: 8, fontWeight: 700, color: "#a5b4fc" }}>{r.finalScore.toFixed(1)}</td></tr>))}</tbody></table></Card></div>);
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

  return (<div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: "#0a0a10", color: "#e2e8f0" }}>
    <div style={{ background: "linear-gradient(135deg,#0f0c29,#1a1040)", borderBottom: "1px solid #1e2235", padding: "0 32px" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
        <div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: "#a5b4fc" }}>TEAM EVAL</div><div style={{ fontSize: 11, color: "#5c54c7" }}>{projectName || "BỘ CÔNG CỤ ĐÁNH GIÁ NHÓM"}</div></div>
        <nav style={{ display: "flex", gap: 4, background: "#0a0a10", borderRadius: 14, padding: 5 }}>{TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: tab === t.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: tab === t.id ? "#fff" : "#4a5568", display: "flex", alignItems: "center", gap: 6 }}>{t.icon} {t.label}</button>))}</nav>
      </div>
    </div>
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
      {tab === "setup" && <SetupTab members={members} setMembers={setMembers} projectName={projectName} setProjectName={setProjectName} leader={leader} setLeader={setLeader} />}
      {tab === "tasks" && <TaskTab members={members} tasks={tasks} setTasks={setTasks} />}
      {tab === "peer" && <PeerTab members={members} peerScores={peerScores} setPeerScores={setPeerScores} />}
      {tab === "leader" && <LeaderTab members={members} leader={leader} leaderScores={leaderScores} setLeaderScores={setLeaderScores} />}
      {tab === "result" && <ResultTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} teacherScore={teacherScore} setTeacherScore={setTeacherScore} />}
    </div>
  </div>);
}
