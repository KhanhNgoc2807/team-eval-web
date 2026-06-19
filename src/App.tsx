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
  const styles = themeStyles[theme];
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const layTen = (id: string) => {
    const m = members.find((m: any) => m.id === id);
    return m ? m.name : "Không xác định";
  };

  const themKhungGio = () => {
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

  const xoaKhungGio = (slotId: string) => {
    setScheduleSlots((prev: any[]) => prev.filter(s => s.id !== slotId));
    const newSelections = { ...scheduleSelections };
    Object.keys(newSelections).forEach(memberId => {
      if (newSelections[memberId][slotId]) {
        delete newSelections[memberId][slotId];
      }
    });
    setScheduleSelections(newSelections);
  };

  const chon = (slotId: string) => {
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    setScheduleSelections((prev: any) => ({
      ...prev,
      [currentReviewer]: {
        ...(prev[currentReviewer] || {}),
        [slotId]: !(prev[currentReviewer]?.[slotId] || false)
      }
    }));
  };

  const tongSo = useMemo(() => {
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

  const totNhat = useMemo(() => {
    if (scheduleSlots.length === 0) return null;
    let best = scheduleSlots[0];
    let bestCount = 0;
    scheduleSlots.forEach((slot: any) => {
      if (tongSo[slot.id] > bestCount) {
        bestCount = tongSo[slot.id];
        best = slot;
      }
    });
    return { slot: best, count: bestCount, total: members.length };
  }, [scheduleSlots, tongSo, members]);

  const copyKetQua = () => {
    if (!totNhat) return;
    const text = `📅 KẾT QUẢ KHẢO SÁT LỊCH HỌP NHÓM\n\nKhung giờ được chọn nhiều nhất: ${totNhat.slot.label}\n${totNhat.count}/${totNhat.total} người rảnh\n\nChi tiết:\n${scheduleSlots.map((slot: any) => {
      const available = members.filter((m: any) => scheduleSelections[m.id]?.[slot.id]).map((m: any) => m.name).join(", ");
      return `${slot.label}: ${tongSo[slot.id]} người${available ? ` (${available})` : ""}`;
    }).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const tenHienTai = currentReviewer ? layTen(currentReviewer) : "Chưa chọn";

  return (
    <div>
      <TheCard theme={theme} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#a5b4fc" }}>📅 KHẢO SÁT LỊCH RẢNH</h3>
          <NutBam onClick={() => setShowCreateForm(!showCreateForm)} variant="ghost" theme={theme}>
            {showCreateForm ? "✖ Đóng" : "+ Thêm khung giờ"}
          </NutBam>
        </div>
        
        <div style={{ marginBottom: 16, padding: "10px 14px", background: styles.inputBg, borderRadius: 8 }}>
          <span style={{ fontSize: 13, color: styles.textMuted }}>👤 Bạn đang chọn với vai trò: </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: currentReviewer ? "#22c55e" : "#f59e0b" }}>
            {currentReviewer ? tenHienTai : "⚠️ Chưa chọn tên trên thanh tiêu đề"}
          </span>
          {!currentReviewer && (
            <NutBam onClick={() => alert("Vui lòng chọn tên của bạn trên thanh tiêu đề (góc phải) để tham gia khảo sát!")} variant="danger" theme={theme} style={{ padding: "2px 10px", fontSize: 11, marginLeft: 8 }}>
              Chọn tên
            </NutBam>
          )}
        </div>
        
        {showCreateForm && (
          <div style={{ background: styles.inputBg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div className="schedule-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div><label style={nhan}>Ngày</label><OInput type="date" value={newSlotDate} onChange={setNewSlotDate} theme={theme} /></div>
              <div><label style={nhan}>Từ giờ</label><OInput type="time" value={newSlotStart} onChange={setNewSlotStart} theme={theme} /></div>
              <div><label style={nhan}>Đến giờ</label><OInput type="time" value={newSlotEnd} onChange={setNewSlotEnd} theme={theme} /></div>
              <div><NutBam onClick={themKhungGio} theme={theme}>Thêm</NutBam></div>
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
            {currentReviewer && (
              <div className="schedule-table-wrapper" style={{ overflowX: "auto", marginBottom: 24 }}>
                <table className="schedule-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${styles.border}` }}>
                      <th style={{ textAlign: "left", padding: 12 }}>Khung giờ</th>
                      <th style={{ textAlign: "center", padding: 12 }}>Lựa chọn của bạn</th>
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
                            onClick={() => chon(slot.id)}
                            style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: scheduleSelections[currentReviewer]?.[slot.id] ? "#22c55e" : styles.inputBg,
                              border: `1px solid ${scheduleSelections[currentReviewer]?.[slot.id] ? "#22c55e" : styles.border}`,
                              cursor: "pointer",
                              color: scheduleSelections[currentReviewer]?.[slot.id] ? "#fff" : styles.textMuted
                            }}
                          >
                            {scheduleSelections[currentReviewer]?.[slot.id] ? "✓" : "○"}
                          </button>
                        </td>
                        <td style={{ textAlign: "center", padding: 12 }}>
                          <span style={{ fontWeight: 700, color: "#22c55e" }}>{tongSo[slot.id]}</span>/{members.length}
                        </td>
                        <td style={{ textAlign: "center", padding: 12 }}>
                          <button onClick={() => xoaKhungGio(slot.id)} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18 }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!currentReviewer && (
              <div style={{ textAlign: "center", padding: 30, color: styles.textMuted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
                <div>Vui lòng chọn tên trên thanh tiêu đề để tham gia khảo sát</div>
              </div>
            )}

            {totNhat && totNhat.count > 0 && (
              <div style={{ background: "#1e1b4b", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#a5b4fc", marginBottom: 4 }}>🏆 KHUNG GIỜ ĐƯỢC CHỌN NHIỀU NHẤT</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#fcd34d" }}>{totNhat.slot.label}</div>
                    <div style={{ fontSize: 13, color: "#818cf8" }}>{totNhat.count}/{totNhat.total} người rảnh</div>
                  </div>
                  <NutBam onClick={copyKetQua} variant="primary" theme={theme}>
                    {copySuccess ? "✓ Đã copy!" : "📋 Copy kết quả"}
                  </NutBam>
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
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") add(); };
  return (
    <div className="two-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc", fontFamily: "'Space Mono',monospace" }}>⚙️ THIẾT LẬP</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={nhan}>Tên dự án / môn học</label><OInput value={projectName} onChange={setProjectName} placeholder="VD: Dự án Marketing - Học kỳ 2" theme={theme} /></div>
          <div><label style={nhan}>Trưởng nhóm</label><Chon value={leader} onChange={setLeader} theme={theme}><option value="">Chọn trưởng nhóm...</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</Chon></div>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: styles.inputBg, borderRadius: 12, fontSize: 13, color: styles.textMuted, lineHeight: 1.8 }}>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 CÔNG THỨC TÍNH ĐIỂM</div>
          <div>Thành viên = <b style={{ color: "#6366f1" }}>Công việc × 40%</b> + <b style={{ color: "#22c55e" }}>Đánh giá đồng đội × 30%</b> + <b style={{ color: "#f59e0b" }}>Đánh giá đóng góp task × 20%</b> + <b style={{ color: "#ef4444" }}>Đánh giá trưởng nhóm × 10%</b></div>
          <div>Trưởng nhóm = <b style={{ color: "#6366f1" }}>Công việc × 40%</b> + <b style={{ color: "#22c55e" }}>Đánh giá đồng đội × 30%</b> + <b style={{ color: "#f59e0b" }}>Đánh giá đóng góp task × 30%</b></div>
        </div>
      </TheCard>
      <TheCard theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc", fontFamily: "'Space Mono',monospace" }}>👥 DANH SÁCH THÀNH VIÊN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
          <OInput value={name} onChange={setName} placeholder="Họ và tên" onKeyDown={handleKeyDown} theme={theme} />
          <OInput value={mssv} onChange={setMssv} placeholder="Mã số sinh viên" onKeyDown={handleKeyDown} theme={theme} />
          <NutBam onClick={add} theme={theme}>Thêm</NutBam>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {members.length === 0 && <div style={{ textAlign: "center", padding: 40, color: styles.textMuted, fontSize: 14 }}>Chưa có thành viên nào</div>}
          {members.map((m: any, i: number) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: styles.inputBg, borderRadius: 10, padding: "10px 14px", flexWrap: "wrap" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: MAU_THANH_VIEN[i % MAU_THANH_VIEN.length] + "22", border: `2px solid ${MAU_THANH_VIEN[i % MAU_THANH_VIEN.length]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: MAU_THANH_VIEN[i % MAU_THANH_VIEN.length], flexShrink: 0 }}>
                {m.name.split(" ").pop().charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: styles.text }}>{m.name}</div>
                {m.mssv && <div style={{ fontSize: 11, color: styles.textMuted }}>MSSV: {m.mssv}</div>}
              </div>
              {leader === m.id && <The color="#f59e0b">Trưởng nhóm</The>}
              <button onClick={() => setMembers((ms: any[]) => ms.filter((x: any) => x.id !== m.id))} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>
      </TheCard>
    </div>
  );
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
            const allAssigned = t.subtasks?.every((s: any) => s.assignee !== null);
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
                  {t.subtasks?.map((s: any) => {
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
                        )}
                        {canAssign && leaderRoleAssign[`${t.id}-${s.id}`] && (
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
                      </div>
                    );
                  })}
                  
                  {pendingSubtasks.length > 0 && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>
                      ⏰ Còn {pendingSubtasks.length} đầu việc chưa có ai nhận. Sau 24h, leader sẽ chỉ định cứng.
                    </div>
                  )}
                  {pendingSubtasks.length === 0 && t.status !== "done" && (
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

// ─── THẢO LUẬN ──────────────────────────────────────────────────────────────────
function ThaoLuan({ members, tasks, taskDiscussions, setTaskDiscussions, taskComments, setTaskComments, theme, currentReviewer }: any) {
  const styles = themeStyles[theme];
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageLink, setMessageLink] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentTarget, setCommentTarget] = useState("");
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  
  const validTasks = tasks.filter((t: any) => {
    const assignedMembers = t.subtasks?.filter((s: any) => s.assignee !== null).map((s: any) => s.assignee) || [];
    const uniqueMembers = [...new Set(assignedMembers)];
    return uniqueMembers.length >= 2;
  });

  const layTen = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    return member ? member.name : "Không xác định";
  };

  // ─── THẢO LUẬN (HIỂN THỊ TÊN) ───
  const guiTinNhan = (taskId: string) => {
    if (!message.trim() && !messageLink.trim()) {
      alert("Vui lòng nhập nội dung hoặc link!");
      return;
    }
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    const content = message.trim() + (messageLink.trim() ? `\n🔗 ${messageLink.trim()}` : "");
    setTaskDiscussions((prev: any) => ({
      ...prev,
      [taskId]: [
        ...(prev[taskId] || []),
        {
          id: uid(),
          authorId: currentReviewer,
          authorName: layTen(currentReviewer), // HIỂN THỊ TÊN
          content: content,
          link: messageLink.trim() || null,
          timestamp: new Date().toISOString()
        }
      ]
    }));
    setMessage("");
    setMessageLink("");
  };

  // ─── GÓP Ý SẢN PHẨM (ẨN DANH) ───
  const guiGopY = (taskId: string) => {
    if (!commentText.trim()) return;
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    if (!commentTarget) {
      alert("Vui lòng chọn người nhận góp ý!");
      return;
    }
    
    const isShort = commentText.trim().split(/\s+/).length < 10;
    
    setTaskComments((prev: any) => ({
      ...prev,
      [taskId]: [
        ...(prev[taskId] || []),
        {
          id: uid(),
          authorId: currentReviewer, // Lưu ID nhưng KHÔNG HIỂN THỊ
          targetMemberId: commentTarget,
          content: commentText.trim(),
          timestamp: new Date().toISOString(),
          usefulness: null,
          usefulnessReason: null,
          isReported: false,
          isHidden: false,
          isShort: isShort,
          replies: []
        }
      ]
    }));
    setCommentText("");
    setCommentTarget("");
  };

  const danhGiaHuuIch = (taskId: string, commentId: string, useful: boolean, reason?: string) => {
    if (useful === false && !reason) {
      alert("Vui lòng cho biết lý do vì sao góp ý này không hữu ích!");
      return;
    }
    setTaskComments((prev: any) => {
      const comments = prev[taskId] || [];
      const updated = comments.map((c: any) => 
        c.id === commentId 
          ? { 
              ...c, 
              usefulness: useful ? "useful" : "not_useful",
              usefulnessReason: useful ? null : (reason || null)
            } 
          : c
      );
      return { ...prev, [taskId]: updated };
    });
  };

  const phanHoiGopY = (taskId: string, commentId: string, replyTextContent: string) => {
    if (!replyTextContent?.trim()) return;
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    setTaskComments((prev: any) => {
      const comments = prev[taskId] || [];
      const updated = comments.map((c: any) => 
        c.id === commentId 
          ? { 
              ...c, 
              replies: [
                ...(c.replies || []),
                {
                  id: uid(),
                  authorId: currentReviewer,
                  content: replyTextContent.trim(),
                  timestamp: new Date().toISOString()
                }
              ]
            } 
          : c
      );
      return { ...prev, [taskId]: updated };
    });
    setReplyText({ ...replyText, [commentId]: "" });
  };

  const getTaskComments = (taskId: string) => {
    return taskComments[taskId] || [];
  };

  const getDiscussions = (taskId: string) => {
    return taskDiscussions[taskId] || [];
  };

  if (validTasks.length === 0) {
    return (
      <TheCard theme={theme} style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
        <h3 style={{ color: "#a5b4fc", marginBottom: 12 }}>Chưa có thảo luận nào</h3>
        <p style={{ color: styles.textMuted }}>
          Thảo luận sẽ hiển thị khi có công việc với ít nhất 2 thành viên tham gia.
        </p>
      </TheCard>
    );
  }

  return (
    <div>
      <TheCard theme={theme} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: styles.textMuted, fontWeight: 600 }}>📌 Chọn công việc:</div>
          <Chon 
            value={selectedTask || ""} 
            onChange={setSelectedTask} 
            theme={theme}
            style={{ minWidth: 250 }}
          >
            <option value="">Chọn công việc...</option>
            {validTasks.map((t: any) => {
              const assignedMembers = t.subtasks?.filter((s: any) => s.assignee !== null).map((s: any) => s.assignee) || [];
              const uniqueMembers = [...new Set(assignedMembers)];
              return (
                <option key={t.id} value={t.id}>
                  {t.name} ({uniqueMembers.length} thành viên)
                </option>
              );
            })}
          </Chon>
        </div>
      </TheCard>

      {selectedTask && (() => {
        const task = tasks.find((t: any) => t.id === selectedTask);
        if (!task) return null;
        const discussions = getDiscussions(selectedTask);
        const comments = getTaskComments(selectedTask);
        const assignedMembers = task.subtasks?.filter((s: any) => s.assignee !== null).map((s: any) => s.assignee) || [];
        const uniqueMembers = [...new Set(assignedMembers)];

        return (
          <>
            <TheCard theme={theme} style={{ marginBottom: 20, borderColor: "#6366f144" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: styles.text }}>{task.name}</div>
                  <div style={{ fontSize: 13, color: styles.textMuted }}>
                    👥 {uniqueMembers.map((id: string) => layTen(id)).join(", ")}
                  </div>
                </div>
                <The color="#6366f1">Cấp {task.complexity}</The>
              </div>
            </TheCard>

            {/* ─── THẢO LUẬN (HIỂN THỊ TÊN) ─── */}
            <TheCard theme={theme} style={{ marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 15, color: "#a5b4fc" }}>💬 Thảo luận</h4>
              
              <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
                {discussions.length === 0 ? (
                  <div style={{ textAlign: "center", color: styles.textMuted, padding: 20, fontSize: 13 }}>
                    Chưa có tin nhắn nào
                  </div>
                ) : (
                  discussions.map((msg: any) => (
                    <div key={msg.id} style={{ marginBottom: 12, padding: "10px 12px", background: styles.inputBg, borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "#6366f1" }}>
                          {msg.authorName} {/* HIỂN THỊ TÊN */}
                        </span>
                        <span style={{ fontSize: 11, color: styles.textMuted }}>
                          {new Date(msg.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: styles.text, whiteSpace: "pre-wrap" }}>
                        {msg.content}
                      </div>
                      {msg.link && (
                        <a 
                          href={msg.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: "#6366f1", fontSize: 13, textDecoration: "none", wordBreak: "break-all", display: "block", marginTop: 4 }}
                        >
                          🔗 {msg.link}
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <OInput
                  value={message}
                  onChange={setMessage}
                  placeholder="Nhập tin nhắn..."
                  theme={theme}
                />
                <OInput
                  value={messageLink}
                  onChange={setMessageLink}
                  placeholder="🔗 Thêm link (tùy chọn)..."
                  theme={theme}
                />
                <NutBam 
                  onClick={() => guiTinNhan(selectedTask)} 
                  theme={theme}
                  style={{ alignSelf: "flex-end" }}
                >
                  Gửi tin nhắn
                </NutBam>
              </div>
            </TheCard>

            {/* ─── GÓP Ý SẢN PHẨM (ẨN DANH) ─── */}
            <TheCard theme={theme}>
              <h4 style={{ margin: "0 0 16px", fontSize: 15, color: "#a5b4fc" }}>💬 Góp ý sản phẩm (ẩn danh)</h4>
              
              <div style={{ maxHeight: 300, overflowY: "auto", marginBottom: 16 }}>
                {comments.filter((c: any) => !c.isHidden).length === 0 ? (
                  <div style={{ textAlign: "center", color: styles.textMuted, padding: 20, fontSize: 13 }}>
                    Chưa có góp ý nào
                  </div>
                ) : (
                  comments.filter((c: any) => !c.isHidden).map((comment: any) => (
                    <div key={comment.id} style={{ marginBottom: 12, padding: "10px 12px", background: styles.inputBg, borderRadius: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 11, color: styles.textMuted, fontStyle: "italic" }}>
                            Góp ý cho {layTen(comment.targetMemberId)} (ẩn danh) {/* KHÔNG HIỂN THỊ TÊN NGƯỜI GỬI */}
                          </span>
                          <span style={{ fontSize: 10, color: styles.textMuted, marginLeft: 8 }}>
                            {new Date(comment.timestamp).toLocaleDateString("vi-VN")}
                          </span>
                          {comment.isShort && (
                            <The color="#f59e0b" style={{ fontSize: 9, marginLeft: 8 }}>Góp ý ngắn</The>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: 13, color: styles.text, marginBottom: 6 }}>
                        {comment.content}
                      </div>
                      
                      {comment.targetMemberId === currentReviewer && comment.usefulness === null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${styles.border}` }}>
                          <span style={{ fontSize: 11, color: styles.textMuted }}>Góp ý này có hữu ích không?</span>
                          <button 
                            onClick={() => danhGiaHuuIch(selectedTask, comment.id, true)}
                            style={{ padding: "2px 10px", borderRadius: 4, border: "1px solid #22c55e", background: "#22c55e22", color: "#22c55e", cursor: "pointer", fontSize: 11 }}
                          >
                            ✅ Hữu ích
                          </button>
                          <button 
                            onClick={() => {
                              const reason = prompt("Vui lòng cho biết lý do vì sao góp ý này không hữu ích:");
                              if (reason !== null) {
                                danhGiaHuuIch(selectedTask, comment.id, false, reason);
                              }
                            }}
                            style={{ padding: "2px 10px", borderRadius: 4, border: "1px solid #ef4444", background: "#ef444422", color: "#ef4444", cursor: "pointer", fontSize: 11 }}
                          >
                            ❌ Không hữu ích
                          </button>
                        </div>
                      )}
                      
                      {comment.usefulness === "useful" && (
                        <div style={{ color: "#22c55e", fontSize: 11, marginTop: 4 }}>✅ Được đánh giá là hữu ích</div>
                      )}
                      {comment.usefulness === "not_useful" && (
                        <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>
                          ❌ Được đánh giá là không hữu ích
                          {comment.usefulnessReason && (
                            <div style={{ fontSize: 11, color: styles.textMuted, marginTop: 2 }}>
                              Lý do: {comment.usefulnessReason}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {(comment.replies || []).map((reply: any) => (
                        <div key={reply.id} style={{ marginTop: 6, paddingLeft: 16, borderLeft: `2px solid ${styles.border}` }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{ fontWeight: 600, fontSize: 11, color: "#6366f1" }}>
                              Phản hồi (ẩn danh)
                            </span>
                            <span style={{ fontSize: 10, color: styles.textMuted }}>
                              {new Date(reply.timestamp).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: styles.text }}>
                            {reply.content}
                          </div>
                        </div>
                      ))}
                      
                      {currentReviewer && comment.targetMemberId === currentReviewer && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <OInput
                            value={replyText[comment.id] || ""}
                            onChange={(v: string) => setReplyText({ ...replyText, [comment.id]: v })}
                            placeholder="Phản hồi góp ý (ẩn danh)..."
                            theme={theme}
                            style={{ flex: 1, fontSize: 12, padding: "4px 10px" }}
                            onKeyDown={(e: any) => {
                              if (e.key === "Enter" && replyText[comment.id]?.trim()) {
                                phanHoiGopY(selectedTask, comment.id, replyText[comment.id]);
                              }
                            }}
                          />
                          <NutBam 
                            onClick={() => {
                              if (replyText[comment.id]?.trim()) {
                                phanHoiGopY(selectedTask, comment.id, replyText[comment.id]);
                              }
                            }} 
                            theme={theme} 
                            style={{ padding: "4px 12px", fontSize: 11 }}
                          >
                            Gửi
                          </NutBam>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Chon 
                  value={commentTarget} 
                  onChange={setCommentTarget} 
                  theme={theme}
                  style={{ width: "100%" }}
                >
                  <option value="">Chọn người nhận góp ý...</option>
                  {uniqueMembers
                    .filter((id: string) => id !== currentReviewer)
                    .map((id: string) => (
                      <option key={id} value={id}>{layTen(id)}</option>
                    ))}
                </Chon>
                <OInput
                  value={commentText}
                  onChange={setCommentText}
                  placeholder="Nhập góp ý (nên viết 1 điểm tốt + 1 điểm cần cải thiện)..."
                  theme={theme}
                />
                {commentText.trim().split(/\s+/).length > 0 && commentText.trim().split(/\s+/).length < 10 && (
                  <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
                    ⚠️ Góp ý quá ngắn (dưới 10 từ), sẽ không được cộng điểm thưởng
                  </div>
                )}
                {commentText.trim().split(/\s+/).length >= 10 && (
                  <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>
                    ✅ Góp ý có giá trị, sẽ được cộng điểm nếu người nhận đánh giá "Hữu ích"
                  </div>
                )}
                <NutBam 
                  onClick={() => guiGopY(selectedTask)} 
                  theme={theme}
                  style={{ alignSelf: "flex-end" }}
                  disabled={!commentTarget || !commentText.trim()}
                >
                  Gửi góp ý (ẩn danh)
                </NutBam>
              </div>
            </TheCard>
          </>
        );
      })()}
    </div>
  );
}

