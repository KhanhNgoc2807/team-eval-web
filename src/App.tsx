import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { database, ref, set, onValue } from './firebase';

// ==================== CONSTANTS ====================
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
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// ==================== THEME ====================
type Theme = "dark" | "light";
const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem("theme") as Theme | null;
  if (saved) return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const themeStyles = {
  dark: {
    bg: "#0a0a10",
    cardBg: "#13131a",
    border: "#1e2235",
    text: "#e2e8f0",
    textMuted: "#475569",
    headerBg: "linear-gradient(135deg,#0f0c29,#1a1040,#0f0c29)",
    inputBg: "#0a0a10",
  },
  light: {
    bg: "#f3f4f6",
    cardBg: "#ffffff",
    border: "#e2e8f0",
    text: "#1e293b",
    textMuted: "#64748b",
    headerBg: "linear-gradient(135deg,#e0e7ff,#c7d2fe,#e0e7ff)",
    inputBg: "#ffffff",
  }
};

// ==================== UI COMPONENTS ====================
const Tag = ({ color, children, style = {} }: { color: string; children: React.ReactNode; style?: React.CSSProperties }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, ...style }}>{children}</span>
);

const Card = ({ children, style = {}, theme }: { children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) => {
  const styles = themeStyles[theme];
  return <div style={{ background: styles.cardBg, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 24, ...style }}>{children}</div>;
};

const Btn = ({ children, onClick, variant = "primary", style = {}, disabled = false, theme }: any) => {
  const styles = themeStyles[theme];
  const base = { border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: disabled ? 0.4 : 1 };
  const vars: Record<string, React.CSSProperties> = { 
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }, 
    ghost: { background: "transparent", border: `1px solid ${styles.border}`, color: styles.textMuted }, 
    danger: { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }, 
    success: { background: "#052e16", color: "#86efac", border: "1px solid #166534" } 
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
};

const Input = ({ value, onChange, placeholder, style = {}, type = "text", onKeyDown, theme }: any) => {
  const styles = themeStyles[theme];
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: styles.text, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...style }}
    onFocus={e => e.currentTarget.style.borderColor = "#6366f1"} onBlur={e => e.currentTarget.style.borderColor = styles.border} onKeyDown={onKeyDown} />
};

const Select = ({ value, onChange, children, style = {}, theme }: any) => {
  const styles = themeStyles[theme];
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: value ? styles.text : styles.textMuted, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer", ...style }}>{children}</select>;
};

const RatingSelect = ({ value, onChange, theme }: any) => {
  const styles = themeStyles[theme];
  return <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 8, padding: "7px 10px", color: styles.text, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
    {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
};

const ProgressBar = ({ value, max, color = "#6366f1" }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ height: 8, background: "#1e2235", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4 }} /></div>;
};

