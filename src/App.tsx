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
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("theme") as Theme | null;
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
};

const themeStyles = {
  dark: {
    bg: "#0a0a10",
    cardBg: "#13131a",
    border: "#1e2235",
    text: "#e2e8f0",
    textMuted: "#64748b",
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

// ─── THÀNH PHẦN UI CON ─────────────────────────────────────────────────────────────
function The({ color, children, style = {} }: { color: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, ...style }}>{children}</span>;
}

function TheCard({ children, style = {}, theme }: { children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) {
  const styles = themeStyles[theme];
  return <div style={{ background: styles.cardBg, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 24, ...style }}>{children}</div>;
}

function NutBam({ children, onClick, variant = "primary", style = {}, disabled = false, theme }: { children: React.ReactNode; onClick?: () => void; variant?: string; style?: React.CSSProperties; disabled?: boolean; theme: Theme }) {
  const base = { border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: disabled ? 0.4 : 1 };
  const vars: Record<string, React.CSSProperties> = { 
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }, 
    ghost: { background: "transparent", border: `1px solid ${themeStyles[theme].border}`, color: themeStyles[theme].text }, 
    danger: { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" }, 
    success: { background: "#052e16", color: "#86efac", border: "1px solid #166534" } 
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function OInput({ value, onChange, placeholder, style = {}, type = "text", onKeyDown, theme }: { value: string; onChange: (v: string) => void; placeholder?: string; style?: React.CSSProperties; type?: string; onKeyDown?: (e: React.KeyboardEvent) => void; theme: Theme }) {
  const styles = themeStyles[theme];
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: styles.text, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...style }}
    onKeyDown={onKeyDown} />;
}

function Chon({ value, onChange, children, style = {}, theme }: { value: string; onChange: (v: string) => void; children: React.ReactNode; style?: React.CSSProperties; theme: Theme }) {
  const styles = themeStyles[theme];
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: value ? styles.text : styles.textMuted, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer", ...style }}>{children}</select>;
}

function ChonDiem({ value, onChange, theme }: { value: number; onChange: (v: number) => void; theme: Theme }) {
  const styles = themeStyles[theme];
  return <select value={value !== undefined && value !== null ? value : 0} onChange={e => onChange(Number(e.target.value))} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 8, padding: "7px 10px", color: styles.text, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
    {LUA_CHON_DIEM.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

function ThanhTienTrinh({ value, max, color = "#6366f1" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ height: 8, background: "#1e2235", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4, transition: "width .5s ease" }} /></div>;
}

function HelpIcon({ text, title = "Hướng dẫn" }: { text: string; title?: string }) {
  const [show, setShow] = useState(false);
  const lines = text.split('\n');
  
  return (
    <span style={{ position: "relative", display: "inline-block", marginLeft: 6 }}>
      <span 
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        style={{ 
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: "50%", background: "#6366f144",
          color: "#a5b4fc", fontSize: 11, fontWeight: 700, cursor: "pointer", border: "1px solid #6366f144", userSelect: "none"
        }}
      >
        ?
      </span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#1e1b4b", border: "1px solid #312e81", borderRadius: 8, padding: "10px 14px",
          fontSize: 12, color: "#e2e8f0", minWidth: 220, maxWidth: 300, zIndex: 100, boxShadow: "0 4px 12px rgba(0,0,0,0.4)", textAlign: "left", lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600, color: "#a5b4fc", marginBottom: 6 }}>{title}</div>
          {lines.map((line, i) => <div key={i} style={{ marginBottom: i < lines.length - 1 ? 4 : 0 }}>{line}</div>)}
        </div>
      )}
    </span>
  );
}