// ─── ĐÁNH GIÁ & NHẬN XÉT ────────────────────────────────────────────────────────
function DanhGiaNhanXet({ members, tasks, peerScores, setPeerScores, peerComments, setPeerComments, taskContributionScores, setTaskContributionScores, theme, currentReviewer }: any) {
  const [tempScores, setTempScores] = useState<Record<string, Record<string, number>>>({});
  const [tempComments, setTempComments] = useState<Record<string, string>>({});
  const styles = themeStyles[theme];

  const reviewees = members.filter((m: any) => m.id !== currentReviewer);
  const hasCompleted = currentReviewer ? (peerScores[currentReviewer]?.completed === true) : false;

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

  const layTen = (memberId: string) => {
    const member = members.find((m: any) => m.id === memberId);
    return member ? member.name : "Không xác định";
  };

  const guiDanhGiaDongGop = (taskId: string, revieweeId: string, score: number, comment: string) => {
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    if (score === 0) {
      alert("Vui lòng chọn điểm đánh giá!");
      return;
    }
    setTaskContributionScores((prev: any) => {
      const reviewerScores = prev[currentReviewer] || {};
      const revieweeScores = reviewerScores[revieweeId] || {};
      return {
        ...prev,
        [currentReviewer]: {
          ...reviewerScores,
          [revieweeId]: {
            ...revieweeScores,
            [taskId]: {
              score,
              comment: comment.trim() || "",
              usefulness: null,
              reply: null
            }
          }
        }
      };
    });
    alert("✅ Đã lưu đánh giá đóng góp task!");
  };

  const getContributionScore = (reviewerId: string, revieweeId: string, taskId: string) => {
    return taskContributionScores[reviewerId]?.[revieweeId]?.[taskId];
  };

  const reviewerTasks = tasks.filter((t: any) => 
    t.subtasks?.some((s: any) => s.assignee === currentReviewer)
  );

  const getTaskMembers = (taskId: string) => {
    const task = tasks.find((t: any) => t.id === taskId);
    if (!task) return [];
    const assignees = task.subtasks?.filter((s: any) => s.assignee !== null).map((s: any) => s.assignee) || [];
    return [...new Set(assignees)].filter((id: string) => id !== currentReviewer);
  };

  const submitAllReviews = () => {
    if (!currentReviewer) {
      alert("Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    
    let allDone = true;
    reviewees.forEach(reviewee => {
      TIEU_CHI_DANH_GIA.forEach(c => {
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
        TIEU_CHI_DANH_GIA.forEach(criterion => {
          const score = getTempScore(reviewee.id, criterion);
          if (score > 0) {
            if (!next[currentReviewer]) next[currentReviewer] = {};
            if (!next[currentReviewer][reviewee.id]) next[currentReviewer][reviewee.id] = {};
            if (!next[currentReviewer][reviewee.id][criterion]) next[currentReviewer][reviewee.id][criterion] = [];
            next[currentReviewer][reviewee.id][criterion].push(score);
          }
        });
      });
      
      next[currentReviewer] = { ...next[currentReviewer], completed: true };
      
      return next;
    });

    setPeerComments((prev: any) => {
      const next = { ...prev };
      
      reviewees.forEach(reviewee => {
        const comment = getTempComment(reviewee.id);
        if (comment.trim()) {
          if (!next[currentReviewer]) next[currentReviewer] = {};
          if (!next[currentReviewer][reviewee.id]) next[currentReviewer][reviewee.id] = {};
          next[currentReviewer][reviewee.id].comment = comment.trim();
        }
      });
      
      return next;
    });

    setTempScores({});
    setTempComments({});
    alert("✅ Đã lưu đánh giá và nhận xét ẩn danh!");
  };

  const completedReviewers = Object.keys(peerScores).filter(
    (key) => key !== "completed" && peerScores[key]?.completed === true
  ).length;

  if (members.length < 2) {
    return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👥</div><div>Cần ít nhất 2 thành viên</div></div>;
  }

  const currentName = members.find((m: any) => m.id === currentReviewer)?.name || "Chưa chọn";

  return (
    <div>
      <TheCard theme={theme} style={{ marginBottom: 20, background: "#1e1b4b", borderColor: "#22c55e" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>🔒 ĐÁNH GIÁ & NHẬN XÉT ẨN DANH</div>
            <div style={{ fontSize: 12, color: styles.textMuted }}>Sau khi đánh giá, không ai biết ai đã đánh giá và nhận xét.</div>
          </div>
        </div>
      </TheCard>

      <TheCard style={{ marginBottom: 20 }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, color: styles.textMuted, fontWeight: 600 }}>👤 Bạn đang đánh giá với vai trò:</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: currentReviewer ? "#22c55e" : "#f59e0b" }}>
            {currentReviewer ? currentName : "⚠️ Chưa chọn tên trên thanh tiêu đề"}
          </div>
          {!currentReviewer && (
            <NutBam onClick={() => alert("Vui lòng chọn tên của bạn trên thanh tiêu đề (góc phải) để bắt đầu đánh giá!")} variant="danger" theme={theme} style={{ padding: "4px 12px", fontSize: 12 }}>
              Chọn tên
            </NutBam>
          )}
          <div style={{ fontSize: 13, color: styles.textMuted, marginLeft: "auto" }}>
            📊 Đã có <b style={{ color: "#22c55e" }}>{completedReviewers}</b>/{members.length} người tham gia
          </div>
        </div>
      </TheCard>

      {currentReviewer && !hasCompleted && (
        <>
          <TheCard theme={theme} style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 16px", fontSize: 15, color: "#a5b4fc" }}>1. Đánh giá đồng đội (ẩn danh)</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {reviewees.map((reviewee: any) => {
                const mc = MAU_THANH_VIEN[members.indexOf(reviewee) % MAU_THANH_VIEN.length];
                const isFilled = TIEU_CHI_DANH_GIA.every(c => getTempScore(reviewee.id, c) > 0);
                return (
                  <div key={reviewee.id} style={{ border: `1px solid ${isFilled ? "#22c55e44" : styles.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: mc }}>
                        {reviewee.name.split(" ").pop().charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: styles.text }}>{reviewee.name}</div>
                        {isFilled && <div style={{ fontSize: 11, color: "#22c55e" }}>✓ Đã đánh giá</div>}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
                      {TIEU_CHI_DANH_GIA.map(c => (
                        <div key={c}>
                          <div style={{ fontSize: 11, color: styles.textMuted, marginBottom: 4 }}>{c}</div>
                          <ChonDiem value={getTempScore(reviewee.id, c)} onChange={v => setScore(reviewee.id, c, v)} theme={theme} />
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <label style={{ fontSize: 11, color: styles.textMuted, display: "block", marginBottom: 4 }}>📝 Nhận xét (ẩn danh)</label>
                      <OInput
                        value={getTempComment(reviewee.id)}
                        onChange={v => setComment(reviewee.id, v)}
                        placeholder="Nhập nhận xét của bạn về thành viên này..."
                        theme={theme}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </TheCard>

          {reviewerTasks.length > 0 && (
            <TheCard theme={theme} style={{ marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 15, color: "#a5b4fc" }}>2. Đánh giá đóng góp task (ẩn danh)</h4>
              {reviewerTasks.map((task: any) => {
                const taskMembers = getTaskMembers(task.id);
                if (taskMembers.length === 0) return null;
                return (
                  <div key={task.id} style={{ marginBottom: 16, padding: 12, background: styles.inputBg, borderRadius: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc", marginBottom: 8 }}>
                      📌 {task.name}
                    </div>
                    {taskMembers.map((memberId: string) => {
                      const existingScore = getContributionScore(currentReviewer, memberId, task.id);
                      return (
                        <div key={memberId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 80, color: styles.text }}>
                            {layTen(memberId)}
                          </span>
                          <ChonDiem 
                            value={existingScore?.score || 0}
                            onChange={(v: number) => {
                              guiDanhGiaDongGop(task.id, memberId, v, existingScore?.comment || "");
                            }}
                            theme={theme}
                            style={{ width: 100 }}
                          />
                          <OInput
                            value={existingScore?.comment || ""}
                            onChange={(v: string) => {
                              if (existingScore?.score > 0) {
                                guiDanhGiaDongGop(task.id, memberId, existingScore.score, v);
                              }
                            }}
                            placeholder="Nhận xét (tùy chọn)"
                            theme={theme}
                            style={{ flex: 1, minWidth: 120 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </TheCard>
          )}

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <NutBam onClick={submitAllReviews} variant="success" theme={theme} disabled={!reviewees.every(r => TIEU_CHI_DANH_GIA.every(c => getTempScore(r.id, c) > 0))} style={{ padding: "12px 32px", fontSize: 16 }}>
              🔒 Gửi đánh giá & nhận xét (ẩn danh)
            </NutBam>
          </div>
        </>
      )}
      
      {currentReviewer && hasCompleted && (
        <TheCard theme={theme} style={{ textAlign: "center", background: "#0c2a1a", borderColor: "#166534" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#86efac", marginBottom: 8 }}>Bạn đã hoàn thành đánh giá!</div>
          <div style={{ fontSize: 13, color: styles.textMuted }}>Cảm ơn bạn đã tham gia đánh giá.</div>
        </TheCard>
      )}
      
      {!currentReviewer && (
        <TheCard theme={theme} style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: styles.text, marginBottom: 8 }}>Chọn tên để bắt đầu đánh giá</div>
          <div style={{ fontSize: 13, color: styles.textMuted }}>
            Vui lòng chọn tên của bạn trên thanh tiêu đề (góc phải màn hình)
          </div>
        </TheCard>
      )}
    </div>
  );
}

// ─── ĐÁNH GIÁ TRƯỞNG NHÓM ──────────────────────────────────────────────────────
function DanhGiaTruongNhom({ members, leader, leaderScores, setLeaderScores, theme }: any) {
  const leaderMember = members.find((m: any) => m.id === leader);
  const styles = themeStyles[theme];
  const setScore = (memberId: string, criterion: string, val: number) => { setLeaderScores((ls: any) => ({ ...ls, [memberId]: { ...(ls[memberId] || {}), [criterion]: val } })); };
  const getScore = (memberId: string, criterion: string) => leaderScores?.[memberId]?.[criterion] ?? 0;
  if (!leader) return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👑</div><div>Chưa chọn trưởng nhóm. Vào tab <b style={{ color: "#a5b4fc" }}>Thiết lập</b> để chọn.</div></div>;
  const others = members.filter((m: any) => m.id !== leader);
  if (others.length === 0) return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👥</div><div>Nhóm chỉ có trưởng nhóm, chưa có thành viên</div></div>;
  return (
    <div>
      <TheCard style={{ marginBottom: 20, borderColor: "#451a03" }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}><div style={{ fontSize: 28 }}>👑</div><div><div style={{ fontSize: 15, fontWeight: 700, color: "#fcd34d" }}>Trưởng nhóm: {leaderMember?.name}</div><div style={{ fontSize: 13, color: "#92400e" }}>Đánh giá {others.length} thành viên theo 3 tiêu chí</div></div></div>
      </TheCard>
      <div className="leader-grid" style={{ display: "flex", flexDirection: "column", gap: 14 }}>{others.map((m: any) => {
        const mc = MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length];
        const mAvg = tinhTrungBinh(TIEU_CHI_TRUONG_NHOM.map(c => getScore(m.id, c)).filter(s => s > 0));
        return (
          <TheCard key={m.id} style={{ borderColor: styles.border }} theme={theme}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ width: 38, height: 38, borderRadius: 9, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: mc }}>{m.name.split(" ").pop().charAt(0)}</div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: styles.text }}>{m.name}</div>
              {mAvg > 0 && <The color={mAvg >= 8 ? "#22c55e" : mAvg >= 6 ? "#f59e0b" : "#ef4444"}>TB: {mAvg.toFixed(1)}</The>}
            </div>
            <div className="leader-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>{TIEU_CHI_TRUONG_NHOM.map(c => (<div key={c}><div style={{ fontSize: 12, color: styles.textMuted, marginBottom: 8 }}>{c}</div><ChonDiem value={getScore(m.id, c)} onChange={v => setScore(m.id, c, v)} theme={theme} /></div>))}</div>
          </TheCard>
        );
      })}</div>
    </div>
  );
}

// ─── PHÂN TÍCH ──────────────────────────────────────────────────────────────────
function PhanTich({ members, tasks, peerScores, leaderScores, leader, peerComments, taskComments, taskContributionScores, theme }: any) {
  const styles = themeStyles[theme];
  
  const completedReviewers = Object.keys(peerScores).filter(
    (key) => key !== "completed" && peerScores[key]?.completed === true
  ).length;

  if (members.length > 0 && completedReviewers < members.length) {
    return (
      <TheCard theme={theme} style={{ textAlign: "center", padding: 60 }}>
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
      </TheCard>
    );
  }
  
  const getAvgContributionScore = (memberId: string) => {
    const allScores: number[] = [];
    Object.keys(taskContributionScores).forEach(reviewerId => {
      const reviewerData = taskContributionScores[reviewerId];
      if (reviewerData && reviewerData[memberId]) {
        Object.values(reviewerData[memberId]).forEach((scoreData: any) => {
          if (scoreData && scoreData.score) {
            allScores.push(scoreData.score);
          }
        });
      }
    });
    return allScores.length > 0 ? tinhTrungBinh(allScores) * 10 : 0;
  };
  
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
        TIEU_CHI_DANH_GIA.forEach(criterion => {
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
    TIEU_CHI_DANH_GIA.forEach(criterion => {
      const arr = scores[criterion];
      avgScores[criterion] = arr.length > 0 ? tinhTrungBinh(arr) : 0;
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
      TIEU_CHI_DANH_GIA.forEach(c => {
        if (scores[c] > 0) {
          totals[c] += scores[c];
          counts[c]++;
        }
      });
    });
    
    const avgs: Record<string, number> = {};
    TIEU_CHI_DANH_GIA.forEach(c => {
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

  const getProductComments = (memberId: string) => {
    const comments: string[] = [];
    Object.keys(taskComments).forEach(taskId => {
      const taskCommentList = taskComments[taskId] || [];
      taskCommentList.forEach((c: any) => {
        if (c.targetMemberId === memberId && !c.isHidden) {
          comments.push(c.content);
        }
      });
    });
    return comments;
  };
  
  return (
    <div>
      <TheCard theme={theme} style={{ marginBottom: 24 }}>
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
              {TIEU_CHI_DANH_GIA.map(c => {
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
      </TheCard>
      
      <h3 style={{ fontSize: 15, color: "#a5b4fc", marginBottom: 16, fontFamily: "'Space Mono',monospace" }}>
        👤 PHÂN TÍCH TỪNG THÀNH VIÊN
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {members.map((m: any) => {
          const scores = getMemberScores(m.id);
          const contributionScore = getAvgContributionScore(m.id);
          const memberColors = MAU_THANH_VIEN[members.indexOf(m) % MAU_THANH_VIEN.length];
          
          const weaknesses = TIEU_CHI_DANH_GIA.filter(c => scores[c] < 7 && scores[c] > 0);
          const strengths = TIEU_CHI_DANH_GIA.filter(c => scores[c] >= 7 && scores[c] > 0);
          
          const memberTasks = tasks.filter((t: any) => t.subtasks?.some((s: any) => s.assignee === m.id));
          const completedTasks = memberTasks.filter((t: any) => t.status === "done").length;

          const memberComments = getMemberComments(m.id);
          const productComments = getProductComments(m.id);
          
          return (
            <TheCard key={m.id} style={{ borderColor: `${memberColors}44` }} theme={theme}>
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
                {m.id === leader && <The color="#f59e0b">Trưởng nhóm</The>}
                <div style={{ fontSize: 12, color: styles.textMuted, marginLeft: "auto" }}>
                  📋 {completedTasks}/{memberTasks.length} công việc
                  {contributionScore > 0 && ` | 📊 ${contributionScore.toFixed(0)}/10`}
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
                      {scores[TIEU_CHI_DANH_GIA[0]] === 0 ? "Chưa có dữ liệu đánh giá" : "✅ Không có điểm yếu nào đáng kể!"}
                    </div>
                  )}
                </div>
              </div>

              {productComments.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${styles.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>
                    📝 GÓP Ý SẢN PHẨM (ẩn danh)
                  </div>
                  {productComments.map((comment, idx) => (
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

              {memberComments.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${styles.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>
                    💬 NHẬN XÉT ĐỒNG ĐỘI (ẩn danh)
                  </div>
                  {memberComments.map((comment, idx) => (
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
            </TheCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── KẾT QUẢ ────────────────────────────────────────────────────────────────────
function KetQua({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore, theme }: any) {
  const styles = themeStyles[theme];
  
  const completedReviewers = Object.keys(peerScores).filter(
    (key) => key !== "completed" && peerScores[key]?.completed === true
  ).length;

  if (members.length > 0 && completedReviewers < members.length) {
    return (
      <TheCard theme={theme} style={{ textAlign: "center", padding: 60 }}>
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
      </TheCard>
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
        TIEU_CHI_DANH_GIA.forEach(criterion => {
          const scores = scoresForMember[criterion];
          if (scores && Array.isArray(scores)) {
            allScores.push(...scores);
          }
        });
      }
    });
    
    if (allScores.length === 0) return null;
    return tinhTrungBinh(allScores) * 10;
  };

  const results = useMemo(() => {
    if (members.length === 0) return [];
    return members.map((m: any) => {
      const myTasks = tasks.filter((t: any) => t.subtasks?.some((s: any) => s.assignee === m.id));
      let taskScore = 100;
      if (myTasks.length > 0) {
        const totalPossible = myTasks.reduce((s: number, t: any) => s + DO_KHO[t.complexity as keyof typeof DO_KHO].pts * 100, 0);
        const earned = myTasks.reduce((s: number, t: any) => s + DO_KHO[t.complexity as keyof typeof DO_KHO].pts * 100 * TRANG_THAI[t.status as keyof typeof TRANG_THAI].pct, 0);
        taskScore = totalPossible > 0 ? (earned / totalPossible) * 100 : 100;
      }
      
      const peerScore = getPeerScoreForMember(m.id) ?? 0;
      
      const lScores = TIEU_CHI_TRUONG_NHOM.map(c => leaderScores?.[m.id]?.[c] ?? 0).filter((s: number) => s > 0);
      const leaderScore = lScores.length > 0 ? tinhTrungBinh(lScores) * 10 : 0;
      const isLeader = m.id === leader;
      
      let finalScore;
      if (isLeader) {
        finalScore = taskScore * 0.4 + peerScore * 0.3 + 0 * 0.3;
      } else {
        finalScore = taskScore * 0.4 + peerScore * 0.3 + leaderScore * 0.1;
      }
      
      return { ...m, taskScore, peerScore, leaderScore, finalScore, isLeader, myTasks: myTasks.length, doneTasks: myTasks.filter((t: any) => t.status === "done").length };
    });
  }, [members, tasks, peerScores, leaderScores, leader]);

  const totalScore = results.reduce((s: number, r: any) => s + r.finalScore, 0);
  const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);
  const maxFinal = Math.max(...results.map((r: any) => r.finalScore), 1);
  const teamAvg = tinhTrungBinh(results.map((r: any) => r.finalScore));
  const ts = parseFloat(teacherScore);
  const hasTeacherScore = !isNaN(ts) && ts >= 0 && ts <= 10;
  const pctOf = (score: number) => totalScore > 0 ? (score / totalScore) * 100 : (100 / (members.length || 1));
  const personalGrade = (score: number) => hasTeacherScore ? ts * (pctOf(score) / 100) * members.length : null;

  return (
    <div>
      <TheCard style={{ marginBottom: 24, borderColor: "#1e3a5f", background: theme === "dark" ? "linear-gradient(135deg,#0c1929,#13131a)" : "linear-gradient(135deg,#e0e7ff,#c7d2fe)" }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ fontSize: 36 }}>🎓</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800, color: "#93c5fd", marginBottom: 4 }}>Điểm giảng viên cho nhóm</div><div style={{ fontSize: 13, color: styles.textMuted }}>Nhập điểm giảng viên (thang 10) → tự tính điểm cá nhân theo % đóng góp</div></div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="number" min="0" max="10" step="0.1" value={teacherScore} onChange={e => setTeacherScore(e.target.value)} placeholder="VD: 9" style={{ width: 100, background: styles.inputBg, border: `2px solid #1e3a5f`, borderRadius: 12, padding: "12px 16px", color: "#93c5fd", fontSize: 22, fontWeight: 800, textAlign: "center" }} />
            <div style={{ fontSize: 13, color: styles.textMuted }}>/ 10</div>
          </div>
          {hasTeacherScore && <div style={{ background: "#0c2a1a", border: "1px solid #166534", borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "#86efac" }}><div style={{ fontWeight: 700 }}>📐 Công thức:</div><div>Điểm cá nhân = {ts} × (% đóng góp / 100) × {members.length} thành viên</div></div>}
        </div>
      </TheCard>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Điểm trung bình hệ thống", value: teamAvg.toFixed(1), icon: "📊", color: "#6366f1", sub: "thang 100" },
          { label: hasTeacherScore ? "Điểm giảng viên" : "Chờ điểm giảng viên", value: hasTeacherScore ? ts.toFixed(1) : "—", icon: "🎓", color: "#3b82f6", sub: "thang 10" },
          { label: "Điểm cá nhân cao nhất", value: hasTeacherScore && results.length ? Math.max(...results.map((r: any) => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⭐", color: "#22c55e", sub: "thang 10" },
          { label: "Điểm cá nhân thấp nhất", value: hasTeacherScore && results.length ? Math.min(...results.map((r: any) => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⚠️", color: "#f59e0b", sub: "thang 10" },
        ].map(s => (
          <TheCard key={s.label} style={{ textAlign: "center" }} theme={theme}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: "clamp(20px, 5vw, 30px)", fontWeight: 800, fontFamily: "'Space Mono',monospace", color: s.color, margin: "8px 0 2px" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: styles.textMuted, marginBottom: 2 }}>{s.sub}</div>
            <div style={{ fontSize: 12, color: styles.textMuted }}>{s.label}</div>
          </TheCard>
        ))}
      </div>

      <TheCard style={{ padding: 0, overflow: "hidden" }} theme={theme}>
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
            const mc = MAU_THANH_VIEN[memberIndex >= 0 ? memberIndex % MAU_THANH_VIEN.length : 0];
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
                  <ThanhTienTrinh value={r.finalScore} max={maxFinal} color={mc} />
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
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{tinhTrungBinh(results.map((r: any) => r.taskScore)).toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{tinhTrungBinh(results.map((r: any) => r.peerScore)).toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>{tinhTrungBinh(results.filter((r: any) => !r.isLeader).map((r: any) => r.leaderScore)).toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: "#a5b4fc" }}>{teamAvg.toFixed(1)}</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 13, color: "#6366f1" }}>100%</div>
            <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: hasTeacherScore ? "#93c5fd" : styles.textMuted }}>{hasTeacherScore ? ts.toFixed(1) : "—"}</div>
          </div>
        </div>
      </TheCard>
    </div>
  );
}

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
        {tab === "discussion" && <ThaoLuan 
          members={members} 
          tasks={tasks}
          taskDiscussions={taskDiscussions}
          setTaskDiscussions={setTaskDiscussions}
          taskComments={taskComments}
          setTaskComments={setTaskComments}
          theme={theme}
          currentReviewer={currentReviewer}
        />}
        {tab === "peer" && <DanhGiaNhanXet 
          members={members} 
          tasks={tasks}
          peerScores={peerScores} 
          setPeerScores={setPeerScores}
          peerComments={peerComments}
          setPeerComments={setPeerComments}
          taskContributionScores={taskContributionScores}
          setTaskContributionScores={setTaskContributionScores}
          theme={theme}
          currentReviewer={currentReviewer}
        />}
        {tab === "leader" && <DanhGiaTruongNhom members={members} leader={leader} leaderScores={leaderScores} setLeaderScores={setLeaderScores} theme={theme} />}
        {tab === "schedule" && <HopNhom 
          members={members} 
          scheduleSlots={scheduleSlots} 
          setScheduleSlots={setScheduleSlots} 
          scheduleSelections={scheduleSelections} 
          setScheduleSelections={setScheduleSelections} 
          theme={theme}
          currentReviewer={currentReviewer}
        />}
        {tab === "analysis" && <PhanTich 
          members={members} 
          tasks={tasks} 
          peerScores={peerScores}
          leaderScores={leaderScores}
          leader={leader}
          peerComments={peerComments}
          taskComments={taskComments}
          taskContributionScores={taskContributionScores}
          theme={theme}
        />}
        {tab === "result" && <KetQua members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} teacherScore={teacherScore} setTeacherScore={setTeacherScore} theme={theme} />}
      </div>
      <ChatBox chatMessages={chatMessages} setChatMessages={setChatMessages} members={members} theme={theme} currentReviewer={currentReviewer} />
    </div>
  );
}