const lbl = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const filterBtn = (theme: Theme) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${themeStyles[theme].border}`, background: "transparent", color: themeStyles[theme].textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 });
const filterActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

// ==================== TABS COMPONENTS ====================

const SetupTab = ({ members, setMembers, projectName, setProjectName, leader, setLeader, theme }: any) => {
  const [name, setName] = useState("");
  const [mssv, setMssv] = useState("");
  const styles = themeStyles[theme];
  const add = () => { if (!name.trim()) return; setMembers((m: any[]) => [...m, { id: uid(), name: name.trim(), mssv: mssv.trim() }]); setName(""); setMssv(""); };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <Card theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>⚙️ THIẾT LẬP</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Tên dự án / môn học</label><Input value={projectName} onChange={setProjectName} placeholder="VD: Dự án Marketing - Học kỳ 2" theme={theme} /></div>
          <div><label style={lbl}>Trưởng nhóm</label><Select value={leader} onChange={setLeader} theme={theme}><option value="">Chọn trưởng nhóm...</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: styles.inputBg, borderRadius: 12, fontSize: 13, color: styles.textMuted }}>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 CÔNG THỨC TÍNH ĐIỂM</div>
          <div>Thành viên = <b>Công việc × 40%</b> + <b>Đánh giá đồng đội × 40%</b> + <b>Đánh giá trưởng nhóm × 20%</b></div>
          <div>Trưởng nhóm = <b>Công việc × 40%</b> + <b>Đánh giá đồng đội × 60%</b></div>
        </div>
      </Card>
      <Card theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>👥 DANH SÁCH THÀNH VIÊN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
          <Input value={name} onChange={setName} placeholder="Họ và tên" onKeyDown={(e: any) => e.key === "Enter" && add()} theme={theme} />
          <Input value={mssv} onChange={setMssv} placeholder="Mã số sinh viên" onKeyDown={(e: any) => e.key === "Enter" && add()} theme={theme} />
          <Btn onClick={add} theme={theme}>Thêm</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {members.length === 0 && <div style={{ textAlign: "center", padding: 40, color: styles.textMuted }}>Chưa có thành viên nào</div>}
          {members.map((m: any, i: number) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: styles.inputBg, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: MEMBER_COLORS[i % MEMBER_COLORS.length] + "22", border: `2px solid ${MEMBER_COLORS[i % MEMBER_COLORS.length]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }}>
                {m.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}><div>{m.name}</div>{m.mssv && <div style={{ fontSize: 11, color: styles.textMuted }}>{m.mssv}</div>}</div>
              {leader === m.id && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
              <button onClick={() => setMembers((ms: any[]) => ms.filter((x: any) => x.id !== m.id))} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const TaskTab = ({ members, tasks, setTasks, theme }: any) => {
  const [form, setForm] = useState({ name: "", assignees: [] as string[], deadline: "", complexity: 2 });
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const styles = themeStyles[theme];
  
  const addTask = () => { 
    if (!form.name.trim() || form.assignees.length === 0) return; 
    setTasks((t: any[]) => [...t, { id: uid(), name: form.name, assignees: form.assignees, deadline: form.deadline, complexity: form.complexity, status: "todo" }]); 
    setForm({ name: "", assignees: [], deadline: "", complexity: 2 }); 
    setShowForm(false); 
  };
  
  const toggleAssignee = (memberId: string) => {
    setForm((f: any) => ({
      ...f,
      assignees: f.assignees.includes(memberId) ? f.assignees.filter((id: string) => id !== memberId) : [...f.assignees, memberId]
    }));
  };

  const cycleStatus = (id: string) => { 
    const order = ["todo", "doing", "done"]; 
    setTasks((ts: any[]) => ts.map((t: any) => t.id !== id ? t : { ...t, status: order[(order.indexOf(t.status) + 1) % 3] })); 
  };
  
  const filtered = filter === "all" ? tasks : tasks.filter((t: any) => t.assignees?.includes(filter));
  const overdue = (t: any) => { if (!t.deadline || t.status === "done") return false; return new Date(t.deadline) < new Date(); };
  
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} style={{ ...filterBtn(theme), ...(filter === "all" ? filterActive : {}) }}>Tất cả ({tasks.length})</button>
        {members.map((m: any) => (
          <button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)} style={{ ...filterBtn(theme), ...(filter === m.id ? { borderColor: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], color: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length] } : {}) }}>
            {m.name} ({tasks.filter((t: any) => t.assignees?.includes(m.id)).length})
          </button>
        ))}
        <Btn onClick={() => setShowForm(true)} theme={theme}>+ Thêm</Btn>
      </div>
      
      {showForm && (
        <Card theme={theme} style={{ marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12 }}>
            <div><label style={lbl}>Tên công việc</label><Input value={form.name} onChange={v => setForm((f: any) => ({ ...f, name: v }))} theme={theme} /></div>
            <div><label style={lbl}>Giao cho</label><Select value="" onChange={() => {}} theme={theme}>{members.map(m => <option key={m.id} onClick={() => toggleAssignee(m.id)}>{form.assignees.includes(m.id) ? "✓ " : "○ "}{m.name}</option>)}</Select></div>
            <div><label style={lbl}>Hạn</label><Input type="date" value={form.deadline} onChange={v => setForm((f: any) => ({ ...f, deadline: v }))} theme={theme} /></div>
            <div><Btn onClick={addTask} theme={theme}>Thêm</Btn></div>
          </div>
        </Card>
      )}
      
      <div style={{ display: "grid", gap: 14 }}>
        {filtered.map((t: any) => (
          <Card key={t.id} theme={theme}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{t.name}</span>
              <Tag color={COMPLEXITY[t.complexity].color}>Cấp {t.complexity}</Tag>
            </div>
            <div style={{ fontSize: 12, color: styles.textMuted, marginTop: 8 }}>👥 {members.filter((m: any) => t.assignees?.includes(m.id)).map((m: any) => m.name).join(", ")}</div>
            <button onClick={() => cycleStatus(t.id)} style={{ marginTop: 12, width: "100%", padding: 8, borderRadius: 8, border: `1px solid ${STATUS[t.status].color}44`, background: STATUS[t.status].color + "18", color: STATUS[t.status].color, cursor: "pointer" }}>
              {STATUS[t.status].label}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};

const PeerTab = ({ members, peerScores, setPeerScores, theme }: any) => {
  const [reviewer, setReviewer] = useState("");
  const [tempScores, setTempScores] = useState<any>({});
  const styles = themeStyles[theme];
  const reviewees = members.filter((m: any) => m.id !== reviewer);
  
  const submitAllReviews = () => {
    let allDone = true;
    reviewees.forEach((reviewee: any) => { PEER_CRITERIA.forEach(c => { if (!tempScores[reviewee.id]?.[c]) allDone = false; }); });
    if (!allDone) return alert("Vui lòng đánh giá đầy đủ!");
    
    setPeerScores((prev: any) => {
      const next = { ...prev };
      reviewees.forEach((reviewee: any) => {
        PEER_CRITERIA.forEach(criterion => {
          const score = tempScores[reviewee.id]?.[criterion];
          if (score) {
            if (!next[reviewee.id]) next[reviewee.id] = {};
            if (!next[reviewee.id][criterion]) next[reviewee.id][criterion] = [];
            next[reviewee.id][criterion].push(score);
          }
        });
      });
      next[reviewer] = { ...next[reviewer], completed: true };
      return next;
    });
    setTempScores({}); setReviewer("");
    alert("✅ Đã gửi đánh giá ẩn danh!");
  };

  const completedCount = Object.keys(peerScores).filter(k => peerScores[k]?.completed).length;
  
  if (members.length < 2) return <div style={{ textAlign: "center", padding: 80 }}>Cần ít nhất 2 thành viên</div>;
  
  return (
    <div>
      <Card theme={theme} style={{ marginBottom: 20, background: "#1e1b4b" }}>
        <div><h3 style={{ color: "#22c55e" }}>🔒 ĐÁNH GIÁ ẨN DANH</h3><p style={{ fontSize: 12 }}>Sau khi gửi, không ai biết ai đã đánh giá.</p></div>
      </Card>
      <Card theme={theme}>
        <Select value={reviewer} onChange={setReviewer} theme={theme}><option value="">Chọn tên của bạn...</option>{members.map((m: any) => <option key={m.id} value={m.id} disabled={peerScores[m.id]?.completed}>{m.name} {peerScores[m.id]?.completed ? "(✅ Đã đánh giá)" : ""}</option>)}</Select>
        <div style={{ marginTop: 10, fontSize: 13 }}>📊 Đã có <b>{completedCount}</b>/{members.length} người tham gia</div>
      </Card>
      {reviewer && !peerScores[reviewer]?.completed && (
        <>
          {reviewees.map((reviewee: any) => (
            <Card key={reviewee.id} theme={theme} style={{ marginTop: 16 }}>
              <h3>Đánh giá: {reviewee.name}</h3>
              {PEER_CRITERIA.map(c => (
                <div key={c} style={{ marginBottom: 12 }}>
                  <div>{c}</div>
                  <RatingSelect value={tempScores[reviewee.id]?.[c] || 0} onChange={v => setTempScores({ ...tempScores, [reviewee.id]: { ...tempScores[reviewee.id], [c]: v } })} theme={theme} />
                </div>
              ))}
            </Card>
          ))}
          <Btn onClick={submitAllReviews} variant="success" theme={theme} style={{ marginTop: 20 }}>🔒 Gửi đánh giá (ẩn danh)</Btn>
        </>
      )}
    </div>
  );
};

const LeaderTab = ({ members, leader, leaderScores, setLeaderScores, theme }: any) => {
  const styles = themeStyles[theme];
  const leaderMember = members.find((m: any) => m.id === leader);
  if (!leader) return <div style={{ textAlign: "center", padding: 80 }}>Chưa chọn trưởng nhóm.</div>;
  const others = members.filter((m: any) => m.id !== leader);
  return (
    <div>
      <Card theme={theme}><div>👑 Trưởng nhóm: <b>{leaderMember?.name}</b> đánh giá {others.length} thành viên</div></Card>
      {others.map((m: any) => (
        <Card key={m.id} theme={theme} style={{ marginTop: 16 }}>
          <h3>{m.name}</h3>
          {LEADER_CRITERIA.map(c => (
            <div key={c} style={{ marginBottom: 12 }}><div>{c}</div><RatingSelect value={leaderScores[m.id]?.[c] || 0} onChange={v => setLeaderScores((prev: any) => ({ ...prev, [m.id]: { ...prev[m.id], [c]: v } }))} theme={theme} /></div>
          ))}
        </Card>
      ))}
    </div>
  );
};

const ScheduleTab = ({ members, scheduleSlots, setScheduleSlots, scheduleSelections, setScheduleSelections, theme }: any) => {
  const [newSlot, setNewSlot] = useState({ date: "", start: "", end: "" });
  const [selectedMember, setSelectedMember] = useState("");
  const styles = themeStyles[theme];
  const addSlot = () => { if (!newSlot.date || !newSlot.start || !newSlot.end) return; setScheduleSlots((prev: any[]) => [...prev, { id: uid(), ...newSlot, label: `${newSlot.date} ${newSlot.start}-${newSlot.end}` }]); setNewSlot({ date: "", start: "", end: "" }); };
  const toggle = (slotId: string) => { if (!selectedMember) return; setScheduleSelections((prev: any) => ({ ...prev, [selectedMember]: { ...prev[selectedMember], [slotId]: !prev[selectedMember]?.[slotId] } })); };
  const totals = useMemo(() => {
    const res: any = {};
    scheduleSlots.forEach((s: any) => { res[s.id] = members.filter((m: any) => scheduleSelections[m.id]?.[s.id]).length; });
    return res;
  }, [scheduleSlots, scheduleSelections, members]);
  return (
    <div>
      <Card theme={theme}>
        <h3>📅 KHẢO SÁT LỊCH</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 16 }}>
          <Input type="date" value={newSlot.date} onChange={v => setNewSlot({ ...newSlot, date: v })} theme={theme} />
          <Input type="time" value={newSlot.start} onChange={v => setNewSlot({ ...newSlot, start: v })} theme={theme} />
          <Input type="time" value={newSlot.end} onChange={v => setNewSlot({ ...newSlot, end: v })} theme={theme} />
          <Btn onClick={addSlot} theme={theme}>Thêm</Btn>
        </div>
        <Select value={selectedMember} onChange={setSelectedMember} theme={theme}><option value="">Chọn tên bạn...</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
        {selectedMember && scheduleSlots.map(slot => (
          <div key={slot.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8, borderBottom: `1px solid ${styles.border}` }}>
            <span>{slot.label}</span>
            <button onClick={() => toggle(slot.id)} style={{ width: 32, height: 32, background: scheduleSelections[selectedMember]?.[slot.id] ? "#22c55e" : styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 6, cursor: "pointer", color: scheduleSelections[selectedMember]?.[slot.id] ? "#fff" : styles.textMuted }}>{scheduleSelections[selectedMember]?.[slot.id] ? "✓" : "○"}</button>
            <span>{totals[slot.id]}/{members.length} người rảnh</span>
          </div>
        ))}
      </Card>
    </div>
  );
};

