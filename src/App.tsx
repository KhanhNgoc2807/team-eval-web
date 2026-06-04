import { useState, useMemo, useEffect } from "react";

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

// ─── SUB COMPONENTS ───────────────────────────────────────────────────────────
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
    style={{ background: "#0a0a10", border: "1px solid #1e2235", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", colorScheme: "dark", ...style }}
    onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#1e2235"}
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
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc", fontFamily: "'Space Mono',monospace" }}>⚙️ THÔNG TIN DỰ ÁN</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Tên dự án / môn học</label><Input value={projectName} onChange={setProjectName} placeholder="VD: Dự án Marketing Semester 2" /></div>
          <div><label style={lbl}>Nhóm trưởng</label><Select value={leader} onChange={setLeader}><option value="">Chọn nhóm trưởng...</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: "#0a0a10", borderRadius: 12, fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 Công thức tính điểm</div>
          <div>Thành viên = <b style={{ color: "#6366f1" }}>Task × 40%</b> + <b style={{ color: "#22c55e" }}>Peer × 40%</b> + <b style={{ color: "#f59e0b" }}>Leader × 20%</b></div>
          <div>Nhóm trưởng = <b style={{ color: "#6366f1" }}>Task × 40%</b> + <b style={{ color: "#22c55e" }}>Peer × 60%</b></div>
        </div>
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc", fontFamily: "'Space Mono',monospace" }}>👥 THÀNH VIÊN NHÓM</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
          <Input value={name} onChange={setName} placeholder="Họ và tên" onKeyDown={handleKeyDown} />
          <Input value={mssv} onChange={setMssv} placeholder="MSSV (tuỳ chọn)" onKeyDown={handleKeyDown} />
          <Btn onClick={add}>Thêm</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {members.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#334155", fontSize: 14 }}>Chưa có thành viên nào</div>}
          {members.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#0a0a10", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: MEMBER_COLORS[i % MEMBER_COLORS.length] + "22", border: `2px solid ${MEMBER_COLORS[i % MEMBER_COLORS.length]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: MEMBER_COLORS[i % MEMBER_COLORS.length], flexShrink: 0 }}>
                {m.name.split(" ").pop().charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</div>
                {m.mssv && <div style={{ fontSize: 11, color: "#475569" }}>{m.mssv}</div>}
              </div>
              {leader === m.id && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
              <button onClick={() => setMembers(ms => ms.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
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
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = new Date(t.deadline + "T00:00:00");
    return dl < today;
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ ...filterBtn, ...(filter === "all" ? filterActive : {}) }}>Tất cả ({tasks.length})</button>
          {members.filter(m => tasks.some(t => t.assignee === m.id)).map(m => (
            <button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)}
              style={{ ...filterBtn, ...(filter === m.id ? { borderColor: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], color: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length] + "18" } : {}) }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], display: "inline-block" }} />
              {m.name.split(" ").pop()} ({tasks.filter(t => t.assignee === m.id).length})
            </button>
          ))}
        </div>
        <Btn onClick={() => setShowForm(true)}>+ Thêm Task</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20, borderColor: "#312e81" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div><label style={lbl}>Tên công việc *</label><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Mô tả ngắn công việc..." /></div>
            <div><label style={lbl}>Giao cho *</label><Select value={form.assignee} onChange={v => setForm(f => ({ ...f, assignee: v }))}><option value="">Chọn thành viên...</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
            <div><label style={lbl}>Deadline</label><Input type="date" value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} /></div>
            <div style={{ paddingBottom: 0 }}><label style={lbl}>Độ khó</label><div style={{ display: "flex", gap: 6 }}>{[1,2,3].map(v => (<button key={v} onClick={() => setForm(f => ({ ...f, complexity: v }))} style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1px solid ${form.complexity === v ? COMPLEXITY[v].color : "#1e2235"}`, background: form.complexity === v ? COMPLEXITY[v].color + "22" : "transparent", color: form.complexity === v ? COMPLEXITY[v].color : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>LV{v}</button>))}</div></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}><Btn onClick={() => setShowForm(false)} variant="ghost">Huỷ</Btn><Btn onClick={addTask}>✓ Thêm Task</Btn></div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}><div style={{ fontSize: 48, marginBottom: 12 }}>📋</div><div style={{ fontSize: 16, fontWeight: 600 }}>Chưa có task nào</div><div style={{ fontSize: 13, marginTop: 6 }}>Nhấn "+ Thêm Task" để bắt đầu phân công</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {filtered.map(t => {
            const member = members.find(m => m.id === t.assignee);
            const mIdx = member ? members.indexOf(member) : 0;
            const mc = MEMBER_COLORS[mIdx % MEMBER_COLORS.length];
            const sc = STATUS[t.status];
            const od = overdue(t);
            return (
              <div key={t.id} style={{ background: "#13131a", border: `1px solid ${t.status === "done" ? "#166534" : od ? "#7f1d1d" : "#1e2235"}`, borderRadius: 14, padding: 18, transition: "transform .15s,box-shadow .15s", cursor: "default" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ background: mc + "22", color: mc, border: `1px solid ${mc}44`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{member ? member.name.split(" ").pop() : "?"}</span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}><Tag color={COMPLEXITY[t.complexity].color}>LV{t.complexity} {COMPLEXITY[t.complexity].label}</Tag><button onClick={() => setTasks(ts => ts.filter(x => x.id !== t.id))} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 18 }}>×</button></div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.status === "done" ? "#4ade80" : "#e2e8f0", textDecoration: t.status === "done" ? "line-through" : "none", marginBottom: 10, lineHeight: 1.4 }}>{t.name}</div>
                {t.deadline && <div style={{ fontSize: 12, color: od ? "#f87171" : "#475569", marginBottom: 12 }}>{od ? "⚠️ Quá hạn: " : "📅 "}{new Date(t.deadline + "T00:00:00").toLocaleDateString("vi-VN")}</div>}
                <button onClick={() => cycleStatus(t.id)} style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${sc.color}44`, background: sc.color + "18", color: sc.color, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = sc.color + "30"}
                  onMouseLeave={e => e.currentTarget.style.background = sc.color + "18"}>
                  {t.status === "todo" ? "⬜" : t.status === "doing" ? "🔄" : "✅"} {sc.label} <span style={{ opacity: .5, fontSize: 11 }}>→ click đổi</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PEER REVIEW TAB ──────────────────────────────────────────────────────────
function PeerTab({ members, peerScores, setPeerScores }) {
  const [reviewer, setReviewer] = useState("");

  const setScore = (reviewee, criterion, val) => {
    setPeerScores(ps => {
      const next = { ...ps };
      if (!next[reviewer]) next[reviewer] = {};
      if (!next[reviewer][reviewee]) next[reviewer][reviewee] = {};
      next[reviewer][reviewee][criterion] = val;
      return next;
    });
  };

  const getScore = (reviewee, criterion) => peerScores?.[reviewer]?.[reviewee]?.[criterion] ?? 0;
  const reviewees = members.filter(m => m.id !== reviewer);
  const reviewerMember = members.find(m => m.id === reviewer);
  const completedCount = members.length < 2 ? 0 : members.filter(m => {
    if (!peerScores[m.id]) return false;
    return members.filter(x => x.id !== m.id).every(reviewee => PEER_CRITERIA.every(c => (peerScores[m.id][reviewee.id]?.[c] ?? 0) > 0));
  }).length;

  if (members.length < 2) return <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}><div style={{ fontSize: 48, marginBottom: 12 }}>👥</div><div style={{ fontSize: 16 }}>Cần ít nhất 2 thành viên để thực hiện đánh giá peer.</div></div>;

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: "#94a3b8", fontWeight: 600, flexShrink: 0 }}>Bạn là:</div>
          <div style={{ flex: 1, maxWidth: 360 }}><Select value={reviewer} onChange={setReviewer}><option value="">Chọn tên của bạn...</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
          {members.length >= 2 && <div style={{ fontSize: 13, color: "#475569" }}>✅ Đã hoàn thành: <b style={{ color: "#22c55e" }}>{completedCount}</b>/{members.length} thành viên</div>}
        </div>
        {reviewer && <div style={{ marginTop: 14, padding: "10px 14px", background: "#1e1b4b", borderRadius: 10, fontSize: 13, color: "#818cf8" }}>Chào <b>{reviewerMember?.name}</b>! Hãy đánh giá {reviewees.length} thành viên còn lại theo thang điểm bên dưới.</div>}
      </Card>

      {!reviewer ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}><div style={{ fontSize: 48, marginBottom: 12 }}>👆</div><div style={{ fontSize: 16 }}>Chọn tên của bạn để bắt đầu đánh giá</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {reviewees.map((reviewee) => {
            const mc = MEMBER_COLORS[members.indexOf(reviewee) % MEMBER_COLORS.length];
            const scores = PEER_CRITERIA.map(c => getScore(reviewee.id, c));
            const rowAvg = avg(scores.filter(s => s > 0));
            return (
              <Card key={reviewee.id} style={{ borderColor: "#1e2235" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: mc, flexShrink: 0 }}>{reviewee.name.split(" ").pop().charAt(0)}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>{reviewee.name}</div>{reviewee.mssv && <div style={{ fontSize: 12, color: "#475569" }}>{reviewee.mssv}</div>}</div>
                  {rowAvg > 0 && <Tag color={rowAvg >= 8 ? "#22c55e" : rowAvg >= 6 ? "#f59e0b" : "#ef4444"}>TB: {rowAvg.toFixed(1)}</Tag>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  {PEER_CRITERIA.map(c => (<div key={c}><div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>{c}</div><RatingSelect value={getScore(reviewee.id, c)} onChange={v => setScore(reviewee.id, c, v)} /></div>))}
                </div>
              </Card>
            );
          })}
          <div style={{ textAlign: "center", paddingTop: 8 }}><Btn onClick={() => setReviewer("")} variant="success">✓ Đã đánh giá xong — Thoát</Btn></div>
        </div>
      )}
    </div>
  );
}

