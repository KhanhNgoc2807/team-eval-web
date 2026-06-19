import { useState, useMemo, useEffect, useCallback } from "react";
import { database, ref, set, onValue } from "./firebase";

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
  { id: "peer", icon: "👥", label: "Đánh giá & Nhận xét" },
  { id: "leader", icon: "👑", label: "Đánh giá trưởng nhóm" },
  { id: "schedule", icon: "📅", label: "Họp nhóm" },
  { id: "analysis", icon: "📊", label: "Phân tích" },
  { id: "result", icon: "🏆", label: "Kết quả" },
];
const uid = () => Math.random().toString(36).substring(2, 9);
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// ─── THEME ────────────────────────────────────────────────────────────────────
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

// ─── SUB COMPONENTS ───────────────────────────────────────────────────────────
function Tag({ color, children, style = {} }: { color: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, ...style }}>{children}</span>;
}

function Card({ children, style = {}, theme }: { children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) {
  const styles = themeStyles[theme];
  return <div className="card" style={{ background: styles.cardBg, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 24, ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", style = {}, disabled = false, theme }: { children: React.ReactNode; onClick?: () => void; variant?: string; style?: React.CSSProperties; disabled?: boolean; theme: Theme }) {
  const base = { border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: disabled ? 0.4 : 1 };
  const vars: Record<string, React.CSSProperties> = { 
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }, 
    ghost: { background: "transparent", border: `1px solid ${themeStyles[theme].border}`, color: themeStyles[theme].textMuted }, 
    danger: { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }, 
    success: { background: "#052e16", color: "#86efac", border: "1px solid #166534" } 
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style = {}, type = "text", onKeyDown, theme }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties; type?: string; onKeyDown?: (e: React.KeyboardEvent) => void; theme: Theme }) {
  const styles = themeStyles[theme];
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: styles.text, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...style }}
    onFocus={e => e.currentTarget.style.borderColor = "#6366f1"} onBlur={e => e.currentTarget.style.borderColor = styles.border} onKeyDown={onKeyDown} />;
}