const AnalysisTab = ({ members, tasks, peerScores, leaderScores, leader, theme }: any) => {
  const styles = themeStyles[theme];
  const getMemberScores = (memberId: string) => {
    const res: any = { "Chất lượng công việc": [], "Chủ động & Đúng tiến độ": [], "Tinh thần hợp tác": [] };
    Object.keys(peerScores).forEach(reviewerId => {
      if (reviewerId === memberId) return;
      const data = peerScores[reviewerId]?.[memberId];
      if (data) PEER_CRITERIA.forEach(c => { if (data[c]) res[c].push(...data[c]); });
    });
    if (leaderScores[memberId]) {
      if (leaderScores[memberId]["Chủ động & Trách nhiệm"]) res["Chủ động & Đúng tiến độ"].push(leaderScores[memberId]["Chủ động & Trách nhiệm"]);
      if (leaderScores[memberId]["Chất lượng Output"]) res["Chất lượng công việc"].push(leaderScores[memberId]["Chất lượng Output"]);
      if (leaderScores[memberId]["Phối hợp Nhóm"]) res["Tinh thần hợp tác"].push(leaderScores[memberId]["Phối hợp Nhóm"]);
    }
    const avgScores: any = {};
    PEER_CRITERIA.forEach(c => { avgScores[c] = res[c].length ? avg(res[c]) : 0; });
    return avgScores;
  };
  const teamAvg = useMemo(() => {
    const sums: any = { "Chất lượng công việc": 0, "Chủ động & Đúng tiến độ": 0, "Tinh thần hợp tác": 0 };
    members.forEach(m => { const s = getMemberScores(m.id); PEER_CRITERIA.forEach(c => { sums[c] += s[c]; }); });
    return PEER_CRITERIA.map(c => ({ c, v: sums[c] / members.length || 0 }));
  }, [members, peerScores, leaderScores]);
  return (
    <div>
      <Card theme={theme}><h3>📈 THỐNG KÊ NHÓM</h3>{teamAvg.map(({ c, v }: any) => <div key={c}>{c}: <b>{v.toFixed(1)}</b>/10</div>)}</Card>
      {members.map(m => {
        const scores = getMemberScores(m.id);
        const avgScore = avg(PEER_CRITERIA.map(c => scores[c]));
        return <Card key={m.id} theme={theme} style={{ marginTop: 16 }}><b>{m.name}</b>: Điểm TB {avgScore.toFixed(1)}/10</Card>;
      })}
    </div>
  );
};

