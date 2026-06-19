import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { database, ref, set, onValue, push, get, child, update, remove } from "./firebase";

// ─── HẰNG SỐ ──────────────────────────────────────────────────────────────────
const DO_KHO = { 1: { label: "Nhẹ", color: "#22c55e", pts: 1 }, 2: { label: "Trung bình", color: "#f59e0b", pts: 2 }, 3: { label: "Nặng", color: "#ef4444", pts: 3 } };
const TRANG_THAI = { todo: { label: "Chưa làm", pct: 0, color: "#64748b" }, doing: { label: "Đang làm", pct: 0.5, color: "#f59e0b" }, done: { label: "Hoàn thành", pct: 1, color: "#22c55e" } };
const TIEU_CHI_DANH_GIA = ["Chất lượng công việc", "Chủ động & Đúng tiến độ", "Tinh thần hợp tác"];
const TIEU_CHI_TRUONG_NHOM = ["Chủ động & Trách nhiệm", "Chất lượng Output", "Phối hợp Nhóm"];
const LUA_CHON_DIEM = [
  { value: 0, label: "—" },
  { value: 2, label: "2 – Chưa đạt" },
  { value: 6, label: "6 – Trung bình" },
  { value: 8, label: "8 – Tốt" },
  { value: 9, label: "9 – Rất tốt" },
  { value: 10, label: "10 – Xuất sắc" },
];
const MAU_THANH_VIEN = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7","#e11d48","#0ea5e9","#22c55e","#eab308"];
const CAC_TAB = [
  { id: "setup", icon: "⚙️", label: "Thiết lập" },
  { id: "tasks", icon: "📋", label: "Công việc" },
  { id: "discussion", icon: "💬", label: "Thảo luận" },
  { id: "peer", icon: "👥", label: "Đánh giá & Nhận xét" },
  { id: "leader", icon: "👑", label: "Đánh giá trưởng nhóm" },
  { id: "schedule", icon: "📅", label: "Họp nhóm" },
  { id: "analysis", icon: "📊", label: "Phân tích" },
  { id: "result", icon: "🏆", label: "Kết quả" },
];
const uid = () => Math.random().toString(36).substring(2, 9);
const tinhTrungBinh = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// ─── GIAO DIỆN ──────────────────────────────────────────────────────────────────
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

// ─── THÀNH PHẦN CON ─────────────────────────────────────────────────────────────
function The({ color, children, style = {} }: { color: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, ...style }}>{children}</span>;
}

function TheCard({ children, style = {}, theme }: { children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) {
  const styles = themeStyles[theme];
  return <div className="card" style={{ background: styles.cardBg, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 24, ...style }}>{children}</div>;
}

function NutBam({ children, onClick, variant = "primary", style = {}, disabled = false, theme }: { children: React.ReactNode; onClick?: () => void; variant?: string; style?: React.CSSProperties; disabled?: boolean; theme: Theme }) {
  const base = { border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: disabled ? 0.4 : 1 };
  const vars: Record<string, React.CSSProperties> = { 
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }, 
    ghost: { background: "transparent", border: `1px solid ${themeStyles[theme].border}`, color: themeStyles[theme].textMuted }, 
    danger: { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }, 
    success: { background: "#052e16", color: "#86efac", border: "1px solid #166534" } 
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function OInput({ value, onChange, placeholder, style = {}, type = "text", onKeyDown, theme }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties; type?: string; onKeyDown?: (e: React.KeyboardEvent) => void; theme: Theme }) {
  const styles = themeStyles[theme];
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: styles.text, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...style }}
    onFocus={e => e.currentTarget.style.borderColor = "#6366f1"} onBlur={e => e.currentTarget.style.borderColor = styles.border} onKeyDown={onKeyDown} />;
}