function Select({ value, onChange, children, style = {}, theme }: { value: string; onChange: (v: string) => void; children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) {
  const styles = themeStyles[theme];
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: value ? styles.text : styles.textMuted, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer", ...style }}>{children}</select>;
}

function RatingSelect({ value, onChange, theme }: { value: number; onChange: (v: number) => void; theme: Theme }) {
  const styles = themeStyles[theme];
  return <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 8, padding: "7px 10px", color: styles.text, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
    {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

function ProgressBar({ value, max, color = "#6366f1" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ height: 8, background: "#1e2235", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4, transition: "width .5s ease" }} /></div>;
}

const lbl = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const filterBtn = (theme: Theme) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${themeStyles[theme].border}`, background: "transparent", color: themeStyles[theme].textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s" });
const filterActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

// ─── SCHEDULE TAB ─────────────────────────────────────────────────────────────
function ScheduleTab({ members, scheduleSlots, setScheduleSlots, scheduleSelections, setScheduleSelections, theme }: any) {
  const styles = themeStyles[theme];
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const addTimeSlot = () => {
    if (!newSlotDate || !newSlotStart || !newSlotEnd) return;
    const newSlot = {
      id: uid(),
      date: newSlotDate,
      start: newSlotStart,
      end: newSlotEnd,
      label: `${new Date(newSlotDate).toLocaleDateString("vi-VN")} - ${newSlotStart}→${newSlotEnd}`
    };
    setScheduleSlots((prev: any[]) => [...prev, newSlot]);
    setNewSlotDate("");
    setNewSlotStart("");
    setNewSlotEnd("");
    setShowCreateForm(false);
  };

  const deleteSlot = (slotId: string) => {
    setScheduleSlots((prev: any[]) => prev.filter(s => s.id !== slotId));
    const newSelections = { ...scheduleSelections };
    Object.keys(newSelections).forEach(memberId => {
      if (newSelections[memberId][slotId]) {
        delete newSelections[memberId][slotId];
      }
    });
    setScheduleSelections(newSelections);
  };

  const toggleSelection = (slotId: string) => {
    if (!selectedMember) return;
    setScheduleSelections((prev: any) => ({
      ...prev,
      [selectedMember]: {
        ...(prev[selectedMember] || {}),
        [slotId]: !(prev[selectedMember]?.[slotId] || false)
      }
    }));
  };

  const slotTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    scheduleSlots.forEach((slot: any) => {
      let count = 0;
      members.forEach((m: any) => {
        if (scheduleSelections[m.id]?.[slot.id]) count++;
      });
      totals[slot.id] = count;
    });
    return totals;
  }, [scheduleSlots, scheduleSelections, members]);

  const bestSlot = useMemo(() => {
    if (scheduleSlots.length === 0) return null;
    let best = scheduleSlots[0];
    let bestCount = 0;
    scheduleSlots.forEach((slot: any) => {
      if (slotTotals[slot.id] > bestCount) {
        bestCount = slotTotals[slot.id];
        best = slot;
      }
    });
    return { slot: best, count: bestCount, total: members.length };
  }, [scheduleSlots, slotTotals, members]);

  const copyResult = () => {
    if (!bestSlot) return;
    const text = `📅 KẾT QUẢ KHẢO SÁT LỊCH HỌP NHÓM\n\nKhung giờ được chọn nhiều nhất: ${bestSlot.slot.label}\n${bestSlot.count}/${bestSlot.total} người rảnh\n\nChi tiết:\n${scheduleSlots.map((slot: any) => {
      const available = members.filter((m: any) => scheduleSelections[m.id]?.[slot.id]).map((m: any) => m.name).join(", ");
      return `${slot.label}: ${slotTotals[slot.id]} người${available ? ` (${available})` : ""}`;
    }).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div>
      <Card theme={theme} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#a5b4fc" }}>📅 KHẢO SÁT LỊCH RẢNH</h3>
          <Btn onClick={() => setShowCreateForm(!showCreateForm)} variant="ghost" theme={theme}>
            {showCreateForm ? "✖ Đóng" : "+ Thêm khung giờ"}
          </Btn>
        </div>
        
        {showCreateForm && (
          <div style={{ background: styles.inputBg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div className="schedule-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div><label style={lbl}>Ngày</label><Input type="date" value={newSlotDate} onChange={setNewSlotDate} theme={theme} /></div>
              <div><label style={lbl}>Từ giờ</label><Input type="time" value={newSlotStart} onChange={setNewSlotStart} theme={theme} /></div>
              <div><label style={lbl}>Đến giờ</label><Input type="time" value={newSlotEnd} onChange={setNewSlotEnd} theme={theme} /></div>
              <div><Btn onClick={addTimeSlot} theme={theme}>Thêm</Btn></div>
            </div>
          </div>
        )}

        {scheduleSlots.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: styles.textMuted }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <div>Chưa có khung giờ nào. Hãy thêm khung giờ để cả nhóm chọn lịch rảnh.</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Bạn là:</label>
              <Select value={selectedMember} onChange={setSelectedMember} theme={theme} style={{ maxWidth: 300, width: "100%" }}>
                <option value="">Chọn tên của bạn...</option>
                {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </div>

            {selectedMember && (
              <div className="schedule-table-wrapper" style={{ overflowX: "auto", marginBottom: 24 }}>
                <table className="schedule-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${styles.border}` }}>
                      <th style={{ textAlign: "left", padding: 12 }}>Khung giờ</th>
                      <th style={{ textAlign: "center", padding: 12 }}>Lựa chọn</th>
                      <th style={{ textAlign: "center", padding: 12 }}>Số người rảnh</th>
                      <th style={{ textAlign: "center", padding: 12 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleSlots.map((slot: any) => (
                      <tr key={slot.id} style={{ borderBottom: `1px solid ${styles.border}` }}>
                        <td style={{ padding: 12 }}>{slot.label}</td>
                        <td style={{ textAlign: "center", padding: 12 }}>
                          <button
                            onClick={() => toggleSelection(slot.id)}
                            style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: scheduleSelections[selectedMember]?.[slot.id] ? "#22c55e" : styles.inputBg,
                              border: `1px solid ${scheduleSelections[selectedMember]?.[slot.id] ? "#22c55e" : styles.border}`,
                              cursor: "pointer",
                              color: scheduleSelections[selectedMember]?.[slot.id] ? "#fff" : styles.textMuted
                            }}
                          >
                            {scheduleSelections[selectedMember]?.[slot.id] ? "✓" : "○"}
                          </button>
                        </td>
                        <td style={{ textAlign: "center", padding: 12 }}>
                          <span style={{ fontWeight: 700, color: "#22c55e" }}>{slotTotals[slot.id]}</span>/{members.length}
                        </td>
                        <td style={{ textAlign: "center", padding: 12 }}>
                          <button onClick={() => deleteSlot(slot.id)} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18 }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bestSlot && bestSlot.count > 0 && (
              <div style={{ background: "#1e1b4b", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#a5b4fc", marginBottom: 4 }}>🏆 KHUNG GIỜ ĐƯỢC CHỌN NHIỀU NHẤT</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fcd34d" }}>{bestSlot.slot.label}</div>
                    <div style={{ fontSize: 13, color: "#818cf8" }}>{bestSlot.count}/{bestSlot.total} người rảnh</div>
                  </div>
                  <Btn onClick={copyResult} variant="primary" theme={theme}>
                    {copySuccess ? "✓ Đã copy!" : "📋 Copy kết quả"}
                  </Btn>
                </div>
              </div>
            )}

            <div>
              <div style={{ fontWeight: 700, marginBottom: 12, color: "#a5b4fc" }}>📋 CHI TIẾT THEO KHUNG GIỜ</div>
              {scheduleSlots.map((slot: any) => {
                const availableMembers = members.filter((m: any) => scheduleSelections[m.id]?.[slot.id]);
                return (
                  <div key={slot.id} style={{ marginBottom: 12, padding: 12, background: styles.inputBg, borderRadius: 10 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>{slot.label}</div>
                    <div style={{ fontSize: 13, color: availableMembers.length > 0 ? "#22c55e" : styles.textMuted }}>
                      {availableMembers.length > 0 
                        ? `✅ ${availableMembers.map((m: any) => m.name).join(", ")}`
                        : "❌ Chưa có ai rảnh"}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── SETUP TAB ────────────────────────────────────────────────────────────────
function SetupTab({ members, setMembers, projectName, setProjectName, leader, setLeader, theme }: any) {
  const [name, setName] = useState("");
  const [mssv, setMssv] = useState("");
  const styles = themeStyles[theme];
  const add = () => { if (!name.trim()) return; setMembers((m: any[]) => [...m, { id: uid(), name: name.trim(), mssv: mssv.trim() }]); setName(""); setMssv(""); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") add(); };
  return (
    <div className="two-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <Card theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc", fontFamily: "'Space Mono',monospace" }}>⚙️ THIẾT LẬP</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Tên dự án / môn học</label><Input value={projectName} onChange={setProjectName} placeholder="VD: Dự án Marketing - Học kỳ 2" theme={theme} /></div>
          <div><label style={lbl}>Trưởng nhóm</label><Select value={leader} onChange={setLeader} theme={theme}><option value="">Chọn trưởng nhóm...</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: styles.inputBg, borderRadius: 12, fontSize: 13, color: styles.textMuted, lineHeight: 1.8 }}>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 CÔNG THỨC TÍNH ĐIỂM</div>
          <div>Thành viên = <b style={{ color: "#6366f1" }}>Công việc × 40%</b> + <b style={{ color: "#22c55e" }}>Đánh giá đồng đội × 40%</b> + <b style={{ color: "#f59e0b" }}>Đánh giá trưởng nhóm × 20%</b></div>
          <div>Trưởng nhóm = <b style={{ color: "#6366f1" }}>Công việc × 40%</b> + <b style={{ color: "#22c55e" }}>Đánh giá đồng đội × 60%</b></div>
        </div>
      </Card>
      <Card theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc", fontFamily: "'Space Mono',monospace" }}>👥 DANH SÁCH THÀNH VIÊN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
          <Input value={name} onChange={setName} placeholder="Họ và tên" onKeyDown={handleKeyDown} theme={theme} />
          <Input value={mssv} onChange={setMssv} placeholder="Mã số sinh viên" onKeyDown={handleKeyDown} theme={theme} />
          <Btn onClick={add} theme={theme}>Thêm</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {members.length === 0 && <div style={{ textAlign: "center", padding: 40, color: styles.textMuted, fontSize: 14 }}>Chưa có thành viên nào</div>}
          {members.map((m: any, i: number) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: styles.inputBg, borderRadius: 10, padding: "10px 14px", flexWrap: "wrap" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: MEMBER_COLORS[i % MEMBER_COLORS.length] + "22", border: `2px solid ${MEMBER_COLORS[i % MEMBER_COLORS.length]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: MEMBER_COLORS[i % MEMBER_COLORS.length], flexShrink: 0 }}>
                {m.name.split(" ").pop().charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: styles.text }}>{m.name}</div>
                {m.mssv && <div style={{ fontSize: 11, color: styles.textMuted }}>MSSV: {m.mssv}</div>}
              </div>
              {leader === m.id && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
              <button onClick={() => setMembers((ms: any[]) => ms.filter((x: any) => x.id !== m.id))} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TASK TAB ─────────────────────────────────────────────────────────────────
function TaskTab({ members, tasks, setTasks, theme }: any) {
  const [form, setForm] = useState({ name: "", assignees: [] as string[], deadline: "", complexity: 2, productLink: "" });
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const styles = themeStyles[theme];
  
  const addTask = () => { 
    if (!form.name.trim() || form.assignees.length === 0) return; 
    setTasks((t: any[]) => [...t, { id: uid(), name: form.name, assignees: form.assignees, deadline: form.deadline, complexity: form.complexity, status: "todo", productLink: form.productLink.trim() || "" }]); 
    setForm({ name: "", assignees: [], deadline: "", complexity: 2, productLink: "" }); 
    setShowForm(false); 
  };
  
  const toggleAssignee = (memberId: string) => {
    setForm((f: any) => ({
      ...f,
      assignees: f.assignees.includes(memberId)
        ? f.assignees.filter((id: string) => id !== memberId)
        : [...f.assignees, memberId]
    }));
  };

  const cycleStatus = (id: string) => { 
    const order = ["todo", "doing", "done"]; 
    setTasks((ts: any[]) => ts.map((t: any) => t.id !== id ? t : { ...t, status: order[(order.indexOf(t.status) + 1) % 3] })); 
  };
  
  const filtered = filter === "all" 
    ? tasks 
    : tasks.filter((t: any) => t.assignees?.includes(filter));
  
  const overdue = (t: any) => { 
    if (!t.deadline || t.status === "done") return false; 
    const today = new Date(); today.setHours(0,0,0,0); 
    const dl = new Date(t.deadline + "T00:00:00"); 
    return dl < today; 
  };
  
  const btnStyle = filterBtn(theme);
  
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ ...btnStyle, ...(filter === "all" ? filterActive : {}) }}>Tất cả ({tasks.length})</button>
          {members.map((m: any) => (
            <button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)} style={{ ...btnStyle, ...(filter === m.id ? { borderColor: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], color: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length] + "18" } : {}) }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], display: "inline-block" }} />
              <span className="hide-on-mobile">{m.name.split(" ").pop()}</span>
              <span> ({tasks.filter((t: any) => t.assignees?.includes(m.id)).length})</span>
            </button>
          ))}
        </div>
        <Btn onClick={() => setShowForm(true)} theme={theme}>+ Thêm công việc</Btn>
      </div>
      
      {showForm && (
        <Card style={{ marginBottom: 20, borderColor: "#312e81" }} theme={theme}>
          <div className="task-form-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={lbl}>Tên công việc *</label>
              <Input value={form.name} onChange={v => setForm((f: any) => ({ ...f, name: v }))} placeholder="Mô tả ngắn công việc..." theme={theme} />
            </div>
            <div>
              <label style={lbl}>Giao cho * (chọn nhiều)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px", maxHeight: 200, overflowY: "auto" }}>
                {members.length === 0 && <span style={{ color: styles.textMuted, fontSize: 13, padding: 8 }}>Chưa có thành viên nào</span>}
                {members.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleAssignee(m.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${form.assignees.includes(m.id) ? "#22c55e" : styles.border}`,
                      background: form.assignees.includes(m.id) ? "#22c55e22" : "transparent",
                      color: form.assignees.includes(m.id) ? "#22c55e" : styles.text,
                      cursor: "pointer",
                      fontSize: 14,
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.2s"
                    }}
                  >
                    {form.assignees.includes(m.id) ? "✓ " : "○ "}{m.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={lbl}>Hạn chót</label>
              <Input type="date" value={form.deadline} onChange={v => setForm((f: any) => ({ ...f, deadline: v }))} theme={theme} />
            </div>
            <div>
              <label style={lbl}>Độ khó</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3].map(v => (
                  <button key={v} onClick={() => setForm((f: any) => ({ ...f, complexity: v }))} 
                    style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1px solid ${form.complexity === v ? COMPLEXITY[v as keyof typeof COMPLEXITY].color : styles.border}`, background: form.complexity === v ? COMPLEXITY[v as keyof typeof COMPLEXITY].color + "22" : "transparent", color: form.complexity === v ? COMPLEXITY[v as keyof typeof COMPLEXITY].color : styles.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Cấp {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Btn onClick={() => setShowForm(false)} variant="ghost" theme={theme}>Hủy</Btn>
            <Btn onClick={addTask} theme={theme}>✓ Thêm công việc</Btn>
          </div>
        </Card>
      )}
      
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: styles.textMuted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Chưa có công việc nào</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Nhấn "+ Thêm công việc" để bắt đầu</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 14 }}>
          {filtered.map((t: any) => {
            const assigneeMembers = members.filter((m: any) => t.assignees?.includes(m.id));
            const firstMember = assigneeMembers[0];
            const mc = MEMBER_COLORS[members.indexOf(firstMember) % MEMBER_COLORS.length];
            const sc = STATUS[t.status as keyof typeof STATUS];
            const od = overdue(t);
            return (
              <div key={t.id} style={{ background: styles.cardBg, border: `1px solid ${t.status === "done" ? "#166534" : od ? "#7f1d1d" : styles.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {assigneeMembers.map((m: any) => (
                      <span key={m.id} style={{ background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length] + "22", color: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], border: `1px solid ${MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length]}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        {m.name.split(" ").pop()}
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Tag color={COMPLEXITY[t.complexity as keyof typeof COMPLEXITY].color}>Cấp {t.complexity}</Tag>
                    <button onClick={() => setTasks((ts: any[]) => ts.filter((x: any) => x.id !== t.id))} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18 }}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.status === "done" ? "#4ade80" : styles.text, textDecoration: t.status === "done" ? "line-through" : "none", marginBottom: 10 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: styles.textMuted, marginBottom: 8 }}>
                  👥 {assigneeMembers.map((m: any) => m.name).join(", ")}
                </div>
                {t.deadline && <div style={{ fontSize: 12, color: od ? "#f87171" : styles.textMuted, marginBottom: 12 }}>{od ? "⚠️ Quá hạn: " : "📅 Hạn: "}{new Date(t.deadline + "T00:00:00").toLocaleDateString("vi-VN")}</div>}
                {t.productLink && (
                  <div style={{ marginBottom: 12 }}>
                    <a 
                      href={t.productLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: "#6366f1", fontSize: 13, textDecoration: "none", wordBreak: "break-all" }}
                    >
                      🔗 Link sản phẩm
                    </a>
                  </div>
                )}
                <button onClick={() => cycleStatus(t.id)} style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${sc.color}44`, background: sc.color + "18", color: sc.color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {sc.label} → Nhấn để đổi
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── PEER TAB ─────────────────────────────────────────────────────────────
function PeerTab({ members, peerScores, setPeerScores, peerComments, setPeerComments, theme }: any) {
  const [reviewer, setReviewer] = useState("");
  const [tempScores, setTempScores] = useState<Record<string, Record<string, number>>>({});
  const [tempComments, setTempComments] = useState<Record<string, string>>({});
  const styles = themeStyles[theme];

  const reviewees = members.filter((m: any) => m.id !== reviewer);
  const hasCompleted = reviewer ? (peerScores[reviewer]?.completed === true) : false;

  const setScore = (revieweeId: string, criterion: string, val: number) => {
    setTempScores(prev => ({
      ...prev,
      [revieweeId]: {
        ...(prev[revieweeId] || {}),
        [criterion]: val
      }
    }));
  };

  const getTempScore = (revieweeId: string, criterion: string) => {
    return tempScores[revieweeId]?.[criterion] ?? 0;
  };

  const setComment = (revieweeId: string, comment: string) => {
    setTempComments(prev => ({
      ...prev,
      [revieweeId]: comment
    }));
  };

  const getTempComment = (revieweeId: string) => {
    return tempComments[revieweeId] || "";
  };

  const submitAllReviews = () => {
    let allDone = true;
    reviewees.forEach(reviewee => {
      PEER_CRITERIA.forEach(c => {
        if (getTempScore(reviewee.id, c) === 0) allDone = false;
      });
    });
    
    if (!allDone) {
      alert("Vui lòng đánh giá đầy đủ tất cả các tiêu chí cho tất cả thành viên!");
      return;
    }

    setPeerScores((prev: any) => {
      const next = { ...prev };
      
      reviewees.forEach(reviewee => {
        PEER_CRITERIA.forEach(criterion => {
          const score = getTempScore(reviewee.id, criterion);
          if (score > 0) {
            if (!next[reviewer]) next[reviewer] = {};
            if (!next[reviewer][reviewee.id]) next[reviewer][reviewee.id] = {};
            if (!next[reviewer][reviewee.id][criterion]) next[reviewer][reviewee.id][criterion] = [];
            next[reviewer][reviewee.id][criterion].push(score);
          }
        });
      });
      
      next[reviewer] = { ...next[reviewer], completed: true };
      
      return next;
    });

    setPeerComments((prev: any) => {
      const next = { ...prev };
      
      reviewees.forEach(reviewee => {
        const comment = getTempComment(reviewee.id);
        if (comment.trim()) {
          if (!next[reviewer]) next[reviewer] = {};
          if (!next[reviewer][reviewee.id]) next[reviewer][reviewee.id] = {};
          next[reviewer][reviewee.id].comment = comment.trim();
        }
      });
      
      return next;
    });

    setTempScores({});
    setTempComments({});
    setReviewer("");
    alert("✅ Đã lưu đánh giá và nhận xét ẩn danh!");
  };

  const completedReviewers = Object.keys(peerScores).filter(
    (key) => peerScores[key]?.completed === true
  ).length;

  if (members.length < 2) {
    return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👥</div><div>Cần ít nhất 2 thành viên</div></div>;
  }

  return (
    <div>
      <Card theme={theme} style={{ marginBottom: 20, background: "#1e1b4b", borderColor: "#22c55e" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>🔒 ĐÁNH GIÁ & NHẬN XÉT ẨN DANH</div>
            <div style={{ fontSize: 12, color: styles.textMuted }}>Sau khi đánh giá, không ai biết ai đã đánh giá và nhận xét.</div>
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 20 }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: styles.textMuted, fontWeight: 600 }}>Bạn là:</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Select value={reviewer} onChange={(v: string) => {
              if (peerScores[v]?.completed) {
                alert("⚠️ Bạn đã đánh giá rồi! Mỗi người chỉ được đánh giá 1 lần.");
                return;
              }
              setReviewer(v);
            }} theme={theme}>
              <option value="">Chọn tên của bạn...</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id} disabled={peerScores[m.id]?.completed === true}>
                  {m.name} {peerScores[m.id]?.completed ? "(✅ Đã đánh giá)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div style={{ fontSize: 13, color: styles.textMuted }}>
            📊 Đã có <b style={{ color: "#22c55e" }}>{completedReviewers}</b>/{members.length} người tham gia
          </div>
        </div>
      </Card>

      {reviewer && !hasCompleted && (
        <>
          <Card theme={theme} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <span style={{ fontSize: 14, color: "#a5b4fc" }}>👤 Đang đánh giá với vai trò: </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: styles.text }}>{members.find((m: any) => m.id === reviewer)?.name}</span>
              </div>
              <Btn onClick={() => {
                setReviewer("");
                setTempScores({});
                setTempComments({});
              }} variant="ghost" theme={theme}>↺ Thoát</Btn>
            </div>
            <div style={{ fontSize: 13, color: styles.textMuted }}>
              🔒 Đánh giá và nhận xét của bạn sẽ được ẩn danh hoàn toàn.
            </div>
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {reviewees.map((reviewee: any) => {
              const mc = MEMBER_COLORS[members.indexOf(reviewee) % MEMBER_COLORS.length];
              const isFilled = PEER_CRITERIA.every(c => getTempScore(reviewee.id, c) > 0);
              return (
                <Card key={reviewee.id} style={{ borderColor: isFilled ? "#22c55e44" : styles.border }} theme={theme}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: mc }}>
                      {reviewee.name.split(" ").pop().charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>{reviewee.name}</div>
                      {isFilled && <div style={{ fontSize: 11, color: "#22c55e" }}>✓ Đã đánh giá</div>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
                    {PEER_CRITERIA.map(c => (
                      <div key={c}>
                        <div style={{ fontSize: 12, color: styles.textMuted, marginBottom: 8 }}>{c}</div>
                        <RatingSelect value={getTempScore(reviewee.id, c)} onChange={v => setScore(reviewee.id, c, v)} theme={theme} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: styles.textMuted, display: "block", marginBottom: 6 }}>📝 Nhận xét (ẩn danh)</label>
                    <textarea
                      value={getTempComment(reviewee.id)}
                      onChange={e => setComment(reviewee.id, e.target.value)}
                      placeholder="Nhập nhận xét của bạn về thành viên này..."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1px solid ${styles.border}`,
                        background: styles.inputBg,
                        color: styles.text,
                        fontSize: 14,
                        outline: "none",
                        fontFamily: "inherit",
                        resize: "vertical",
                        minHeight: 70,
                        boxSizing: "border-box"
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = "#6366f1"}
                      onBlur={e => e.currentTarget.style.borderColor = styles.border}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <Btn onClick={submitAllReviews} variant="success" theme={theme} disabled={!reviewees.every(r => PEER_CRITERIA.every(c => getTempScore(r.id, c) > 0))} style={{ padding: "12px 32px", fontSize: 16 }}>
              🔒 Gửi đánh giá & nhận xét (ẩn danh)
            </Btn>
          </div>
        </>
      )}
    </div>
  );
}

// ─── LEADER TAB ───────────────────────────────────────────────────────────────
function LeaderTab({ members, leader, leaderScores, setLeaderScores, theme }: any) {
  const leaderMember = members.find((m: any) => m.id === leader);
  const styles = themeStyles[theme];
  const setScore = (memberId: string, criterion: string, val: number) => { setLeaderScores((ls: any) => ({ ...ls, [memberId]: { ...(ls[memberId] || {}), [criterion]: val } })); };
  const getScore = (memberId: string, criterion: string) => leaderScores?.[memberId]?.[criterion] ?? 0;
  if (!leader) return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👑</div><div>Chưa chọn trưởng nhóm. Vào tab <b style={{ color: "#a5b4fc" }}>Thiết lập</b> để chọn.</div></div>;
  const others = members.filter((m: any) => m.id !== leader);
  if (others.length === 0) return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👥</div><div>Nhóm chỉ có trưởng nhóm, chưa có thành viên</div></div>;
  return (
    <div>
      <Card style={{ marginBottom: 20, borderColor: "#451a03" }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ fontSize: 28 }}>👑</div><div><div style={{ fontSize: 15, fontWeight: 700, color: "#fcd34d" }}>Trưởng nhóm: {leaderMember?.name}</div><div style={{ fontSize: 13, color: "#92400e" }}>Đánh giá {others.length} thành viên theo 3 tiêu chí</div></div></div>
      </Card>
      <div className="leader-grid" style={{ display: "flex", flexDirection: "column", gap: 14 }}>{others.map((m: any) => {
        const mc = MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length];
        const mAvg = avg(LEADER_CRITERIA.map(c => getScore(m.id, c)).filter(s => s > 0));
        return (
          <Card key={m.id} style={{ borderColor: styles.border }} theme={theme}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: mc }}>{m.name.split(" ").pop().charAt(0)}</div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: styles.text }}>{m.name}</div>
              {mAvg > 0 && <Tag color={mAvg >= 8 ? "#22c55e" : mAvg >= 6 ? "#f59e0b" : "#ef4444"}>TB: {mAvg.toFixed(1)}</Tag>}
            </div>
            <div className="leader-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>{LEADER_CRITERIA.map(c => (<div key={c}><div style={{ fontSize: 12, color: styles.textMuted, marginBottom: 8 }}>{c}</div><RatingSelect value={getScore(m.id, c)} onChange={v => setScore(m.id, c, v)} theme={theme} /></div>))}</div>
          </Card>
        );
      })}</div>
    </div>
  );
}

// ─── ANALYSIS TAB (KHÓA ĐẾN KHI ALL ĐÁNH GIÁ XONG) ──────────────────────────
function AnalysisTab({ members, tasks, peerScores, leaderScores, leader, peerComments, theme }: any) {
  const styles = themeStyles[theme];
  
  const completedReviewers = Object.keys(peerScores).filter(
    (key) => peerScores[key]?.completed === true
  ).length;

  if (members.length > 0 && completedReviewers < members.length) {
    return (
      <Card theme={theme} style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3 style={{ color: "#a5b4fc", marginBottom: 12 }}>Đang chờ đánh giá</h3>
        <p style={{ color: styles.textMuted }}>
          Đã có <b style={{ color: "#22c55e" }}>{completedReviewers}</b>/{members.length} thành viên đánh giá.
          <br />
          Kết quả phân tích sẽ hiển thị khi <b>tất cả thành viên</b> hoàn thành đánh giá.
        </p>
        <div style={{ marginTop: 16, background: "#1e1b4b", borderRadius: 8, padding: "8px 16px", display: "inline-block" }}>
          <span style={{ color: "#818cf8" }}>🔒 Đảm bảo khách quan tuyệt đối</span>
        </div>
      </Card>
    );
  }
  
  const getMemberScores = (memberId: string) => {
    const scores: Record<string, number[]> = {
      "Chất lượng công việc": [],
      "Chủ động & Đúng tiến độ": [],
      "Tinh thần hợp tác": []
    };
    
    Object.keys(peerScores).forEach(reviewerId => {
      if (reviewerId === memberId) return;
      if (reviewerId === "completed") return;
      
      const reviewerData = peerScores[reviewerId];
      if (!reviewerData) return;
      
      const scoresForMember = reviewerData[memberId];
      if (scoresForMember) {
        PEER_CRITERIA.forEach(criterion => {
          const criterionScores = scoresForMember[criterion];
          if (criterionScores && Array.isArray(criterionScores)) {
            scores[criterion].push(...criterionScores);
          }
        });
      }
    });
    
    if (leaderScores[memberId]) {
      if (leaderScores[memberId]["Chủ động & Trách nhiệm"]) {
        scores["Chủ động & Đúng tiến độ"].push(leaderScores[memberId]["Chủ động & Trách nhiệm"]);
      }
      if (leaderScores[memberId]["Chất lượng Output"]) {
        scores["Chất lượng công việc"].push(leaderScores[memberId]["Chất lượng Output"]);
      }
      if (leaderScores[memberId]["Phối hợp Nhóm"]) {
        scores["Tinh thần hợp tác"].push(leaderScores[memberId]["Phối hợp Nhóm"]);
      }
    }
    
    const avgScores: Record<string, number> = {};
    PEER_CRITERIA.forEach(criterion => {
      const arr = scores[criterion];
      avgScores[criterion] = arr.length > 0 ? avg(arr) : 0;
    });
    
    return avgScores;
  };
  
  const teamAvgScores = useMemo(() => {
    const totals: Record<string, number> = {
      "Chất lượng công việc": 0,
      "Chủ động & Đúng tiến độ": 0,
      "Tinh thần hợp tác": 0
    };
    const counts: Record<string, number> = {
      "Chất lượng công việc": 0,
      "Chủ động & Đúng tiến độ": 0,
      "Tinh thần hợp tác": 0
    };
    
    members.forEach((m: any) => {
      const scores = getMemberScores(m.id);
      PEER_CRITERIA.forEach(c => {
        if (scores[c] > 0) {
          totals[c] += scores[c];
          counts[c]++;
        }
      });
    });
    
    const avgs: Record<string, number> = {};
    PEER_CRITERIA.forEach(c => {
      avgs[c] = counts[c] > 0 ? totals[c] / counts[c] : 0;
    });
    return avgs;
  }, [members, peerScores, leaderScores]);
  
  const getScoreLevel = (score: number) => {
    if (score >= 8.5) return { text: "Xuất sắc", color: "#22c55e", icon: "⭐" };
    if (score >= 7) return { text: "Tốt", color: "#22c55e", icon: "🟢" };
    if (score >= 5) return { text: "Trung bình", color: "#f59e0b", icon: "🟡" };
    return { text: "Cần cải thiện", color: "#ef4444", icon: "🔴" };
  };
  
  const getSuggestion = (criterion: string, score: number) => {
    if (score >= 7) return null;
    const suggestions: Record<string, string> = {
      "Chất lượng công việc": "📌 Review kỹ trước khi nộp, học hỏi từ người giỏi hơn, dành thêm thời gian kiểm tra lỗi",
      "Chủ động & Đúng tiến độ": "📌 Báo cáo tiến độ thường xuyên, chia nhỏ công việc, đặt reminder hàng ngày, họp trạng thái nhanh",
      "Tinh thần hợp tác": "📌 Chủ động hỗ trợ đồng đội, phản hồi tin nhắn nhanh, tham gia đầy đủ các buổi họp nhóm"
    };
    return suggestions[criterion] || "📌 Cần cải thiện tiêu chí này";
  };
  
  const weakestCriterion = Object.entries(teamAvgScores).reduce((a, b) => a[1] < b[1] ? a : b);

  const getMemberComments = (memberId: string) => {
    const comments: string[] = [];
    Object.keys(peerComments).forEach(reviewerId => {
      if (reviewerId === memberId) return;
      const reviewerData = peerComments[reviewerId];
      if (reviewerData && reviewerData[memberId] && reviewerData[memberId].comment) {
        comments.push(reviewerData[memberId].comment);
      }
    });
    return comments;
  };
  
  return (
    <div>
      <Card theme={theme} style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc", fontFamily: "'Space Mono',monospace" }}>
          📈 THỐNG KÊ CẢ NHÓM
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${styles.border}` }}>
                <th style={{ textAlign: "left", padding: 12 }}>Tiêu chí</th>
                <th style={{ textAlign: "center", padding: 12 }}>Điểm TB</th>
                <th style={{ textAlign: "center", padding: 12 }}>Đánh giá</th>
                <th style={{ textAlign: "center", padding: 12 }}>Cần cải thiện?</th>
              </tr>
            </thead>
            <tbody>
              {PEER_CRITERIA.map(c => {
                const score = teamAvgScores[c];
                const level = getScoreLevel(score);
                return (
                  <tr key={c} style={{ borderBottom: `1px solid ${styles.border}` }}>
                    <td style={{ padding: 12 }}>{c}</td>
                    <td style={{ textAlign: "center", padding: 12 }}>
                      <span style={{ fontWeight: 700, fontSize: 16 }}>{score.toFixed(1)}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: 12 }}>
                      <span style={{ color: level.color }}>{level.icon} {level.text}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: 12 }}>
                      {score < 7 ? (
                        <span style={{ color: "#ef4444" }}>🔴 CẦN CẢI THIỆN</span>
                      ) : (
                        <span style={{ color: "#22c55e" }}>✅ Giữ nguyên</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {weakestCriterion[1] < 7 && (
          <div style={{ marginTop: 20, padding: 16, background: "#1e1b4b", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#fcd34d" }}>🎯 KHUYẾN NGHỊ CHO NHÓM</div>
            <div style={{ fontSize: 14, color: styles.text }}>
              Nhóm cần cải thiện <b style={{ color: "#f59e0b" }}>"{weakestCriterion[0]}"</b> (điểm {weakestCriterion[1].toFixed(1)}/10)
            </div>
            <div style={{ fontSize: 13, color: styles.textMuted, marginTop: 8 }}>
              💡 {weakestCriterion[0] === "Chủ động & Đúng tiến độ" ? "Họp nhanh đầu tuần, phân chia task rõ ràng, báo cáo tiến độ thường xuyên" :
                  weakestCriterion[0] === "Chất lượng công việc" ? "Review chéo sản phẩm trước khi nộp, học hỏi từ thành viên có điểm cao" :
                  "Tổ chức các buổi team building, khuyến khích hỗ trợ lẫn nhau"}
            </div>
          </div>
        )}
      </Card>
      
      <h3 style={{ fontSize: 15, color: "#a5b4fc", marginBottom: 16, fontFamily: "'Space Mono',monospace" }}>
        👤 PHÂN TÍCH TỪNG THÀNH VIÊN
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {members.map((m: any) => {
          const scores = getMemberScores(m.id);
          const memberColors = MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length];
          
          const weaknesses = PEER_CRITERIA.filter(c => scores[c] < 7 && scores[c] > 0);
          const strengths = PEER_CRITERIA.filter(c => scores[c] >= 7 && scores[c] > 0);
          
          const memberTasks = tasks.filter((t: any) => t.assignees?.includes(m.id));
          const completedTasks = memberTasks.filter((t: any) => t.status === "done").length;

          const comments = getMemberComments(m.id);
          
          return (
            <Card key={m.id} style={{ borderColor: `${memberColors}44` }} theme={theme}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: memberColors + "22",
                  border: `2px solid ${memberColors}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: memberColors
                }}>
                  {m.name.split(" ").pop().charAt(0)}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: styles.text }}>{m.name}</div>
                {m.id === leader && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
                <div style={{ fontSize: 12, color: styles.textMuted, marginLeft: "auto" }}>
                  📋 {completedTasks}/{memberTasks.length} công việc
                </div>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>✅ ĐIỂM MẠNH</div>
                  {strengths.length > 0 ? (
                    strengths.map(c => {
                      const level = getScoreLevel(scores[c]);
                      return (
                        <div key={c} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 13, color: styles.text }}>{c}</div>
                          <div style={{ fontSize: 12, color: level.color }}>{scores[c].toFixed(1)}/10 - {level.text}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: 13, color: styles.textMuted }}>Chưa có dữ liệu đánh giá</div>
                  )}
                </div>
                
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>⚠️ ĐIỂM YẾU & GỢI Ý</div>
                  {weaknesses.length > 0 ? (
                    weaknesses.map(c => (
                      <div key={c} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 13, color: styles.text }}>{c}</div>
                        <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>{scores[c].toFixed(1)}/10 - Cần cải thiện</div>
                        <div style={{ fontSize: 12, color: "#818cf8", background: "#1e1b4b", padding: 6, borderRadius: 6 }}>
                          {getSuggestion(c, scores[c])}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 13, color: styles.textMuted }}>
                      {scores[PEER_CRITERIA[0]] === 0 ? "Chưa có dữ liệu đánh giá" : "✅ Không có điểm yếu nào đáng kể!"}
                    </div>
                  )}
                </div>
              </div>

              {comments.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${styles.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>
                    💬 NHẬN XÉT ẨN DANH
                  </div>
                  {comments.map((comment, idx) => (
                    <div key={idx} style={{ 
                      fontSize: 13, 
                      color: styles.text, 
                      background: styles.inputBg,
                      padding: "10px 14px",
                      borderRadius: 8,
                      marginBottom: 8,
                      fontStyle: "italic"
                    }}>
                      "{comment}"
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESULT TAB (KHÓA ĐẾN KHI ALL ĐÁNH GIÁ XONG) ────────────────────────────
function ResultTab({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore, theme }: any) {
  const styles = themeStyles[theme];
  
  const completedReviewers = Object.keys(peerScores).filter(
    (key) => peerScores[key]?.completed === true
  ).length;

  if (members.length > 0 && completedReviewers < members.length) {
    return (
      <Card theme={theme} style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h3 style={{ color: "#a5b4fc", marginBottom: 12 }}>Đang chờ đánh giá</h3>
        <p style={{ color: styles.textMuted }}>
          Đã có <b style={{ color: "#22c55e" }}>{completedReviewers}</b>/{members.length} thành viên đánh giá.
          <br />
          Kết quả sẽ hiển thị khi <b>tất cả thành viên</b> hoàn thành đánh giá.
        </p>
        <div style={{ marginTop: 16, background: "#1e1b4b", borderRadius: 8, padding: "8px 16px", display: "inline-block" }}>
          <span style={{ color: "#818cf8" }}>🔒 Đảm bảo khách quan tuyệt đối</span>
        </div>
      </Card>
    );
  }
  
  const getPeerScoreForMember = (memberId: string) => {
    const allScores: number[] = [];
    
    Object.keys(peerScores).forEach(reviewerId => {
      if (reviewerId === memberId) return;
      if (reviewerId === "completed") return;
      
      const reviewerData = peerScores[reviewerId];
      if (!reviewerData) return;
      
      const scoresForMember = reviewerData[memberId];
      if (scoresForMember) {
        PEER_CRITERIA.forEach(criterion => {
          const scores = scoresForMember[criterion];
          if (scores && Array.isArray(scores)) {
            allScores.push(...scores);
          }
        });
      }
    });
    
    if (allScores.length === 0) return null;
    return avg(allScores) * 10;
  };

  const results = useMemo(() => {
    if (members.length === 0) return [];
    return members.map((m: any) => {
      const myTasks = tasks.filter((t: any) => t.assignees?.includes(m.id));
      let taskScore = 100;
      if (myTasks.length > 0) {
        const totalPossible = myTasks.reduce((s: number, t: any) => s + COMPLEXITY[t.complexity as keyof typeof COMPLEXITY].pts * 100, 0);
        const earned = myTasks.reduce((s: number, t: any) => s + COMPLEXITY[t.complexity as keyof typeof COMPLEXITY].pts * 100 * STATUS[t.status as keyof typeof STATUS].pct, 0);
        taskScore = totalPossible > 0 ? (earned / totalPossible) * 100 : 100;
      }
      
      const peerScore = getPeerScoreForMember(m.id) ?? 0;
      
      const lScores = LEADER_CRITERIA.map(c => leaderScores?.[m.id]?.[c] ?? 0).filter((s: number) => s > 0);
      const leaderScore = lScores.length > 0 ? avg(lScores) * 10 : 0;
      const isLeader = m.id === leader;
      const finalScore = isLeader ? taskScore * 0.4 + peerScore * 0.6 : taskScore * 0.4 + peerScore * 0.4 + leaderScore * 0.2;
      return { ...m, taskScore, peerScore, leaderScore, finalScore, isLeader, myTasks: myTasks.length, doneTasks: myTasks.filter((t: any) => t.status === "done").length };
    });
  }, [members, tasks, peerScores, leaderScores, leader]);

  const totalScore = results.reduce((s: number, r: any) => s + r.finalScore, 0);
  const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);
  const maxFinal = Math.max(...results.map((r: any) => r.finalScore), 1);
  const teamAvg = avg(results.map((r: any) => r.finalScore));
  const ts = parseFloat(teacherScore);
  const hasTeacherScore = !isNaN(ts) && ts >= 0 && ts <= 10;
  const pctOf = (score: number) => totalScore > 0 ? (score / totalScore) * 100 : (100 / (members.length || 1));
  const personalGrade = (score: number) => hasTeacherScore ? ts * (pctOf(score) / 100) * members.length : null;

  return (
    <div>
      <Card style={{ marginBottom: 24, borderColor: "#1e3a5f", background: theme === "dark" ? "linear-gradient(135deg,#0c1929,#13131a)" : "linear-gradient(135deg,#e0e7ff,#c7d2fe)" }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ fontSize: 36 }}>🎓</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800, color: "#93c5fd", marginBottom: 4 }}>Điểm giảng viên cho nhóm</div><div style={{ fontSize: 13, color: styles.textMuted }}>Nhập điểm giảng viên (thang 10) → tự tính điểm cá nhân theo % đóng góp</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="number" min="0" max="10" step="0.1" value={teacherScore} onChange={e => setTeacherScore(e.target.value)} placeholder="VD: 9" style={{ width: 100, background: styles.inputBg, border: `2px solid #1e3a5f`, borderRadius: 12, padding: "12px 16px", color: "#93c5fd", fontSize: 22, fontWeight: 800, textAlign: "center" }} />
            <div style={{ fontSize: 13, color: styles.textMuted }}>/ 10</div>
          </div>
          {hasTeacherScore && <div style={{ background: "#0c2a1a", border: "1px solid #166534", borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "#86efac" }}><div style={{ fontWeight: 700 }}>📐 Công thức:</div><div>Điểm cá nhân = {ts} × (% đóng góp / 100) × {members.length} thành viên</div></div>}
        </div>
      </Card>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Điểm trung bình hệ thống", value: teamAvg.toFixed(1), icon: "📊", color: "#6366f1", sub: "thang 100" },
          { label: hasTeacherScore ? "Điểm giảng viên" : "Chờ điểm giảng viên", value: hasTeacherScore ? ts.toFixed(1) : "—", icon: "🎓", color: "#3b82f6", sub: "thang 10" },
          { label: "Điểm cá nhân cao nhất", value: hasTeacherScore && results.length ? Math.max(...results.map((r: any) => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⭐", color: "#22c55e", sub: "thang 10" },
          { label: "Điểm cá nhân thấp nhất", value: hasTeacherScore && results.length ? Math.min(...results.map((r: any) => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⚠️", color: "#f59e0b", sub: "thang 10" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center" }} theme={theme}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: "clamp(20px, 5vw, 30px)", fontWeight: 800, fontFamily: "'Space Mono',monospace", color: s.color, margin: "8px 0 2px" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: styles.textMuted, marginBottom: 2 }}>{s.sub}</div>
            <div style={{ fontSize: 12, color: styles.textMuted }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }} theme={theme}>
        <div className="result-table-wrapper" style={{ overflowX: "auto" }}>
          <div style={{ padding: "14px 24px", background: styles.inputBg, borderBottom: `1px solid ${styles.border}`, display: "grid", gridTemplateColumns: "minmax(150px,1fr) 80px 80px 80px 90px 110px 100px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: styles.textMuted, textTransform: "uppercase", gap: 8, alignItems: "center", minWidth: 750 }}>
            <span>Thành viên</span>
            <span style={{ textAlign: "center" }}>Công việc</span>
            <span style={{ textAlign: "center" }}>Đồng đội</span>
            <span style={{ textAlign: "center" }}>Trưởng nhóm</span>
            <span style={{ textAlign: "center" }}>Tổng (100)</span>
            <span style={{ textAlign: "center" }}>% Đóng góp</span>
            <span style={{ textAlign: "center" }}>{hasTeacherScore ? "Điểm thực tế" : "Chờ điểm"}</span>
          </div>
          {sorted.map((r: any) => {
            const memberIndex = members.findIndex((m: any) => m.id === r.id);
            const mc = MEMBER_COLORS[memberIndex >= 0 ? memberIndex % MEMBER_COLORS.length : 0];
            const pct = pctOf(r.finalScore);
            const pg = personalGrade(r.finalScore);
            const pgColor = pg === null ? styles.textMuted : pg >= 8.5 ? "#22c55e" : pg >= 7 ? "#6366f1" : pg >= 5.5 ? "#f59e0b" : "#ef4444";
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "minmax(150px,1fr) 80px 80px 80px 90px 110px 100px", padding: "14px 24px", borderBottom: `1px solid ${styles.border}`, alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: mc, flexShrink: 0 }}>
                    {r.name.split(" ").pop().charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: styles.text }}>{r.name.split(" ").length > 1 ? r.name.split(" ").pop() : r.name}</div>
                    <div style={{ fontSize: 11, color: styles.textMuted }}>{r.myTasks > 0 ? `${r.doneTasks}/${r.myTasks} công việc` : "Chưa có công việc"}</div>
                  </div>
                </div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "#22c55e" }}>{r.taskScore.toFixed(0)}</div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "#22c55e" }}>{r.peerScore.toFixed(0)}</div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: "#22c55e" }}>{r.isLeader ? "–" : r.leaderScore.toFixed(0)}</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: "#a5b4fc", marginBottom: 4 }}>{r.finalScore.toFixed(1)}</div>
                  <ProgressBar value={r.finalScore} max={maxFinal} color={mc} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ background: mc + "18", border: `1px solid ${mc}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block", minWidth: 80 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: mc }}>{pct.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  {pg !== null ? (
                    <div style={{ background: pgColor + "18", border: `1px solid ${pgColor}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block", minWidth: 70 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: pgColor }}>{pg.toFixed(2)}</div>
                    </div>
                  ) : (
                    <span style={{ color: styles.textMuted, fontSize: 20 }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(150px,1fr) 80px 80px 80px 90px 110px 100px", padding: "14px 24px", background: styles.inputBg, alignItems: "center", gap: 8, borderTop: `2px solid ${styles.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>Trung bình nhóm</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{avg(results.map((r: any) => r.taskScore)).toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{avg(results.map((r: any) => r.peerScore)).toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{avg(results.filter((r: any) => !r.isLeader).map((r: any) => r.leaderScore)).toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: "#a5b4fc" }}>{teamAvg.toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 13, color: "#6366f1" }}>100%</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: hasTeacherScore ? "#93c5fd" : styles.textMuted }}>{hasTeacherScore ? ts.toFixed(1) : "—"}</div>
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
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [peerScores, setPeerScores] = useState({});
  const [peerComments, setPeerComments] = useState({});
  const [leaderScores, setLeaderScores] = useState({});
  const [teacherScore, setTeacherScore] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [hasGroup, setHasGroup] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [scheduleSelections, setScheduleSelections] = useState<any>({});
  
  const [roomId, setRoomId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || null;
  });

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
        setPeerComments(data.peerComments || {});
        setLeaderScores(data.leaderScores || {});
        setTeacherScore(data.teacherScore || "");
        setScheduleSlots(data.scheduleSlots || []);
        setScheduleSelections(data.scheduleSelections || {});
        setHasGroup(true);
      } else {
        setHasGroup(true);
      }
      setIsReady(true);
    });
    return () => unsubscribe();
  }, [roomId]);

  useEffect(() => {
    if (!isReady || !roomId) return;
    const dbRef = ref(database, `teams/${roomId}`);
    set(dbRef, { projectName, leader, members, tasks, peerScores, peerComments, leaderScores, teacherScore, scheduleSlots, scheduleSelections });
  }, [projectName, leader, members, tasks, peerScores, peerComments, leaderScores, teacherScore, scheduleSlots, scheduleSelections, roomId, isReady]);

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
    setPeerComments({});
    setLeaderScores({});
    setTeacherScore("");
    setScheduleSlots([]);
    setScheduleSelections({});
    setHasGroup(true);
  };

  const generateShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const styles = themeStyles[theme];
  const peerCompletedCount = members.length >= 2 ? members.filter((m: any) => peerScores[m.id]?.completed === true).length : null;

  const tabBadge = {
    tasks: tasks.length || null,
    peer: peerCompletedCount !== null ? `${peerCompletedCount}/${members.length}` : null,
    schedule: scheduleSlots.length > 0 ? scheduleSlots.length : null,
    analysis: null,
    result: null,
  };

  if (!isReady) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: styles.bg, color: styles.text }}>Đang tải dữ liệu...</div>;
  }

  if (!roomId && !hasGroup) {
    return (
      <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: styles.bg, color: styles.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
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

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: styles.bg, color: styles.text }}>
      <style>{`
        @media (max-width: 768px) {
          .two-columns { grid-template-columns: 1fr !important; gap: 16px !important; }
          .task-form-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .result-table-wrapper { overflow-x: auto !important; }
          .schedule-form-grid { grid-template-columns: 1fr !important; }
          .schedule-table-wrapper { overflow-x: auto !important; }
          .card { padding: 16px !important; }
          .hide-on-mobile { display: none; }
          .app-nav button span:last-child { display: none; }
          .app-nav button span:first-child { font-size: 18px; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <div style={{ background: styles.headerBg, borderBottom: `1px solid ${styles.border}`, padding: "0 16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "12px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✦</div>
            <div><div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: "#a5b4fc", letterSpacing: 2 }}>TEAM EVAL</div>
            <div style={{ fontSize: 11, color: "#5c54c7", letterSpacing: 3, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName || "NHÓM CỦA BẠN"}</div></div>
          </div>
          <nav className="app-nav" style={{ display: "flex", gap: 4, background: styles.inputBg, borderRadius: 14, padding: 5, overflowX: "auto", flex: "1 1 auto", justifyContent: "center" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all .2s", background: tab === t.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: tab === t.id ? "#fff" : styles.textMuted, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {tabBadge[t.id as keyof typeof tabBadge] && <span style={{ background: tab === t.id ? "rgba(255,255,255,.25)" : styles.border, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{tabBadge[t.id as keyof typeof tabBadge]}</span>}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={toggleTheme} variant="ghost" theme={theme} style={{ padding: "8px 12px", fontSize: 18 }}>{theme === "dark" ? "☀️" : "🌙"}</Btn>
            <Btn onClick={generateShareLink} variant={isCopied ? "success" : "primary"} theme={theme} style={{ padding: "8px 16px", fontSize: 12, whiteSpace: "nowrap" }}>{isCopied ? "✓ Đã copy!" : "🔗 Chia sẻ"}</Btn>
          </div>
        </div>
      </div>
      <div className="app-content" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "setup" && <SetupTab members={members} setMembers={setMembers} projectName={projectName} setProjectName={setProjectName} leader={leader} setLeader={setLeader} theme={theme} />}
        {tab === "tasks" && <TaskTab members={members} tasks={tasks} setTasks={setTasks} theme={theme} />}
        {tab === "peer" && <PeerTab members={members} peerScores={peerScores} setPeerScores={setPeerScores} peerComments={peerComments} setPeerComments={setPeerComments} theme={theme} />}
        {tab === "leader" && <LeaderTab members={members} leader={leader} leaderScores={leaderScores} setLeaderScores={setLeaderScores} theme={theme} />}
        {tab === "schedule" && <ScheduleTab members={members} scheduleSlots={scheduleSlots} setScheduleSlots={setScheduleSlots} scheduleSelections={scheduleSelections} setScheduleSelections={setScheduleSelections} theme={theme} />}
        {tab === "analysis" && <AnalysisTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} peerComments={peerComments} theme={theme} />}
        {tab === "result" && <ResultTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} teacherScore={teacherScore} setTeacherScore={setTeacherScore} theme={theme} />}
      </div>
    </div>
  );
}