function HelpDialog({ theme }: { theme: Theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const styles = themeStyles[theme];

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} style={{ position: "fixed", bottom: 80, right: 20, width: 44, height: 44, borderRadius: 22, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", fontSize: 20, cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>❓</button>
      {isOpen && (
        <div style={{ position: "fixed", bottom: 132, right: 20, width: 380, maxHeight: 500, background: styles.cardBg, border: `1px solid ${styles.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 1000, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 16px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>❓ Hướng dẫn sử dụng</span>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ flex: 1, padding: "16px 20px", overflowY: "auto", fontSize: 13, lineHeight: 1.8, color: styles.text }}>
            <div style={{ marginBottom: 12 }}><b>🚀 Bắt đầu:</b> Chọn tên của bạn trên thanh tiêu đề để định danh thao tác.</div>
            <div style={{ marginBottom: 12 }}><b>📋 Công việc:</b> Nhận task nhỏ theo thế mạnh. Sau 24h hệ thống tự auto-assign ngẫu nhiên. Sau khi tất cả các task nhỏ được nhận mới có thể nộp sản phẩm.</div>
            <div><b>📊 Thang điểm đóng góp:</b> Kết quả được tự động tổng hợp trực quan dựa trên các tiêu chí chấm chéo chéo ẩn danh giữa các đồng đội.</div>
          </div>
        </div>
      )}
    </>
  );
}

const nhan = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const };
const nutLoc = (theme: Theme) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${themeStyles[theme].border}`, background: "transparent", color: themeStyles[theme].text, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s" });
const nutLocActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

// ─── CHAT BOX ─────────────────────────────────────────────────────────────────
function ChatBox({ chatMessages, setChatMessages, members, theme, currentReviewer }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const styles = themeStyles[theme];

  const layTen = (id: string) => members.find((m: any) => m.id === id)?.name || "Khách";

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const guiTinNhan = () => {
    if (!message.trim()) return;
    if (!currentReviewer) { alert("⚠️ Vui lòng chọn tên của bạn trên thanh tiêu đề trước khi chat!"); return; }
    const newMsg = { id: uid(), authorId: currentReviewer, authorName: layTen(currentReviewer), content: message.trim(), timestamp: new Date().toISOString() };
    setChatMessages((prev: any) => [...(prev || []), newMsg]);
    setMessage("");
  };

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} style={{ position: "fixed", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "white", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>💬</button>
      {isOpen && (
        <div style={{ position: "fixed", bottom: 84, right: 20, width: 360, maxHeight: 480, background: styles.cardBg, border: `1px solid ${styles.border}`, borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>💬 Chat nhóm</span>
            <button onClick={() => setIsOpen(false)} style={{ background: "none", border: "none", color: "white", fontSize: 18 }}>✕</button>
          </div>
          <div style={{ flex: 1, padding: "12px 16px", overflowY: "auto", minHeight: 200 }}>
            {(chatMessages || []).slice(-50).map((msg: any) => (
              <div key={msg.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: "#6366f1" }}>{msg.authorName}</span>
                  <span style={{ fontSize: 10, color: styles.textMuted }}>{new Date(msg.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div style={{ fontSize: 13, color: styles.text, wordBreak: "break-word" }}>{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${styles.border}`, display: "flex", gap: 8 }}>
            <OInput value={message} onChange={setMessage} placeholder="Nhập tin nhắn..." theme={theme} onKeyDown={(e) => e.key === "Enter" && guiTinNhan()} style={{ flex: 1 }} />
            <NutBam onClick={guiTinNhan} theme={theme} style={{ padding: "10px 16px" }}>Gửi</NutBam>
          </div>
        </div>
      )}
    </>
  );
}

// ─── HỌP NHÓM ─────────────────────────────────────────────────────────────────
function HopNhom({ members, scheduleSlots, setScheduleSlots, scheduleSelections, setScheduleSelections, theme, currentReviewer }: any) {
  const styles = themeStyles[theme];
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const layTen = (id: string) => members.find((m: any) => m.id === id)?.name || "Không xác định";

  const themKhungGio = () => {
    if (!newSlotDate || !newSlotStart || !newSlotEnd) return;
    const newSlot = { id: uid(), date: newSlotDate, start: newSlotStart, end: newSlotEnd, label: `${new Date(newSlotDate).toLocaleDateString("vi-VN")} - ${newSlotStart}→${newSlotEnd}` };
    setScheduleSlots((prev: any[]) => [...prev, newSlot]);
    setNewSlotDate(""); setNewSlotStart(""); setNewSlotEnd(""); setShowCreateForm(false);
  };

  const xoaKhungGio = (slotId: string) => {
    setScheduleSlots((prev: any[]) => prev.filter(s => s.id !== slotId));
    const newSelections = { ...scheduleSelections };
    Object.keys(newSelections).forEach(memberId => { if (newSelections[memberId]?.[slotId]) delete newSelections[memberId][slotId]; });
    setScheduleSelections(newSelections);
  };

  const chon = (slotId: string) => {
    if (!currentReviewer) { alert("⚠️ Vui lòng chọn tên của bạn trên thanh tiêu đề!"); return; }
    setScheduleSelections((prev: any) => ({
      ...prev,
      [currentReviewer]: { ...(prev[currentReviewer] || {}), [slotId]: !(prev[currentReviewer]?.[slotId] || false) }
    }));
  };

  const tongSo = useMemo(() => {
    const totals: Record<string, number> = {};
    (scheduleSlots || []).forEach((slot: any) => {
      let count = 0;
      members.forEach((m: any) => { if (scheduleSelections[m.id]?.[slot.id]) count++; });
      totals[slot.id] = count;
    });
    return totals;
  }, [scheduleSlots, scheduleSelections, members]);

  const totNhat = useMemo(() => {
    if (!scheduleSlots || scheduleSlots.length === 0) return null;
    let best = scheduleSlots[0]; let bestCount = -1;
    scheduleSlots.forEach((slot: any) => { if ((tongSo[slot.id] || 0) > bestCount) { bestCount = tongSo[slot.id] || 0; best = slot; } });
    return { slot: best, count: bestCount, total: members.length };
  }, [scheduleSlots, tongSo, members]);

  return (
    <div>
      <TheCard theme={theme} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#a5b4fc" }}>📅 KHẢO SÁT LỊCH RẢNH</h3>
          <NutBam onClick={() => setShowCreateForm(!showCreateForm)} variant="ghost" theme={theme}>{showCreateForm ? "✖ Đóng" : "+ Thêm khung giờ"}</NutBam>
        </div>
        
        {showCreateForm && (
          <div style={{ background: styles.inputBg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div><label style={nhan}>Ngày</label><OInput type="date" value={newSlotDate} onChange={setNewSlotDate} theme={theme} /></div>
              <div><label style={nhan}>Từ giờ</label><OInput type="time" value={newSlotStart} onChange={setNewSlotStart} theme={theme} /></div>
              <div><label style={nhan}>Đến giờ</label><OInput type="time" value={newSlotEnd} onChange={setNewSlotEnd} theme={theme} /></div>
              <NutBam onClick={themKhungGio} theme={theme}>Thêm</NutBam>
            </div>
          </div>
        )}

        {(scheduleSlots || []).length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: styles.textMuted }}>Chưa có khung giờ khảo sát nào.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${styles.border}`, color: styles.textMuted, fontSize: 13 }}>
                <th style={{ textAlign: "left", padding: 12 }}>Khung giờ</th>
                <th style={{ padding: 12 }}>Lựa chọn của bạn</th>
                <th style={{ padding: 12 }}>Số người rảnh</th>
                <th style={{ padding: 12 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {scheduleSlots.map((slot: any) => (
                <tr key={slot.id} style={{ borderBottom: `1px solid ${styles.border}`, fontSize: 14 }}>
                  <td style={{ padding: 12 }}>{slot.label}</td>
                  <td style={{ textAlign: "center", padding: 12 }}>
                    <button onClick={() => chon(slot.id)} style={{ width: 32, height: 32, borderRadius: 8, background: scheduleSelections[currentReviewer]?.[slot.id] ? "#22c55e" : styles.inputBg, border: `1px solid ${styles.border}`, color: "#fff", cursor: "pointer" }}>
                      {scheduleSelections[currentReviewer]?.[slot.id] ? "✓" : "○"}
                    </button>
                  </td>
                  <td style={{ textAlign: "center", padding: 12 }}><span style={{ fontWeight: 700, color: "#22c55e" }}>{tongSo[slot.id] || 0}</span>/{members.length}</td>
                  <td style={{ textAlign: "center", padding: 12 }}><button onClick={() => xoaKhungGio(slot.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>🗑️</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TheCard>
    </div>
  );
}

// ─── THIẾT LẬP ──────────────────────────────────────────────────────────────────
function ThietLap({ members, setMembers, projectName, setProjectName, leader, setLeader, theme }: any) {
  const [name, setName] = useState("");
  const [mssv, setMssv] = useState("");
  const styles = themeStyles[theme];
  const add = () => { if (!name.trim()) return; setMembers((m: any[]) => [...m, { id: uid(), name: name.trim(), mssv: mssv.trim() }]); setName(""); setMssv(""); };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>⚙️ THIẾT LẬP CHUNG</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={nhan}>Tên dự án / môn học</label><OInput value={projectName} onChange={setProjectName} placeholder="VD: Dự án Marketing" theme={theme} /></div>
          <div>
            <label style={nhan}>Trưởng nhóm</label>
            <Chon value={leader} onChange={setLeader} theme={theme}>
              <option value="">Chọn trưởng nhóm...</option>
              {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Chon>
          </div>
        </div>
      </TheCard>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>👥 THÀNH VIÊN NHÓM</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
          <OInput value={name} onChange={setName} placeholder="Họ và tên" theme={theme} />
          <OInput value={mssv} onChange={setMssv} placeholder="MSSV" theme={theme} />
          <NutBam onClick={add} theme={theme}>Thêm</NutBam>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {members.map((m: any) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: styles.inputBg, borderRadius: 10, padding: "10px 14px" }}>
              <div><b>{m.name}</b> {m.mssv && `(${m.mssv})`}</div>
              {leader === m.id && <The color="#f59e0b">Leader</The>}
            </div>
          ))}
        </div>
      </TheCard>
    </div>
  );
}

// ─── CÔNG VIỆC (ĐÃ SỬA LỖI) ──────────────────────────────────────────────────
function CongViec({ members, tasks, setTasks, theme, leader, currentReviewer }: any) {
  const [form, setForm] = useState({ name: "", description: "", subtasks: [] as string[], assignees: [] as string[], deadline: "", complexity: 2 });
  const [subtaskInput, setSubtaskInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const styles = themeStyles[theme];

  // Tự động gán việc sau 24 giờ chưa ai nhận - SỬA
  useEffect(() => {
    if (!tasks || tasks.length === 0 || !members || members.length === 0) return;
    const now = new Date().getTime();
    let updated = false;
    const updatedTasks = tasks.map((t: any) => {
      if (t.status === "done") return t;
      const hours = (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
      if (hours >= 24) {
        const updatedSubtasks = t.subtasks.map((s: any) => {
          // SỬA: Kiểm tra assignee rỗng
          if (s.assignee === null || s.assignee === undefined || s.assignee === "") {
            updated = true;
            const randomMember = members[Math.floor(Math.random() * members.length)].id;
            return { ...s, assignee: randomMember, status: "accepted" };
          }
          return s;
        });
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    });
    if (updated) { 
      setTasks(updatedTasks); 
      alert("⏰ Hệ thống đã tự động phân chia ngẫu nhiên các công việc tồn đọng quá 24h!"); 
    }
  }, [tasks, members, setTasks]);

  const addTask = () => {
    if (!form.name.trim() || form.subtasks.length === 0) { alert("⚠️ Cần điền tên task chính và ít nhất 1 task nhỏ!"); return; }
    const newTask = { 
      id: uid(), 
      name: form.name, 
      description: form.description, 
      subtasks: form.subtasks.map(n => ({ id: uid(), name: n, assignee: null, status: "pending" })), 
      deadline: form.deadline, 
      complexity: form.complexity, 
      status: "todo", 
      productLink: "", 
      submittedBy: "", 
      createdAt: new Date().toISOString() 
    };
    setTasks((prev: any) => [...(prev || []), newTask]);
    setForm({ name: "", description: "", subtasks: [], assignees: [], deadline: "", complexity: 2 });
    setShowForm(false);
  };

  // SỬA: Hàm nhận task con
  const nhanTaskCon = (taskId: string, subtaskId: string) => {
    if (!currentReviewer) { alert("⚠️ Vui lòng chọn định danh của bạn ở thanh tiêu đề phía trên!"); return; }
    setTasks((prev: any[]) => prev.map(t => {
      if (t.id !== taskId) return t;
      return { 
        ...t, 
        subtasks: t.subtasks.map((s: any) => {
          // SỬA: Kiểm tra assignee rỗng
          if (s.id === subtaskId && (s.assignee === null || s.assignee === undefined || s.assignee === "")) {
            return { ...s, assignee: currentReviewer, status: "accepted" };
          }
          return s;
        }) 
      };
    }));
  };

  // SỬA: Hàm chuyển trạng thái
  const doiTrangThai = (id: string) => {
    setTasks((prev: any[]) => prev.map(t => {
      if (t.id !== id) return t;
      // SỬA: Kiểm tra assignee rỗng
      const hasPending = t.subtasks.some((s: any) => s.assignee === null || s.assignee === undefined || s.assignee === "");
      if (hasPending && t.status === "todo") { 
        alert("⚠️ Không thể chuyển trạng thái khi vẫn còn việc phụ chưa có ai nhận!"); 
        return t; 
      }
      const order = ["todo", "doing", "done"];
      return { ...t, status: order[(order.indexOf(t.status) + 1) % 3] };
    }));
  };

  // Lọc theo thành viên
  const filteredTasks = filter === "all" 
    ? tasks 
    : tasks.filter((t: any) => t.subtasks.some((s: any) => s.assignee === filter));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h3 style={{ margin: 0, color: "#a5b4fc" }}>📋 BẢNG CÔNG VIỆC CHUNG</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ ...nutLoc(theme), ...(filter === "all" ? nutLocActive : {}) }}>
            Tất cả ({tasks?.length || 0})
          </button>
          {members.map((m: any) => {
            const count = tasks.filter((t: any) => t.subtasks.some((s: any) => s.assignee === m.id)).length;
            return (
              <button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)} 
                style={{ ...nutLoc(theme), ...(filter === m.id ? { borderColor: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length], color: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length], background: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length] + "18" } : {}) }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length], display: "inline-block" }} />
                {m.name} ({count})
              </button>
            );
          })}
        </div>
        {leader === currentReviewer && <NutBam onClick={() => setShowForm(!showForm)} theme={theme}>+ Tạo công việc chính</NutBam>}
      </div>

      {showForm && (
        <TheCard theme={theme} style={{ marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <OInput value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Tên việc chính..." theme={theme} />
            <OInput type="date" value={form.deadline} onChange={v => setForm({ ...form, deadline: v })} theme={theme} />
            <Chon value={String(form.complexity)} onChange={v => setForm({ ...form, complexity: Number(v) })} theme={theme}>
              <option value="1">Nhẹ (1đ)</option>
              <option value="2">Trung bình (2đ)</option>
              <option value="3">Nặng (3đ)</option>
            </Chon>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <OInput value={subtaskInput} onChange={setSubtaskInput} placeholder="Nhập đầu việc phụ nhỏ..." theme={theme} />
            <NutBam onClick={() => { if (subtaskInput.trim()) { setForm({ ...form, subtasks: [...form.subtasks, subtaskInput.trim()] }); setSubtaskInput(""); } }} theme={theme}>Thêm</NutBam>
          </div>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {form.subtasks.map((st, i) => (
              <span key={i} style={{ background: styles.inputBg, padding: "4px 12px", borderRadius: 6, fontSize: 13 }}>
                {st} 
                <button onClick={() => setForm({ ...form, subtasks: form.subtasks.filter((_, idx) => idx !== i) })} 
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", marginLeft: 6 }}>✕</button>
              </span>
            ))}
          </div>
          <NutBam onClick={addTask} theme={theme} style={{ marginTop: 12 }}>✓ Lưu công việc</NutBam>
        </TheCard>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
        {(filteredTasks || []).map((t: any) => {
          // SỬA: Tính đúng số subtask chưa có người nhận
          const subtaskList = t.subtasks || [];
          const hasSubtasks = subtaskList.length > 0;
          // SỬA: Kiểm tra assignee rỗng
          const pendingSubtasks = subtaskList.filter((s: any) => s.assignee === null || s.assignee === undefined || s.assignee === "");
          const allAssigned = hasSubtasks && pendingSubtasks.length === 0;
          
          return (
            <div key={t.id} style={{ background: styles.cardBg, border: `1px solid ${t.status === "done" ? "#166534" : styles.border}`, padding: 18, borderRadius: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <The color={DO_KHO[t.complexity as 1|2|3].color}>{DO_KHO[t.complexity as 1|2|3].label}</The>
                <span style={{ fontSize: 12, color: styles.textMuted }}>Hạn: {t.deadline || "—"}</span>
              </div>
              <h4 style={{ margin: "10px 0 6px 0", color: styles.text }}>{t.name}</h4>
              {t.description && <div style={{ fontSize: 13, color: styles.textMuted, marginBottom: 10 }}>{t.description}</div>}
              
              <div style={{ margin: "10px 0" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>📌 Các đầu việc nhỏ:</div>
                {subtaskList.map((s: any) => {
                  // SỬA: Kiểm tra assignee rỗng
                  const isPending = s.assignee === null || s.assignee === undefined || s.assignee === "";
                  const isMine = s.assignee === currentReviewer;
                  const memberName = members.find((m: any) => m.id === s.assignee)?.name;
                  
                  return (
                    <div key={s.id} style={{ 
                      display: "flex", justifyContent: "space-between", alignItems: "center", 
                      padding: "6px 10px", marginBottom: 4, borderRadius: 6,
                      background: isMine ? "#22c55e22" : isPending ? styles.inputBg : styles.inputBg,
                      borderLeft: `3px solid ${isMine ? "#22c55e" : isPending ? "#f59e0b" : "#6366f1"}`
                    }}>
                      <span style={{ fontSize: 13, color: styles.text }}>
                        {isPending ? "⬜" : "✅"} {s.name}
                        {isMine && <span style={{ fontSize: 11, color: "#22c55e", marginLeft: 8 }}>✅ (Bạn đã nhận)</span>}
                        {!isPending && s.assignee && !isMine && (
                          <span style={{ fontSize: 11, color: "#6366f1", marginLeft: 8 }}>👤 {memberName}</span>
                        )}
                        {isPending && <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 8 }}>⏳ Chưa có ai nhận</span>}
                      </span>
                      {isPending && currentReviewer && (
                        <button onClick={() => nhanTaskCon(t.id, s.id)} 
                          style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                          Nhận
                        </button>
                      )}
                    </div>
                  );
                })}
                
                {/* SỬA: Hiển thị đúng thông báo */}
                {hasSubtasks && pendingSubtasks.length > 0 && (
                  <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>
                    ⏰ Còn {pendingSubtasks.length} đầu việc chưa có ai nhận
                  </div>
                )}
                {hasSubtasks && pendingSubtasks.length === 0 && t.status !== "done" && (
                  <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>
                    ✅ Tất cả đầu việc đã có người nhận!
                  </div>
                )}
                {!hasSubtasks && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>
                    ⚠️ Chưa có đầu việc nào!
                  </div>
                )}
              </div>

              {/* SỬA: Chỉ hiển thị nộp sản phẩm khi tất cả đã có người nhận */}
              {hasSubtasks && pendingSubtasks.length === 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#a5b4fc", marginBottom: 4 }}>🔗 Link sản phẩm</div>
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
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      Gửi
                    </NutBam>
                  </div>
                  {t.submittedBy && (
                    <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>
                      ✅ Đã nộp bởi {members.find((m: any) => m.id === t.submittedBy)?.name || "Không xác định"}
                    </div>
                  )}
                </div>
              )}
              
              <button onClick={() => doiTrangThai(t.id)} 
                style={{ width: "100%", padding: 10, background: TRANG_THAI[t.status as keyof typeof TRANG_THAI].color + "22", 
                  color: TRANG_THAI[t.status as keyof typeof TRANG_THAI].color, border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                {TRANG_THAI[t.status as keyof typeof TRANG_THAI].label} → Nhấn đổi trạng thái
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── THẢO LUẬN & GÓP Ý ────────────────────────────────────────────────────────
function ThaoLuan({ members, groupComments, setGroupComments, theme, currentReviewer }: any) {
  const [text, setText] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const styles = themeStyles[theme];

  const guiGopY = () => {
    if (!text.trim()) return;
    const comment = { id: uid(), author: isAnon ? "Ẩn danh" : (members.find((m: any) => m.id === currentReviewer)?.name || "Khách"), content: text.trim(), isAnon, timestamp: new Date().toISOString() };
    setGroupComments((prev: any) => [...(prev || []), comment]);
    setText("");
  };

  return (
    <TheCard theme={theme}>
      <h3 style={{ margin: "0 0 16px", color: "#a5b4fc" }}>💬 GÓP Ý ẨN DANH & THẢO LUẬN</h3>
      <div style={{ marginBottom: 12 }}><OInput value={text} onChange={setText} placeholder="Nhập ý kiến, góp ý xây dựng bài tập nhóm..." theme={theme} /></div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ fontSize: 13, color: styles.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
          <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} /> Chế độ ẩn danh 🔒
        </label>
        <NutBam onClick={guiGopY} theme={theme}>Gửi ý kiến</NutBam>
      </div>
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        {(groupComments || []).map((c: any) => (
          <div key={c.id} style={{ padding: 12, background: styles.inputBg, borderRadius: 10, borderLeft: `4px solid ${c.isAnon ? "#64748b" : "#6366f1"}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: c.isAnon ? "#94a3b8" : "#818cf8", marginBottom: 4 }}>{c.author} <span style={{ fontWeight: 400, color: styles.textMuted, marginLeft: 8 }}>{new Date(c.timestamp).toLocaleTimeString("vi-VN")}</span></div>
            <div style={{ fontSize: 14, color: styles.text }}>{c.content}</div>
          </div>
        ))}
      </div>
    </TheCard>
  );
}

// ─── ĐÁNH GIÁ THÀNH VIÊN ──────────────────────────────────────────────────────
function DanhGiaNhanXet({ members, peerReviews, setPeerReviews, theme, currentReviewer }: any) {
  const styles = themeStyles[theme];
  const [targetId, setTargetId] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({ "Chất lượng công việc": 0, "Chủ động & Đúng tiến độ": 0, "Tinh thần hợp tác": 0 });
  const [cmt, setCmt] = useState("");

  const luuDanhGia = () => {
    if (!currentReviewer || !targetId) { alert("⚠️ Vui lòng chọn đầy đủ người đánh giá và người được chấm!"); return; }
    if (currentReviewer === targetId) { alert("⚠️ Bạn không thể tự chấm điểm cho chính mình!"); return; }
    setPeerReviews((prev: any) => ({
      ...prev,
      [`${currentReviewer}-${targetId}`]: { from: currentReviewer, to: targetId, scores, comment: cmt.trim() }
    }));
    alert("✅ Đã lưu phiếu chấm chéo ẩn danh!"); setCmt("");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 16px", color: "#a5b4fc" }}>👥 CHẤM ĐIỂM ĐỒNG ĐỘI</h3>
        <div style={{ marginBottom: 14 }}>
          <label style={nhan}>Chọn thành viên muốn đánh giá</label>
          <Chon value={targetId} onChange={setTargetId} theme={theme}>
            <option value="">Chọn thành viên...</option>
            {members.filter((m: any) => m.id !== currentReviewer).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Chon>
        </div>
        {TIEU_CHI_DANH_GIA.map(tc => (
          <div key={tc} style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 120px", alignItems: "center" }}>
            <span style={{ fontSize: 13 }}>{tc}</span>
            <ChonDiem value={scores[tc]} onChange={v => setScores({ ...scores, [tc]: v })} theme={theme} />
          </div>
        ))}
        <div style={{ marginTop: 10 }}><label style={nhan}>Nhận xét đóng góp</label><OInput value={cmt} onChange={setCmt} placeholder="Nhập nhận xét khách quan..." theme={theme} /></div>
        <NutBam onClick={luuDanhGia} theme={theme} style={{ marginTop: 14, width: "100%" }}>Gửi đánh giá ẩn danh</NutBam>
      </TheCard>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 16px", color: "#a5b4fc" }}>📋 TRẠNG THÁI CHẤM</h3>
        <div style={{ fontSize: 13, color: styles.textMuted }}>Các phiếu chấm sẽ được bảo mật ẩn danh và chỉ xuất hiện kết quả tổng điểm trung bình tại Tab Kết Quả.</div>
      </TheCard>
    </div>
  );
}

// ─── ĐÁNH GIÁ TRƯỞNG NHÓM ────────────────────────────────────────────────────
function DanhGiaTruongNhom({ members, leaderReviews, setLeaderReviews, leader, theme, currentReviewer }: any) {
  const styles = themeStyles[theme];
  const [scores, setScores] = useState<Record<string, number>>({ "Chủ động & Trách nhiệm": 0, "Chất lượng Output": 0, "Phối hợp Nhóm": 0 });
  const [cmt, setCmt] = useState("");

  const luuLeader = () => {
    if (!currentReviewer) { alert("⚠️ Chọn định danh cá nhân của bạn trước!"); return; }
    if (!leader) { alert("⚠️ Nhóm chưa thiết lập trưởng nhóm!"); return; }
    if (currentReviewer === leader) { alert("⚠️ Trưởng nhóm không thể tự chấm phiếu này!"); return; }
    setLeaderReviews((prev: any) => ({ ...prev, [currentReviewer]: { from: currentReviewer, scores, comment: cmt.trim() } }));
    alert("✅ Lưu phiếu đánh giá năng lực quản lý của Leader thành công!"); setCmt("");
  };

  return (
    <TheCard theme={theme} style={{ maxWidth: 600, margin: "0 auto" }}>
      <h3 style={{ margin: "0 0 16px", color: "#a5b4fc" }}>👑 ĐÁNH GIÁ NĂNG LỰC TRƯỞNG NHÓM</h3>
      {TIEU_CHI_TRUONG_NHOM.map(tc => (
        <div key={tc} style={{ marginBottom: 12, display: "grid", gridTemplateColumns: "1fr 130px", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>{tc}</span>
          <ChonDiem value={scores[tc]} onChange={v => setScores({ ...scores, [tc]: v })} theme={theme} />
        </div>
      ))}
      <div style={{ marginTop: 10 }}><OInput value={cmt} onChange={setCmt} placeholder="Góp ý năng lực điều hành dự án của leader..." theme={theme} /></div>
      <NutBam onClick={luuLeader} theme={theme} style={{ marginTop: 14, width: "100%" }}>Gửi đánh giá</NutBam>
    </TheCard>
  );
}

// ─── PHÂN TÍCH TIẾN ĐỘ ────────────────────────────────────────────────────────
function PhanTich({ members, tasks, theme }: any) {
  const styles = themeStyles[theme];
  const total = tasks.length;
  const done = tasks.filter((t: any) => t.status === "done").length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 16px", color: "#a5b4fc" }}>📊 TIẾN ĐỘ DỰ ÁN TỔNG THỂ</h3>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{total ? Math.round((done/total)*100) : 0}%</div>
        <ThanhTienTrinh value={done} max={total} />
        <div style={{ marginTop: 14, fontSize: 13, color: styles.textMuted }}>Đã hoàn thành {done} trên tổng số {total} hạng mục công việc lớn.</div>
      </TheCard>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 16px", color: "#a5b4fc" }}>📋 THỐNG KÊ PHÂN CHIA WORKLOAD</h3>
        {members.map((m: any) => {
          const count = tasks.filter((t: any) => t.subtasks.some((s: any) => s.assignee === m.id)).length;
          return <div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 14 }}><span>{m.name}</span><b>{count} việc phụ</b></div>;
        })}
      </TheCard>
    </div>
  );
}

// ─── BẢNG KẾT QUẢ TỔNG HỢP ────────────────────────────────────────────────────
function KetQua({ members, tasks, peerReviews, leaderReviews, leader, theme }: any) {
  const styles = themeStyles[theme];

  const bangDiem = useMemo(() => {
    return members.map((m: any) => {
      // 1. Điểm công việc (Task Points) dựa trên độ khó
      const mySubtasks = tasks.flatMap((t: any) => t.subtasks.map((s: any) => ({ ...s, complexity: t.complexity, status: t.status })))
                              .filter((s: any) => s.assignee === m.id);
      const taskPts = mySubtasks.reduce((acc: number, curr: any) => acc + (curr.status === "done" ? curr.complexity : 0), 0);

      // 2. Điểm đánh giá từ đồng đội
      const peerReceipts = Object.values(peerReviews || {}).filter((r: any) => r.to === m.id);
      const peerScores = peerReceipts.flatMap((r: any) => Object.values(r.scores as Record<string, number>));
      const avgPeer = peerScores.length ? tinhTrungBinh(peerScores) : 0;

      // 3. Điểm đánh giá từ nhóm dành cho Leader
      const leaderReceipts = Object.values(leaderReviews || {});
      const leaderScores = leaderReceipts.flatMap((r: any) => Object.values(r.scores as Record<string, number>));
      const avgLeader = leaderScores.length ? tinhTrungBinh(leaderScores) : 0;

      // Công thức tổng hợp điểm đóng góp cuối cùng
      let finalScore = 0;
      if (m.id === leader) {
        finalScore = (taskPts * 1.5) + (avgPeer * 0.4) + (avgLeader * 0.2);
      } else {
        finalScore = (taskPts * 1.5) + (avgPeer * 0.5);
      }
      finalScore = Math.min(finalScore, 10); // Khống chế trần điểm tối đa hệ 10

      return { ...m, taskPts, avgPeer: avgPeer.toFixed(1), avgLeader: avgLeader.toFixed(1), finalScore: finalScore.toFixed(1) };
    });
  }, [members, tasks, peerReviews, leaderReviews, leader]);

  return (
    <TheCard theme={theme}>
      <h3 style={{ margin: "0 0 16px", color: "#a5b4fc" }}>🏆 BẢNG TỔNG HỢP KẾT QUẢ ĐÓNG GÓP</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${styles.border}`, color: styles.textMuted, fontSize: 13 }}>
            <th style={{ textAlign: "left", padding: 10 }}>Thành viên</th>
            <th style={{ padding: 10 }}>Khối lượng hoàn thành</th>
            <th style={{ padding: 10 }}>Đồng đội đánh giá</th>
            {leader && <th style={{ padding: 10 }}>Điểm quản lý (Leader)</th>}
            <th style={{ padding: 10, textAlign: "right" }}>Điểm tổng hợp 🌟</th>
          </tr>
        </thead>
        <tbody>
          {bangDiem.map((b: any) => (
            <tr key={b.id} style={{ borderBottom: `1px solid ${styles.border}`, fontSize: 14 }}>
              <td style={{ padding: 12 }}><b>{b.name}</b> {leader === b.id && "👑"}</td>
              <td style={{ textAlign: "center", padding: 12 }}>{b.taskPts} điểm</td>
              <td style={{ textAlign: "center", padding: 12 }}>{b.avgPeer} / 10</td>
              {leader && <td style={{ textAlign: "center", padding: 12 }}>{leader === b.id ? `${b.avgLeader} / 10` : "—"}</td>}
              <td style={{ textAlign: "right", padding: 12, fontWeight: 800, color: "#fcd34d" }}>{b.finalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TheCard>
  );
}

// ─── ỨNG DỤNG CHÍNH (APP) ──────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme());
  const [activeTab, setActiveTab] = useState("setup");
  const [currentReviewer, setCurrentReviewer] = useState("");
  
  // Realtime States đồng bộ
  const [projectName, setProjectName] = useState("Dự án Môn học");
  const [leader, setLeader] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<any[]>([]);
  const [scheduleSelections, setScheduleSelections] = useState<Record<string, any>>({});
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [groupComments, setGroupComments] = useState<any[]>([]);
  const [peerReviews, setPeerReviews] = useState<Record<string, any>>({});
  const [leaderReviews, setLeaderReviews] = useState<Record<string, any>>({});

  // Khởi chạy lắng nghe cổng kết nối Firebase Realtime Database
  useEffect(() => {
    const rootRef = ref(database, "teamwork_dashboard_v1");
    onValue(rootRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.projectName) setProjectName(data.projectName);
        if (data.leader) setLeader(data.leader);
        if (data.members) setMembers(Object.values(data.members));
        if (data.tasks) setTasks(Object.values(data.tasks));
        if (data.scheduleSlots) setScheduleSlots(Object.values(data.scheduleSlots));
        if (data.scheduleSelections) setScheduleSelections(data.scheduleSelections);
        if (data.chatMessages) setChatMessages(Object.values(data.chatMessages));
        if (data.groupComments) setGroupComments(Object.values(data.groupComments));
        if (data.peerReviews) setPeerReviews(data.peerReviews);
        if (data.leaderReviews) setLeaderReviews(data.leaderReviews);
      }
    });
  }, []);

  // Các hàm đồng bộ ngược lên Firebase khi State local thay đổi
  const syncProjectName = (name: string) => { setProjectName(name); set(ref(database, "teamwork_dashboard_v1/projectName"), name); };
  const syncLeader = (id: string) => { setLeader(id); set(ref(database, "teamwork_dashboard_v1/leader"), id); };
  const syncMembers = (updater: any) => {
    const next = typeof updater === "function" ? updater(members) : updater;
    setMembers(next);
    set(ref(database, "teamwork_dashboard_v1/members"), next.reduce((acc: any, m: any) => ({ ...acc, [m.id]: m }), {}));
  };
  const syncTasks = (updater: any) => {
    const next = typeof updater === "function" ? updater(tasks) : updater;
    setTasks(next);
    set(ref(database, "teamwork_dashboard_v1/tasks"), next.reduce((acc: any, t: any) => ({ ...acc, [t.id]: t }), {}));
  };
  const syncScheduleSlots = (updater: any) => {
    const next = typeof updater === "function" ? updater(scheduleSlots) : updater;
    setScheduleSlots(next);
    set(ref(database, "teamwork_dashboard_v1/scheduleSlots"), next.reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {}));
  };
  const syncScheduleSelections = (updater: any) => {
    const next = typeof updater === "function" ? updater(scheduleSelections) : updater;
    setScheduleSelections(next);
    set(ref(database, "teamwork_dashboard_v1/scheduleSelections"), next);
  };
  const syncChatMessages = (updater: any) => {
    const next = typeof updater === "function" ? updater(chatMessages) : updater;
    setChatMessages(next);
    set(ref(database, "teamwork_dashboard_v1/chatMessages"), next.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c }), {}));
  };
  const syncGroupComments = (updater: any) => {
    const next = typeof updater === "function" ? updater(groupComments) : updater;
    setGroupComments(next);
    set(ref(database, "teamwork_dashboard_v1/groupComments"), next.reduce((acc: any, g: any) => ({ ...acc, [g.id]: g }), {}));
  };
  const syncPeerReviews = (updater: any) => {
    const next = typeof updater === "function" ? updater(peerReviews) : updater;
    setPeerReviews(next);
    set(ref(database, "teamwork_dashboard_v1/peerReviews"), next);
  };
  const syncLeaderReviews = (updater: any) => {
    const next = typeof updater === "function" ? updater(leaderReviews) : updater;
    setLeaderReviews(next);
    set(ref(database, "teamwork_dashboard_v1/leaderReviews"), next);
  };

  useEffect(() => { localStorage.setItem("theme", theme); }, [theme]);
  const styles = themeStyles[theme];

  return (
    <div style={{ background: styles.bg, color: styles.text, minHeight: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", transition: "all .15s ease" }}>
      <header style={{ background: styles.headerBg, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${styles.border}` }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>🏆 DASHBOARD QUẢN LÝ ĐÓNG GÓP NHÓM</h1>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Môn học / Dự án: {projectName}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Chon value={currentReviewer} onChange={setCurrentReviewer} theme={theme} style={{ width: 190 }}>
            <option value="">👤 Xác nhận tên bạn...</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Chon>
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>{theme === "dark" ? "☀️" : "🌙"}</button>
        </div>
      </header>

      <nav style={{ display: "flex", gap: 6, padding: "12px 24px", overflowX: "auto", borderBottom: `1px solid ${styles.border}` }}>
        {CAC_TAB.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: activeTab === t.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: activeTab === t.id ? "#fff" : styles.text, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        {activeTab === "setup" && <ThietLap members={members} setMembers={syncMembers} projectName={projectName} setProjectName={syncProjectName} leader={leader} setLeader={syncLeader} theme={theme} />}
        {activeTab === "tasks" && <CongViec members={members} tasks={tasks} setTasks={syncTasks} theme={theme} leader={leader} currentReviewer={currentReviewer} />}
        {activeTab === "discussion" && <ThaoLuan members={members} groupComments={groupComments} setGroupComments={syncGroupComments} theme={theme} currentReviewer={currentReviewer} />}
        {activeTab === "peer" && <DanhGiaNhanXet members={members} peerReviews={peerReviews} setPeerReviews={syncPeerReviews} theme={theme} currentReviewer={currentReviewer} />}
        {activeTab === "leader" && <DanhGiaTruongNhom members={members} leaderReviews={leaderReviews} setLeaderReviews={syncLeaderReviews} leader={leader} theme={theme} currentReviewer={currentReviewer} />}
        {activeTab === "schedule" && <HopNhom members={members} scheduleSlots={scheduleSlots} setScheduleSlots={syncScheduleSlots} scheduleSelections={scheduleSelections} setScheduleSelections={syncScheduleSelections} theme={theme} currentReviewer={currentReviewer} />}
        {activeTab === "analysis" && <PhanTich members={members} tasks={tasks} theme={theme} />}
        {activeTab === "result" && <KetQua members={members} tasks={tasks} peerReviews={peerReviews} leaderReviews={leaderReviews} leader={leader} theme={theme} />}
      </main>

      <HelpDialog theme={theme} />
      <ChatBox chatMessages={chatMessages} setChatMessages={syncChatMessages} members={members} theme={theme} currentReviewer={currentReviewer} />
    </div>
  );
}