const ResultTab = ({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore, theme }: any) => {
  const styles = themeStyles[theme];
  const getPeerScore = (memberId: string) => {
    const all: number[] = [];
    Object.keys(peerScores).forEach(rid => {
      if (rid === memberId) return;
      const data = peerScores[rid]?.[memberId];
      if (data) PEER_CRITERIA.forEach(c => { if (data[c]) all.push(...data[c]); });
    });
    return all.length ? avg(all) * 10 : 100;
  };
  const results = members.map((m: any) => {
    const myTasks = tasks.filter((t: any) => t.assignees?.includes(m.id));
    let taskScore = 100;
    if (myTasks.length) {
      const total = myTasks.reduce((s: number, t: any) => s + COMPLEXITY[t.complexity].pts * 100, 0);
      const earned = myTasks.reduce((s: number, t: any) => s + COMPLEXITY[t.complexity].pts * 100 * STATUS[t.status].pct, 0);
      taskScore = total ? (earned / total) * 100 : 100;
    }
    const peerScore = getPeerScore(m.id);
    const leaderScore = m.id === leader ? 0 : avg(LEADER_CRITERIA.map(c => leaderScores[m.id]?.[c] || 0)) * 10;
    const finalScore = m.id === leader ? taskScore * 0.4 + peerScore * 0.6 : taskScore * 0.4 + peerScore * 0.4 + leaderScore * 0.2;
    return { ...m, taskScore, peerScore, leaderScore, finalScore };
  });
  const total = results.reduce((s, r) => s + r.finalScore, 0);
  const ts = parseFloat(teacherScore);
  return (
    <div>
      <Card theme={theme}><div>🎓 Điểm giảng viên: <input type="number" value={teacherScore} onChange={e => setTeacherScore(e.target.value)} style={{ width: 80, padding: 8 }} /> / 10</div></Card>
      <Card theme={theme}>
        <table style={{ width: "100%" }}><thead><tr><th>Thành viên</th><th>Công việc</th><th>Đồng đội</th><th>Tổng</th></tr></thead><tbody>{results.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.taskScore.toFixed(0)}</td><td>{r.peerScore.toFixed(0)}</td><td><b>{r.finalScore.toFixed(1)}</b></td></tr>)}</tbody></table>
      </Card>
    </div>
  );
};