function Chon({ value, onChange, children, style = {}, theme }: { value: string; onChange: (v: string) => void; children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) {
  const styles = themeStyles[theme];
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: value ? styles.text : styles.textMuted, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer", ...style }}>{children}</select>;
}

function ChonDiem({ value, onChange, theme }: { value: number; onChange: (v: number) => void; theme: Theme }) {
  const styles = themeStyles[theme];
  return <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 8, padding: "7px 10px", color: styles.text, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
    {LUA_CHON_DIEM.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

function ThanhTienTrinh({ value, max, color = "#6366f1" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ height: 8, background: "#1e2235", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4, transition: "width .5s ease" }} /></div>;
}

const nhan = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const nutLoc = (theme: Theme) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${themeStyles[theme].border}`, background: "transparent", color: themeStyles[theme].textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s" });
const nutLocActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

// ─── CHAT BOX ─────────────────────────────────────────────────────────────────
function ChatBox({ chatMessages, setChatMessages, members, theme, currentReviewer }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const styles = themeStyles[theme];

  const layTen = (id: string) => {
    const m = members.find((m: any) => m.id === id);
    return m ? m.name : "Khách";
  };

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen) setUnreadCount(0);
  }, [isOpen]);

  const guiTinNhan = () => {
    if (!message.trim()) return;
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề trước khi chat!");
      return;
    }
    const newMsg = {
      id: uid(),
      authorId: currentReviewer,
      authorName: layTen(currentReviewer),
      content: message.trim(),
      timestamp: new Date().toISOString()
    };
    setChatMessages((prev: any) => [...(prev || []), newMsg]);
    setMessage("");
  };

  const tinNhanHienThi = (chatMessages || []).slice(-50);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          border: "none",
          color: "white",
          fontSize: 24,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        💬
        {unreadCount > 0 && !isOpen && (
          <span style={{
            position: "absolute",
            top: -4,
            right: -4,
            background: "#ef4444",
            color: "white",
            borderRadius: "50%",
            width: 20,
            height: 20,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: 84,
          right: 20,
          width: 360,
          maxHeight: 480,
          background: styles.cardBg,
          border: `1px solid ${styles.border}`,
          borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "'DM Sans', sans-serif"
        }}>
          <div style={{
            padding: "12px 16px",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>💬 Chat nhóm</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "white", fontSize: 18, cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          
          <div style={{
            flex: 1,
            padding: "12px 16px",
            overflowY: "auto",
            maxHeight: 340,
            minHeight: 200
          }}>
            {tinNhanHienThi.length === 0 ? (
              <div style={{ textAlign: "center", color: styles.textMuted, padding: 20, fontSize: 13 }}>
                Chưa có tin nhắn nào
              </div>
            ) : (
              tinNhanHienThi.map((msg: any) => (
                <div key={msg.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: "#6366f1" }}>
                      {msg.authorName}
                    </span>
                    <span style={{ fontSize: 10, color: styles.textMuted }}>
                      {new Date(msg.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: styles.text, wordBreak: "break-word" }}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          
          <div style={{
            padding: "12px 16px",
            borderTop: `1px solid ${styles.border}`,
            display: "flex",
            gap: 8
          }}>
            <OInput
              value={message}
              onChange={setMessage}
              placeholder="Nhập tin nhắn..."
              theme={theme}
              onKeyDown={(e: any) => e.key === "Enter" && guiTinNhan()}
              style={{ flex: 1 }}
            />
            <NutBam onClick={guiTinNhan} theme={theme} style={{ padding: "10px 16px" }}>
              Gửi
            </NutBam>
          </div>
        </div>
      )}
    </>
  );
}

// ─── HỌP NHÓM ─────────────────────────────────────────────────────────────────
function HopNhom({ members, scheduleSlots, setScheduleSlots, scheduleSelections, setScheduleSelections, theme, currentReviewer }: any) {
  // ... (giữ nguyên như code đã gửi)
}

// ─── THIẾT LẬP ──────────────────────────────────────────────────────────────────
function ThietLap({ members, setMembers, projectName, setProjectName, leader, setLeader, theme }: any) {
  // ... (giữ nguyên)
}

// ─── CÔNG VIỆC ──────────────────────────────────────────────────────────────────
function CongViec({ members, tasks, setTasks, theme, leader, currentReviewer }: any) {
  const [form, setForm] = useState({ 
    name: "", 
    description: "",
    subtasks: [] as string[],
    deadline: "", 
    complexity: 2
  });
  const [subtaskInput, setSubtaskInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [leaderRoleAssign, setLeaderRoleAssign] = useState<Record<string, string>>({});
  
  const styles = themeStyles[theme];
  
  const addTask = () => { 
    if (!form.name.trim() || form.subtasks.length === 0) {
      alert("Vui lòng nhập tên công việc và ít nhất 1 đầu việc nhỏ!");
      return;
    }
    const newTask = { 
      id: uid(), 
      name: form.name,
      description: form.description || "",
      subtasks: form.subtasks.map((name: string) => ({ 
        id: uid(),
        name: name,
        assignee: null,
        status: "pending" 
      })),
      deadline: form.deadline, 
      complexity: form.complexity, 
      status: "todo",
      productLink: "",
      submittedBy: "",
      createdAt: new Date().toISOString()
    };
    setTasks((t: any[]) => [...t, newTask]); 
    setForm({ name: "", description: "", subtasks: [], deadline: "", complexity: 2 });
    setSubtaskInput("");
    setShowForm(false); 
  };

  const addSubtask = () => {
    if (!subtaskInput.trim()) return;
    setForm((f: any) => ({
      ...f,
      subtasks: [...f.subtasks, subtaskInput.trim()]
    }));
    setSubtaskInput("");
  };

  const removeSubtask = (index: number) => {
    setForm((f: any) => ({
      ...f,
      subtasks: f.subtasks.filter((_: any, i: number) => i !== index)
    }));
  };

  const startEditing = (task: any) => {
    if (leader !== currentReviewer) {
      alert("Chỉ trưởng nhóm mới có thể chỉnh sửa công việc!");
      return;
    }
    setEditingTask({
      ...task,
      subtaskNames: task.subtasks.map((s: any) => s.name)
    });
  };

  const saveEdit = () => {
    if (!editingTask.name.trim() || editingTask.subtaskNames.length === 0) {
      alert("Vui lòng nhập tên công việc và ít nhất 1 đầu việc nhỏ!");
      return;
    }
    setTasks((prev: any[]) => prev.map((t: any) => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          name: editingTask.name,
          description: editingTask.description || "",
          subtasks: editingTask.subtaskNames.map((name: string) => {
            const existing = t.subtasks.find((s: any) => s.name === name);
            return existing || { id: uid(), name, assignee: null, status: "pending" };
          }),
          deadline: editingTask.deadline,
          complexity: editingTask.complexity
        };
      }
      return t;
    }));
    setEditingTask(null);
    alert("✅ Đã cập nhật công việc!");
  };

  const nhanTaskCon = (taskId: string, subtaskId: string) => {
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    setTasks((prev: any[]) => prev.map((t: any) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map((s: any) => {
            if (s.id === subtaskId && s.assignee === null) {
              return { ...s, assignee: currentReviewer, status: "accepted" };
            }
            return s;
          })
        };
      }
      return t;
    }));
    alert("✅ Bạn đã nhận đầu việc này!");
  };

  const chiDinhCung = (taskId: string, subtaskId: string, memberId: string) => {
    if (leader !== currentReviewer) {
      alert("Chỉ trưởng nhóm mới có thể chỉ định!");
      return;
    }
    setTasks((prev: any[]) => prev.map((t: any) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map((s: any) => {
            if (s.id === subtaskId) {
              return { ...s, assignee: memberId, status: "accepted" };
            }
            return s;
          })
        };
      }
      return t;
    }));
    const member = members.find((m: any) => m.id === memberId);
    alert(`✅ Đã chỉ định đầu việc cho ${member?.name || "thành viên"}!`);
  };

  const xoaTask = (taskId: string) => {
    if (leader !== currentReviewer) {
      alert("Chỉ trưởng nhóm mới có thể xóa công việc!");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      setTasks((prev: any[]) => prev.filter((t: any) => t.id !== taskId));
    }
  };

  const doiTrangThai = (id: string) => { 
    const order = ["todo", "doing", "done"]; 
    setTasks((ts: any[]) => ts.map((t: any) => {
      if (t.id !== id) return t;
      const allAssigned = t.subtasks.every((s: any) => s.assignee !== null);
      if (!allAssigned && t.status !== "todo") {
        alert("⚠️ Vẫn còn đầu việc chưa có ai nhận! Không thể chuyển trạng thái.");
        return t;
      }
      return { ...t, status: order[(order.indexOf(t.status) + 1) % 3] };
    })); 
  };

  const layTen = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    return member ? member.name : "Không xác định";
  };

  const filtered = filter === "all" 
    ? tasks 
    : tasks.filter((t: any) => t.subtasks?.some((s: any) => s.assignee === filter));

  const nutStyle = nutLoc(theme);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ ...nutStyle, ...(filter === "all" ? nutLocActive : {}) }}>
            Tất cả ({tasks.length})
          </button>
          {members.map((m: any) => (
            <button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)} style={{ ...nutStyle, ...(filter === m.id ? { borderColor: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length], color: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length], background: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length] + "18" } : {}) }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length], display: "inline-block" }} />
              <span className="hide-on-mobile">{m.name.split(" ").pop()}</span>
              <span> ({tasks.filter((t: any) => t.subtasks?.some((s: any) => s.assignee === m.id)).length})</span>
            </button>
          ))}
        </div>
        {leader === currentReviewer && (
          <NutBam onClick={() => setShowForm(true)} theme={theme}>+ Tạo công việc</NutBam>
        )}
      </div>
      
      {/* Form tạo task */}
      {showForm && leader === currentReviewer && (
        <TheCard style={{ marginBottom: 20, borderColor: "#312e81" }} theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={nhan}>Tên công việc *</label>
              <OInput value={form.name} onChange={v => setForm((f: any) => ({ ...f, name: v }))} placeholder="VD: Làm báo cáo marketing" theme={theme} />
            </div>
            <div>
              <label style={nhan}>Hạn chót</label>
              <OInput type="date" value={form.deadline} onChange={v => setForm((f: any) => ({ ...f, deadline: v }))} theme={theme} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={nhan}>Mô tả chi tiết</label>
            <OInput value={form.description} onChange={v => setForm((f: any) => ({ ...f, description: v }))} placeholder="Mô tả công việc chi tiết..." theme={theme} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={nhan}>Độ khó</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[1,2,3].map(v => (
                <button key={v} onClick={() => setForm((f: any) => ({ ...f, complexity: v }))} 
                  style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1px solid ${form.complexity === v ? DO_KHO[v as keyof typeof DO_KHO].color : styles.border}`, background: form.complexity === v ? DO_KHO[v as keyof typeof DO_KHO].color + "22" : "transparent", color: form.complexity === v ? DO_KHO[v as keyof typeof DO_KHO].color : styles.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {DO_KHO[v as keyof typeof DO_KHO].label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={nhan}>Các đầu việc nhỏ *</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <OInput 
                value={subtaskInput} 
                onChange={setSubtaskInput} 
                placeholder="Nhập đầu việc nhỏ..." 
                theme={theme}
                style={{ flex: 1 }}
                onKeyDown={(e: any) => e.key === "Enter" && addSubtask()}
              />
              <NutBam onClick={addSubtask} theme={theme}>Thêm</NutBam>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {form.subtasks.map((name: string, idx: number) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: styles.inputBg, borderRadius: 6 }}>
                  <span style={{ fontSize: 13, color: styles.text }}>{idx + 1}. {name}</span>
                  <button onClick={() => removeSubtask(idx)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "auto", fontSize: 16 }}>×</button>
                </div>
              ))}
              {form.subtasks.length === 0 && (
                <div style={{ fontSize: 13, color: styles.textMuted, fontStyle: "italic" }}>Chưa có đầu việc nào. Hãy thêm ít nhất 1 đầu việc!</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <NutBam onClick={() => setShowForm(false)} variant="ghost" theme={theme}>Hủy</NutBam>
            <NutBam onClick={addTask} theme={theme}>✓ Tạo công việc</NutBam>
          </div>
        </TheCard>
      )}
      
      {/* Form chỉnh sửa task */}
      {editingTask && (
        <TheCard style={{ marginBottom: 20, borderColor: "#f59e0b" }} theme={theme}>
          <h4 style={{ margin: "0 0 16px", fontSize: 15, color: "#f59e0b" }}>✏️ Chỉnh sửa công việc</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={nhan}>Tên công việc *</label>
              <OInput 
                value={editingTask.name} 
                onChange={v => setEditingTask({ ...editingTask, name: v })} 
                theme={theme} 
              />
            </div>
            <div>
              <label style={nhan}>Hạn chót</label>
              <OInput 
                type="date" 
                value={editingTask.deadline || ""} 
                onChange={v => setEditingTask({ ...editingTask, deadline: v })} 
                theme={theme} 
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={nhan}>Mô tả chi tiết</label>
            <OInput 
              value={editingTask.description || ""} 
              onChange={v => setEditingTask({ ...editingTask, description: v })} 
              placeholder="Mô tả công việc..." 
              theme={theme} 
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={nhan}>Độ khó</label>
            <div style={{ display: "flex", gap: 6 }}>
              {[1,2,3].map(v => (
                <button key={v} onClick={() => setEditingTask({ ...editingTask, complexity: v })} 
                  style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1px solid ${editingTask.complexity === v ? DO_KHO[v as keyof typeof DO_KHO].color : styles.border}`, background: editingTask.complexity === v ? DO_KHO[v as keyof typeof DO_KHO].color + "22" : "transparent", color: editingTask.complexity === v ? DO_KHO[v as keyof typeof DO_KHO].color : styles.textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  {DO_KHO[v as keyof typeof DO_KHO].label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={nhan}>Các đầu việc nhỏ</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {editingTask.subtaskNames.map((name: string, idx: number) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: styles.inputBg, borderRadius: 6 }}>
                  <span style={{ fontSize: 13, color: styles.text }}>{idx + 1}. {name}</span>
                  <button 
                    onClick={() => {
                      const newNames = editingTask.subtaskNames.filter((_: string, i: number) => i !== idx);
                      setEditingTask({ ...editingTask, subtaskNames: newNames });
                    }} 
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: "auto", fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <OInput 
                value={editingTask.newSubtask || ""} 
                onChange={v => setEditingTask({ ...editingTask, newSubtask: v })} 
                placeholder="Thêm đầu việc mới..." 
                theme={theme}
                style={{ flex: 1 }}
                onKeyDown={(e: any) => {
                  if (e.key === "Enter" && editingTask.newSubtask?.trim()) {
                    setEditingTask({
                      ...editingTask,
                      subtaskNames: [...(editingTask.subtaskNames || []), editingTask.newSubtask.trim()],
                      newSubtask: ""
                    });
                  }
                }}
              />
              <NutBam 
                onClick={() => {
                  if (editingTask.newSubtask?.trim()) {
                    setEditingTask({
                      ...editingTask,
                      subtaskNames: [...(editingTask.subtaskNames || []), editingTask.newSubtask.trim()],
                      newSubtask: ""
                    });
                  }
                }} 
                theme={theme}
              >
                Thêm
              </NutBam>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <NutBam onClick={() => setEditingTask(null)} variant="ghost" theme={theme}>Hủy</NutBam>
            <NutBam onClick={saveEdit} theme={theme}>✓ Lưu thay đổi</NutBam>
          </div>
        </TheCard>
      )}
      
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: styles.textMuted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Chưa có công việc nào</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Nhấn "+ Tạo công việc" để bắt đầu</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(420px,1fr))", gap: 14 }}>
          {filtered.map((t: any) => {
            const sc = TRANG_THAI[t.status as keyof typeof TRANG_THAI];
            const od = t.deadline && t.status !== "done" && new Date(t.deadline) < new Date();
            const allAssigned = t.subtasks?.some((s: any) => s.assignee !== null) && t.subtasks?.every((s: any) => s.assignee !== null);
            const pendingSubtasks = t.subtasks?.filter((s: any) => s.assignee === null) || [];
            
            return (
              <div key={t.id} style={{ background: styles.cardBg, border: `1px solid ${t.status === "done" ? "#166534" : od ? "#7f1d1d" : styles.border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <The color={DO_KHO[t.complexity as keyof typeof DO_KHO].color}>
                      Cấp {t.complexity} {t.complexity === 3 && "⭐+1"}
                    </The>
                    {t.status === "done" && <The color="#22c55e">✅ Hoàn thành</The>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {leader === currentReviewer && (
                      <>
                        <button onClick={() => startEditing(t)} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", fontSize: 14 }} title="Chỉnh sửa">
                          ✏️
                        </button>
                        <button onClick={() => xoaTask(t.id)} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18 }}>×</button>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ fontSize: 16, fontWeight: 700, color: t.status === "done" ? "#4ade80" : styles.text, textDecoration: t.status === "done" ? "line-through" : "none", marginBottom: 6 }}>
                  {t.name}
                </div>
                {t.description && (
                  <div style={{ fontSize: 13, color: styles.textMuted, marginBottom: 10 }}>{t.description}</div>
                )}
                
                {t.deadline && <div style={{ fontSize: 12, color: od ? "#f87171" : styles.textMuted, marginBottom: 12 }}>{od ? "⚠️ Quá hạn: " : "📅 Hạn: "}{new Date(t.deadline + "T00:00:00").toLocaleDateString("vi-VN")}</div>}
                
                {/* Các đầu việc nhỏ */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>
                    📌 Các đầu việc nhỏ:
                  </div>
                  {t.subtasks?.length > 0 ? (
                    t.subtasks.map((s: any) => {
                      const isPending = s.assignee === null;
                      const isMine = s.assignee === currentReviewer;
                      const member = members.find((m: any) => m.id === s.assignee);
                      const canAssign = leader === currentReviewer && isPending;
                      
                      return (
                        <div key={s.id} style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 8, 
                          padding: "6px 10px", 
                          background: isMine ? "#22c55e22" : isPending ? styles.inputBg : styles.inputBg,
                          borderRadius: 6,
                          marginBottom: 4,
                          borderLeft: `3px solid ${isMine ? "#22c55e" : isPending ? "#f59e0b" : "#6366f1"}`
                        }}>
                          <span style={{ fontSize: 13, flex: 1 }}>
                            {isPending ? "⬜" : "✅"} {s.name}
                            {isMine && <span style={{ fontSize: 11, color: "#22c55e", marginLeft: 8 }}>✅ (Bạn đã nhận)</span>}
                            {!isPending && s.assignee && !isMine && (
                              <span style={{ fontSize: 11, color: "#6366f1", marginLeft: 8 }}>👤 {layTen(s.assignee)}</span>
                            )}
                            {isPending && <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 8 }}>⏳ Chưa có ai nhận</span>}
                          </span>
                          
                          {isPending && currentReviewer && (
                            <NutBam 
                              onClick={() => nhanTaskCon(t.id, s.id)} 
                              variant="success" 
                              theme={theme} 
                              style={{ padding: "4px 12px", fontSize: 11 }}
                            >
                              Nhận
                            </NutBam>
                          )}
                          
                          {canAssign && (
                            <>
                              <Chon 
                                value={leaderRoleAssign[`${t.id}-${s.id}`] || ""}
                                onChange={(v: string) => setLeaderRoleAssign({ ...leaderRoleAssign, [`${t.id}-${s.id}`]: v })}
                                theme={theme}
                                style={{ width: 120, padding: "4px 8px", fontSize: 12 }}
                              >
                                <option value="">Chỉ định...</option>
                                {members.map((m: any) => (
                                  <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                              </Chon>
                              {leaderRoleAssign[`${t.id}-${s.id}`] && (
                                <NutBam 
                                  onClick={() => {
                                    chiDinhCung(t.id, s.id, leaderRoleAssign[`${t.id}-${s.id}`]);
                                    setLeaderRoleAssign({ ...leaderRoleAssign, [`${t.id}-${s.id}`]: "" });
                                  }} 
                                  variant="primary" 
                                  theme={theme} 
                                  style={{ padding: "4px 12px", fontSize: 11 }}
                                >
                                  👑 Chỉ định
                                </NutBam>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ fontSize: 13, color: styles.textMuted, fontStyle: "italic" }}>
                      Chưa có đầu việc nào
                    </div>
                  )}
                  
                  {pendingSubtasks.length > 0 && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>
                      ⏰ Còn {pendingSubtasks.length} đầu việc chưa có ai nhận. Sau 24h, leader sẽ chỉ định cứng.
                    </div>
                  )}
                  {allAssigned && t.subtasks.length > 0 && t.status !== "done" && (
                    <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>
                      ✅ Tất cả đầu việc đã có người nhận!
                    </div>
                  )}
                </div>
                
                {/* Nộp sản phẩm */}
                {allAssigned && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 4 }}>
                      🔗 Link sản phẩm
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <OInput 
                        value={t.productLink || ""}
                        onChange={(v: string) => {
                          setTasks((prev: any[]) => prev.map((task: any) =>
                            task.id === t.id ? { ...task, productLink: v } : task
                          ));
                        }}
                        placeholder="https://docs.google.com/..."
                        theme={theme}
                        style={{ flex: 1 }}
                      />
                      <NutBam 
                        onClick={() => {
                          if (t.productLink?.trim()) {
                            setTasks((prev: any[]) => prev.map((task: any) =>
                              task.id === t.id ? { ...task, submittedBy: currentReviewer } : task
                            ));
                            alert("✅ Đã nộp sản phẩm!");
                          } else {
                            alert("⚠️ Vui lòng nhập link sản phẩm!");
                          }
                        }} 
                        theme={theme}
                        style={{ padding: "10px 16px" }}
                      >
                        Gửi
                      </NutBam>
                    </div>
                    {t.submittedBy && (
                      <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>
                        ✅ Đã nộp bởi {layTen(t.submittedBy)}
                      </div>
                    )}
                  </div>
                )}
                
                <button onClick={() => doiTrangThai(t.id)} style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${sc.color}44`, background: sc.color + "18", color: sc.color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
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

// ─── CÁC TAB KHÁC ─────────────────────────────────────────────────────────────
// (Thảo luận, Đánh giá & Nhận xét, Đánh giá trưởng nhóm, Phân tích, Kết quả - giữ nguyên như code đã gửi)

// ─── ỨNG DỤNG CHÍNH ────────────────────────────────────────────────────────────
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
  const [currentReviewer, setCurrentReviewer] = useState(() => {
    return localStorage.getItem("currentReviewer") || "";
  });
  
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [scheduleSelections, setScheduleSelections] = useState<any>({});
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [taskDiscussions, setTaskDiscussions] = useState<any>({});
  const [taskComments, setTaskComments] = useState<any>({});
  const [taskContributionScores, setTaskContributionScores] = useState<any>({});
  
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
        setChatMessages(data.chatMessages || []);
        setTaskDiscussions(data.taskDiscussions || {});
        setTaskComments(data.taskComments || {});
        setTaskContributionScores(data.taskContributionScores || {});
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
    set(dbRef, { 
      projectName, leader, members, tasks, 
      peerScores, peerComments, leaderScores, 
      teacherScore, scheduleSlots, scheduleSelections,
      chatMessages, taskDiscussions, taskComments, taskContributionScores
    });
  }, [projectName, leader, members, tasks, peerScores, peerComments, leaderScores, teacherScore, 
      scheduleSlots, scheduleSelections, chatMessages, taskDiscussions, taskComments, taskContributionScores, roomId, isReady]);

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
    setChatMessages([]);
    setTaskDiscussions({});
    setTaskComments({});
    setTaskContributionScores({});
    setHasGroup(true);
  };

  const generateShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSelectUser = (userId: string) => {
    setCurrentReviewer(userId);
    localStorage.setItem("currentReviewer", userId);
  };

  const styles = themeStyles[theme];
  const peerCompletedCount = members.length >= 2 ? members.filter((m: any) => peerScores[m.id]?.completed === true).length : null;

  const tabBadge = {
    tasks: tasks.length || null,
    peer: peerCompletedCount !== null ? `${peerCompletedCount}/${members.length}` : null,
    discussion: tasks.filter((t: any) => {
      const assignedMembers = t.subtasks?.filter((s: any) => s.assignee !== null).map((s: any) => s.assignee) || [];
      return [...new Set(assignedMembers)].length >= 2;
    }).length || null,
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
        <TheCard style={{ textAlign: "center", maxWidth: 500, width: "100%" }} theme={theme}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🚀</div>
          <h2 style={{ color: "#a5b4fc", marginBottom: 12 }}>TEAM EVAL</h2>
          <p style={{ color: styles.textMuted, marginBottom: 24, lineHeight: 1.6 }}>
            Công cụ đánh giá nhóm học tập trực tuyến<br />
            Tạo nhóm mới để bắt đầu
          </p>
          <NutBam onClick={createNewGroup} variant="primary" theme={theme} style={{ padding: "12px 24px", fontSize: 16, width: "100%", maxWidth: 200 }}>
            ➕ Tạo nhóm mới
          </NutBam>
        </TheCard>
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
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: "#a5b4fc", letterSpacing: 2 }}>TEAM EVAL</div>
              <div style={{ fontSize: 11, color: "#5c54c7", letterSpacing: 3, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName || "NHÓM CỦA BẠN"}</div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: styles.textMuted }}>👤</span>
            <Chon 
              value={currentReviewer} 
              onChange={handleSelectUser} 
              theme={theme}
              style={{ minWidth: 150, padding: "4px 10px", fontSize: 13 }}
            >
              <option value="">Chọn tên...</option>
              {members.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </Chon>
          </div>
          
          <nav className="app-nav" style={{ display: "flex", gap: 4, background: styles.inputBg, borderRadius: 14, padding: 5, overflowX: "auto", flex: "1 1 auto", justifyContent: "center" }}>
            {CAC_TAB.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all .2s", background: tab === t.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: tab === t.id ? "#fff" : styles.textMuted, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
                {tabBadge[t.id as keyof typeof tabBadge] && <span style={{ background: tab === t.id ? "rgba(255,255,255,.25)" : styles.border, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{tabBadge[t.id as keyof typeof tabBadge]}</span>}
              </button>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 8 }}>
            <NutBam onClick={toggleTheme} variant="ghost" theme={theme} style={{ padding: "8px 12px", fontSize: 18 }}>{theme === "dark" ? "☀️" : "🌙"}</NutBam>
            <NutBam onClick={generateShareLink} variant={isCopied ? "success" : "primary"} theme={theme} style={{ padding: "8px 16px", fontSize: 12, whiteSpace: "nowrap" }}>{isCopied ? "✓ Đã copy!" : "🔗 Chia sẻ"}</NutBam>
          </div>
        </div>
      </div>
      <div className="app-content" style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "setup" && <ThietLap members={members} setMembers={setMembers} projectName={projectName} setProjectName={setProjectName} leader={leader} setLeader={setLeader} theme={theme} />}
        {tab === "tasks" && <CongViec 
          members={members} 
          tasks={tasks} 
          setTasks={setTasks} 
          theme={theme}
          leader={leader}
          currentReviewer={currentReviewer}
        />}
        {/* Các tab khác giữ nguyên */}
      </div>
      <ChatBox chatMessages={chatMessages} setChatMessages={setChatMessages} members={members} theme={theme} currentReviewer={currentReviewer} />
    </div>
  );
}