// ─── LEADER TAB ───────────────────────────────────────────────────────────────
function LeaderTab({ members, leader, leaderScores, setLeaderScores }) {
  const leaderMember = members.find(m => m.id === leader);
  const setScore = (memberId, criterion, val) => { setLeaderScores(ls => ({ ...ls, [memberId]: { ...(ls[memberId] || {}), [criterion]: val } })); };
  const getScore = (memberId, criterion) => leaderScores?.[memberId]?.[criterion] ?? 0;

  if (!leader) return <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}><div style={{ fontSize: 48, marginBottom: 12 }}>👑</div><div style={{ fontSize: 16 }}>Chưa chọn nhóm trưởng. Vào tab <b style={{ color: "#a5b4fc" }}>Thiết lập</b> để chọn.</div></div>;

  const others = members.filter(m => m.id !== leader);
  if (others.length === 0) return <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}><div style={{ fontSize: 48, marginBottom: 12 }}>👥</div><div style={{ fontSize: 16 }}>Nhóm chỉ có nhóm trưởng, chưa có thành viên để đánh giá.</div></div>;

  return (
    <div>
      <Card style={{ marginBottom: 20, borderColor: "#451a03" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ fontSize: 28 }}>👑</div><div><div style={{ fontSize: 15, fontWeight: 700, color: "#fcd34d" }}>Nhóm trưởng: {leaderMember?.name}</div><div style={{ fontSize: 13, color: "#92400e" }}>Đánh giá {others.length} thành viên theo 3 tiêu chí.</div></div></div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {others.map(m => {
          const mc = MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length];
          const scores = LEADER_CRITERIA.map(c => getScore(m.id, c));
          const mAvg = avg(scores.filter(s => s > 0));
          return (
            <Card key={m.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: mc, flexShrink: 0 }}>{m.name.split(" ").pop().charAt(0)}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</div>
                {mAvg > 0 && <Tag color={mAvg >= 8 ? "#22c55e" : mAvg >= 6 ? "#f59e0b" : "#ef4444"}>Điểm TB: {mAvg.toFixed(1)}</Tag>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {LEADER_CRITERIA.map(c => (<div key={c}><div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600 }}>{c}</div><RatingSelect value={getScore(m.id, c)} onChange={v => setScore(m.id, c, v)} /></div>))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESULT TAB ───────────────────────────────────────────────────────────────
function ResultTab({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore }) {
  const results = useMemo(() => {
    if (members.length === 0) return [];
    return members.map(m => {
      const myTasks = tasks.filter(t => t.assignee === m.id);
      let taskScore = 100;
      if (myTasks.length > 0) {
        const totalPossible = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100, 0);
        const earned = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100 * STATUS[t.status].pct, 0);
        taskScore = totalPossible > 0 ? (earned / totalPossible) * 100 : 100;
      }
      const receivedScores = []; members.forEach(r => { if (r.id === m.id) return; PEER_CRITERIA.forEach(c => { const s = peerScores?.[r.id]?.[m.id]?.[c] ?? 0; if (s > 0) receivedScores.push(s); }); });
      const peerScore = receivedScores.length > 0 ? avg(receivedScores) * 10 : 100;
      const lScores = LEADER_CRITERIA.map(c => leaderScores?.[m.id]?.[c] ?? 0).filter(s => s > 0);
      const leaderScore = lScores.length > 0 ? avg(lScores) * 10 : 100;
      const isLeader = m.id === leader;
      const finalScore = isLeader ? taskScore * 0.4 + peerScore * 0.6 : taskScore * 0.4 + peerScore * 0.4 + leaderScore * 0.2;
      return { ...m, taskScore, peerScore, leaderScore, finalScore, isLeader, myTasks: myTasks.length, doneTasks: myTasks.filter(t => t.status === "done").length };
    });
  }, [members, tasks, peerScores, leaderScores, leader]);

  const totalScore = results.reduce((s, r) => s + r.finalScore, 0);
  const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);
  const maxFinal = Math.max(...results.map(r => r.finalScore), 1);
  const teamAvg = avg(results.map(r => r.finalScore));
  const ts = parseFloat(teacherScore);
  const hasTeacherScore = !isNaN(ts) && ts >= 0 && ts <= 10;
  const pctOf = (score) => totalScore > 0 ? (score / totalScore) * 100 : (100 / (members.length || 1));
  const personalGrade = (score) => hasTeacherScore ? ts * (pctOf(score) / 100) * members.length : null;

  return (
    <div>
      <Card style={{ marginBottom: 24, borderColor: "#1e3a5f", background: "linear-gradient(135deg,#0c1929,#13131a)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ fontSize: 36 }}>🎓</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800, color: "#93c5fd", marginBottom: 4 }}>Điểm thầy/cô cho nhóm</div><div style={{ fontSize: 13, color: "#475569" }}>Nhập điểm thầy chấm (thang 10) → app tự tính điểm cá nhân theo % đóng góp</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="number" min="0" max="10" step="0.1" value={teacherScore} onChange={e => setTeacherScore(e.target.value)} placeholder="VD: 9" style={{ width: 100, background: "#0a0a10", border: "2px solid #1e3a5f", borderRadius: 12, padding: "12px 16px", color: "#93c5fd", fontSize: 22, fontWeight: 800, textAlign: "center" }} />
            <div style={{ fontSize: 13, color: "#334155" }}>/ 10</div>
          </div>
          {hasTeacherScore && <div style={{ background: "#0c2a1a", border: "1px solid #166534", borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "#86efac" }}><div style={{ fontWeight: 700 }}>📐 Công thức:</div><div>Điểm cá nhân = {ts} × (% đóng góp / 100) × {members.length} thành viên</div></div>}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Điểm TB hệ thống", value: teamAvg.toFixed(1), icon: "📊", color: "#6366f1", sub: "thang 100" },
          { label: hasTeacherScore ? "Điểm thầy cho" : "Chờ điểm thầy", value: hasTeacherScore ? ts.toFixed(1) : "—", icon: "🎓", color: "#3b82f6", sub: "thang 10" },
          { label: "Điểm cá nhân cao nhất", value: hasTeacherScore && results.length ? Math.max(...results.map(r => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⭐", color: "#22c55e", sub: "thang 10" },
          { label: "Điểm cá nhân thấp nhất", value: hasTeacherScore && results.length ? Math.min(...results.map(r => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⚠️", color: "#f59e0b", sub: "thang 10" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: s.color, margin: "8px 0 2px" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#334155", marginBottom: 2 }}>{s.sub}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 24px", background: "#0a0a10", borderBottom: "1px solid #1e2235", display: "grid", gridTemplateColumns: "170px 80px 80px 80px 90px 130px 90px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: "#475569", textTransform: "uppercase", gap: 8, alignItems: "center" }}>
          <span>Thành viên</span><span style={{ textAlign: "center" }}>Task</span><span style={{ textAlign: "center" }}>Peer</span><span style={{ textAlign: "center" }}>Leader</span><span style={{ textAlign: "center" }}>Tổng (100)</span><span style={{ textAlign: "center" }}>% Đóng góp</span><span style={{ textAlign: "center" }}>{hasTeacherScore ? "Điểm thực" : "Chờ điểm"}</span>
        </div>
        {sorted.map((r) => {
          const memberIndex = members.findIndex(m => m.id === r.id);
          const mc = MEMBER_COLORS[memberIndex >= 0 ? memberIndex % MEMBER_COLORS.length : 0];
          const pct = pctOf(r.finalScore);
          const pg = personalGrade(r.finalScore);
          const pgColor = pg === null ? "#475569" : pg >= 8.5 ? "#22c55e" : pg >= 7 ? "#6366f1" : pg >= 5.5 ? "#f59e0b" : "#ef4444";
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "170px 80px 80px 80px 90px 130px 90px", padding: "14px 24px", borderBottom: "1px solid #0f111a", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: mc }}>{r.name.split(" ").pop().charAt(0)}</div>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{r.name}</div><div style={{ fontSize: 11, color: "#334155" }}>{r.myTasks > 0 ? `${r.doneTasks}/${r.myTasks} task xong` : "Chưa có task"}</div></div>
              </div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "#22c55e" }}>{r.taskScore.toFixed(0)}</div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "#22c55e" }}>{r.peerScore.toFixed(0)}</div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "#22c55e" }}>{r.isLeader ? "–" : r.leaderScore.toFixed(0)}</div>
              <div style={{ textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: "#a5b4fc", marginBottom: 4 }}>{r.finalScore.toFixed(1)}</div><ProgressBar value={r.finalScore} max={maxFinal} color={mc} /></div>
              <div style={{ textAlign: "center" }}><div style={{ background: mc + "18", border: `1px solid ${mc}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block", minWidth: 80 }}><div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: mc }}>{pct.toFixed(1)}%</div><div style={{ fontSize: 10, color: mc + "99" }}>đóng góp</div></div></div>
              <div style={{ textAlign: "center" }}>{pg !== null ? <div style={{ background: pgColor + "18", border: `1px solid ${pgColor}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block", minWidth: 70 }}><div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: pgColor }}>{pg.toFixed(2)}</div><div style={{ fontSize: 10, color: pgColor + "99" }}>/ 10</div></div> : <span style={{ color: "#1e2235", fontSize: 20 }}>—</span>}</div>
            </div>
          );
        })}
        <div style={{ display: "grid", gridTemplateColumns: "170px 80px 80px 80px 90px 130px 90px", padding: "14px 24px", background: "#0a0a10", alignItems: "center", gap: 8, borderTop: "2px solid #1e2235" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>Trung bình nhóm</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{avg(results.map(r => r.taskScore)).toFixed(1)}</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{avg(results.map(r => r.peerScore)).toFixed(1)}</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{avg(results.filter(r => !r.isLeader).map(r => r.leaderScore)).toFixed(1)}</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: "#a5b4fc" }}>{teamAvg.toFixed(1)}</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 13, color: "#6366f1" }}>100%</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: hasTeacherScore ? "#93c5fd" : "#334155" }}>{hasTeacherScore ? ts.toFixed(1) : "—"}</div>
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
  const [isCopied, setIsCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Lấy groupId từ URL hoặc tạo mới
  const [groupId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("id") || uid();
  });

  // Load dữ liệu từ localStorage khi mở trang
  useEffect(() => {
    const saved = localStorage.getItem(`team_${groupId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.projectName) setProjectName(data.projectName);
        if (data.leader) setLeader(data.leader);
        if (data.members) setMembers(data.members);
        if (data.tasks) setTasks(data.tasks);
        if (data.peerScores) setPeerScores(data.peerScores);
        if (data.leaderScores) setLeaderScores(data.leaderScores);
        if (data.teacherScore) setTeacherScore(data.teacherScore);
      } catch (e) {}
    }
    setIsReady(true);
  }, [groupId]);

  // Lắng nghe sự kiện từ tab khác (QUAN TRỌNG: giúp đồng bộ realtime)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `team_${groupId}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data.projectName) setProjectName(data.projectName);
          if (data.leader) setLeader(data.leader);
          if (data.members) setMembers(data.members);
          if (data.tasks) setTasks(data.tasks);
          if (data.peerScores) setPeerScores(data.peerScores);
          if (data.leaderScores) setLeaderScores(data.leaderScores);
          if (data.teacherScore) setTeacherScore(data.teacherScore);
        } catch (e) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [groupId]);

  // Lưu dữ liệu vào localStorage mỗi khi state thay đổi
  useEffect(() => {
    if (!isReady) return;
    const data = { projectName, leader, members, tasks, peerScores, leaderScores, teacherScore };
    localStorage.setItem(`team_${groupId}`, JSON.stringify(data));
  }, [projectName, leader, members, tasks, peerScores, leaderScores, teacherScore, groupId, isReady]);

  const generateShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?id=${groupId}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const peerCompletedCount = members.length >= 2 ? members.filter(m => {
    if (!peerScores[m.id]) return false;
    return members.filter(x => x.id !== m.id).every(r => PEER_CRITERIA.every(c => (peerScores[m.id][r.id]?.[c] ?? 0) > 0));
  }).length : null;

  const tabBadge = {
    tasks: tasks.length || null,
    peer: peerCompletedCount !== null ? `${peerCompletedCount}/${members.length}` : null,
    result: null,
  };

  if (!isReady) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0a0a10", color: "#a5b4fc" }}>Đang tải...</div>;
  }

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "#0a0a10", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      <div style={{ background: "linear-gradient(135deg,#0f0c29,#1a1040,#0f0c29)", borderBottom: "1px solid #1e2235", padding: "0 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✦</div>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: "#a5b4fc", letterSpacing: 2 }}>TEAM EVAL</div>
              <div style={{ fontSize: 11, color: "#5c54c7", letterSpacing: 3, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName || "BỘ CÔNG CỤ ĐÁNH GIÁ NHÓM"}</div>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 4, background: "#0a0a10", borderRadius: 14, padding: 5 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all .2s", background: tab === t.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: tab === t.id ? "#fff" : "#4a5568", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {tabBadge[t.id] && (
                  <span style={{ background: tab === t.id ? "rgba(255,255,255,.25)" : "#1e2235", borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 800 }}>{tabBadge[t.id]}</span>
                )}
              </button>
            ))}
          </nav>

          <div>
            <Btn onClick={generateShareLink} variant={isCopied ? "success" : "primary"} style={{ padding: "8px 16px", fontSize: 12 }}>
              {isCopied ? "✓ Đã copy link nhóm!" : "🔗 Sinh link riêng biệt"}
            </Btn>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 32px" }}>
        {tab === "setup" && <SetupTab members={members} setMembers={setMembers} projectName={projectName} setProjectName={setProjectName} leader={leader} setLeader={setLeader} />}
        {tab === "tasks" && <TaskTab members={members} tasks={tasks} setTasks={setTasks} />}
        {tab === "peer" && <PeerTab members={members} peerScores={peerScores} setPeerScores={setPeerScores} />}
        {tab === "leader" && <LeaderTab members={members} leader={leader} leaderScores={leaderScores} setLeaderScores={setLeaderScores} />}
        {tab === "result" && <ResultTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} teacherScore={teacherScore} setTeacherScore={setTeacherScore} />}
      </div>
    </div>
  );
}