// ==================== MAIN APP ====================
export default function App() {
  const [tab, setTab] = useState("setup");
  const [projectName, setProjectName] = useState("");
  const [leader, setLeader] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [peerScores, setPeerScores] = useState({});
  const [leaderScores, setLeaderScores] = useState({});
  const [teacherScore, setTeacherScore] = useState("");
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [scheduleSelections, setScheduleSelections] = useState({});
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [isReady, setIsReady] = useState(false);
  
  // roomId có thể là null (khi chưa có nhóm)
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || null;
  });

  // Firebase Realtime - chỉ chạy khi có roomId
  useEffect(() => {
    if (!roomId) {
      setIsReady(true);
      return;
    }
    const dbRef = ref(database, `teams/${roomId}`);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProjectName(data.projectName || "");
        setLeader(data.leader || "");
        setMembers(data.members || []);
        setTasks(data.tasks || []);
        setPeerScores(data.peerScores || {});
        setLeaderScores(data.leaderScores || {});
        setTeacherScore(data.teacherScore || "");
        setScheduleSlots(data.scheduleSlots || []);
        setScheduleSelections(data.scheduleSelections || {});
      }
      setIsReady(true);
    });
    return () => unsubscribe();
  }, [roomId]);

  // Auto save to Firebase - chỉ khi có roomId
  useEffect(() => {
    if (!isReady || !roomId) return;
    const dbRef = ref(database, `teams/${roomId}`);
    set(dbRef, { projectName, leader, members, tasks, peerScores, leaderScores, teacherScore, scheduleSlots, scheduleSelections });
  }, [projectName, leader, members, tasks, peerScores, leaderScores, teacherScore, scheduleSlots, scheduleSelections, roomId, isReady]);

  // Update URL
  useEffect(() => {
    if (!isReady) return;
    if (roomId) {
      window.history.replaceState(null, "", `?room=${roomId}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [roomId, isReady]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const createNewGroup = () => {
    const newRoomId = uid();
    setRoomId(newRoomId);
    setProjectName(""); 
    setLeader(""); 
    setMembers([]); 
    setTasks([]); 
    setPeerScores({}); 
    setLeaderScores({}); 
    setTeacherScore(""); 
    setScheduleSlots([]); 
    setScheduleSelections({});
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("✅ Đã copy link!");
  };

  const styles = themeStyles[theme];
  const peerCount = members.length ? Object.keys(peerScores).filter(k => peerScores[k]?.completed).length : null;

  if (!isReady) return <div style={{ background: styles.bg, color: styles.text, textAlign: "center", padding: 50 }}>Đang tải...</div>;

  // Màn hình tạo nhóm mới (khi chưa có roomId)
  if (!roomId) {
    return (
      <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", background: styles.bg, color: styles.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Card style={{ textAlign: "center", maxWidth: 500, width: "100%" }} theme={theme}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🚀</div>
          <h2 style={{ color: "#a5b4fc", marginBottom: 12 }}>TEAM EVAL</h2>
          <p style={{ color: styles.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
            Công cụ đánh giá nhóm học tập trực tuyến<br />
            Tạo nhóm mới để bắt đầu
          </p>
          <Btn onClick={createNewGroup} variant="primary" theme={theme} style={{ padding: "12px 24px", fontSize: 16, width: "100%", maxWidth: 200 }}>
            ➕ Tạo nhóm mới
          </Btn>
        </Card>
      </div>
    );
  }

  // Giao diện chính (khi đã có nhóm) - không có nút tạo nhóm mới
  return (
    <div style={{ background: styles.bg, color: styles.text, minHeight: "100vh", fontFamily: "system-ui" }}>
      <div style={{ background: styles.headerBg, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
        <div><b>TEAM EVAL</b> {projectName && `- ${projectName}`}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleTheme} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>{theme === "dark" ? "☀️" : "🌙"}</button>
          <button onClick={copyLink} style={{ background: "#6366f1", border: "none", borderRadius: 8, padding: "4px 12px", color: "#fff", cursor: "pointer" }}>🔗 Copy link</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 4, background: styles.inputBg, padding: 8, overflowX: "auto", justifyContent: "center" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 16px", borderRadius: 20, border: "none", background: tab === t.id ? "#6366f1" : "transparent", color: tab === t.id ? "#fff" : styles.textMuted, cursor: "pointer", fontWeight: 600 }}>
            {t.icon} {t.label} {t.id === "peer" && peerCount !== null && <span style={{ marginLeft: 4, background: tab === t.id ? "#fff" : "#6366f1", color: tab === t.id ? "#6366f1" : "#fff", borderRadius: 10, padding: "0px 6px", fontSize: 11 }}>{peerCount}/{members.length}</span>}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        {tab === "setup" && <SetupTab members={members} setMembers={setMembers} projectName={projectName} setProjectName={setProjectName} leader={leader} setLeader={setLeader} theme={theme} />}
        {tab === "tasks" && <TaskTab members={members} tasks={tasks} setTasks={setTasks} theme={theme} />}
        {tab === "peer" && <PeerTab members={members} peerScores={peerScores} setPeerScores={setPeerScores} theme={theme} />}
        {tab === "leader" && <LeaderTab members={members} leader={leader} leaderScores={leaderScores} setLeaderScores={setLeaderScores} theme={theme} />}
        {tab === "schedule" && <ScheduleTab members={members} scheduleSlots={scheduleSlots} setScheduleSlots={setScheduleSlots} scheduleSelections={scheduleSelections} setScheduleSelections={setScheduleSelections} theme={theme} />}
        {tab === "analysis" && <AnalysisTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} theme={theme} />}
        {tab === "result" && <ResultTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} teacherScore={teacherScore} setTeacherScore={setTeacherScore} theme={theme} />}
      </div>
    </div>
  );
}
