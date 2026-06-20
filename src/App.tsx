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

// ─── COMPONENT HƯỚNG DẪN ──────────────────────────────────────────────────────
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
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18, 
          height: 18, 
          borderRadius: "50%", 
          background: "#6366f144",
          color: "#a5b4fc",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          border: "1px solid #6366f144",
          userSelect: "none"
        }}
      >
        ?
      </span>
      {show && (
        <div style={{
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "#1e1b4b",
          border: "1px solid #312e81",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 12,
          color: "#e2e8f0",
          minWidth: 220,
          maxWidth: 300,
          zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          textAlign: "left",
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 600, color: "#a5b4fc", marginBottom: 6 }}>{title}</div>
          {lines.map((line, i) => (
            <div key={i} style={{ marginBottom: i < lines.length - 1 ? 4 : 0 }}>
              {line}
            </div>
          ))}
          <div style={{
            position: "absolute",
            bottom: -6,
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 12,
            height: 12,
            background: "#1e1b4b",
            borderRight: "1px solid #312e81",
            borderBottom: "1px solid #312e81"
          }} />
        </div>
      )}
    </span>
  );
}

function HelpDialog({ theme }: { theme: Theme }) {
  const [isOpen, setIsOpen] = useState(false);
  const styles = themeStyles[theme];
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          bottom: 80,
          right: 20,
          width: 44,
          height: 44,
          borderRadius: 22,
          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
          border: "none",
          color: "white",
          fontSize: 20,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        ❓
      </button>

      {isOpen && (
        <div 
          ref={dialogRef}
          style={{
            position: "fixed",
            bottom: 132,
            right: 20,
            width: 380,
            maxHeight: 500,
            background: styles.cardBg,
            border: `1px solid ${styles.border}`,
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{
            padding: "12px 16px",
            background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>❓ Hướng dẫn sử dụng</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{ 
                background: "none", 
                border: "none", 
                color: "white", 
                fontSize: 20, 
                cursor: "pointer",
                padding: "0 4px"
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            flex: 1,
            padding: "16px 20px",
            overflowY: "auto",
            fontSize: 13,
            lineHeight: 1.8,
            color: styles.text
          }}>
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: "#a5b4fc", margin: "0 0 8px 0" }}>🚀 Bắt đầu</h4>
              <p style={{ margin: "2px 0" }}>1. Chọn tên của bạn trên thanh tiêu đề (👤)</p>
              <p style={{ margin: "2px 0" }}>2. Tham gia các hoạt động nhóm</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: "#a5b4fc", margin: "0 0 8px 0" }}>📋 Công việc</h4>
              <p style={{ margin: "2px 0" }}>• Nhận đầu việc phù hợp với thế mạnh</p>
              <p style={{ margin: "2px 0" }}>• Chỉ nộp sản phẩm khi <b>tất cả</b> đầu việc đã có người nhận</p>
              <p style={{ margin: "2px 0" }}>• Quá 24h, hệ thống tự chỉ định ngẫu nhiên</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: "#a5b4fc", margin: "0 0 8px 0" }}>💬 Thảo luận & Góp ý</h4>
              <p style={{ margin: "2px 0" }}>• 💬 Thảo luận: Công khai, hiển thị tên</p>
              <p style={{ margin: "2px 0" }}>• 📝 Góp ý: Ẩn danh</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: "#a5b4fc", margin: "0 0 8px 0" }}>👥 Đánh giá</h4>
              <p style={{ margin: "2px 0" }}>• Đánh giá dựa trên đóng góp thực tế</p>
              <p style={{ margin: "2px 0" }}>• Công bằng, khách quan</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ color: "#a5b4fc", margin: "0 0 8px 0" }}>📅 Họp nhóm</h4>
              <p style={{ margin: "2px 0" }}>• Tạo khung giờ khảo sát</p>
              <p style={{ margin: "2px 0" }}>• Chọn lịch rảnh của bạn</p>
              <p style={{ margin: "2px 0" }}>• Xem thống kê</p>
            </div>

            <div style={{ marginBottom: 8 }}>
              <h4 style={{ color: "#a5b4fc", margin: "0 0 8px 0" }}>📊 Công thức tính điểm</h4>
              <p style={{ margin: "2px 0", fontSize: 12, color: styles.textMuted }}>
                Thành viên = Task×40% + Đồng đội×30% + Đóng góp×20% + Trưởng nhóm×10%
              </p>
              <p style={{ margin: "2px 0", fontSize: 12, color: styles.textMuted }}>
                Trưởng nhóm = Task×40% + Đồng đội×30% + Đóng góp×30%
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
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
      alert("⚠️ Vui lòng chọn tên của bạn trên thanh tiêu đề trước khi chat!");
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
      alert("⚠️ Vui lòng chọn tên của bạn trên thanh tiêu đề!");
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
            <NutBam onClick={() => alert("⚠️ Vui lòng chọn tên của bạn trên thanh tiêu đề (góc phải) để tham gia khảo sát!")} variant="danger" theme={theme} style={{ padding: "2px 10px", fontSize: 11, marginLeft: 8 }}>
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
          <div>
            <label style={nhan}>
              Trưởng nhóm
              <HelpIcon 
                title="👑 Trưởng nhóm"
                text="Trưởng nhóm có quyền tạo, chỉnh sửa và xóa công việc.\nChỉ trưởng nhóm mới có thể chỉ định đầu việc cho thành viên."
              />
            </label>
            <Chon value={leader} onChange={setLeader} theme={theme}>
              <option value="">Chọn trưởng nhóm...</option>
              {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Chon>
          </div>
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
// ─── CÔNG VIỆC (ĐÃ SỬA LỖI) ──────────────────────────────────────────────────
function CongViec({ members, tasks, setTasks, theme, leader, currentReviewer }: any) {
  const [form, setForm] = useState({ 
    name: "", 
    description: "",
    subtasks: [] as string[],
    assignees: [] as string[],
    deadline: "", 
    complexity: 2
  });
  const [subtaskInput, setSubtaskInput] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [leaderRoleAssign, setLeaderRoleAssign] = useState<Record<string, string>>({});
  
  const styles = themeStyles[theme];

  // ─── TỰ ĐỘNG CHỈ ĐỊNH SAU 24H ──────────────────────────────────────────────
  useEffect(() => {
    if (tasks.length === 0 || members.length === 0) return;

    const now = new Date().getTime();
    let hasChanges = false;
    let updatedTasks = [...tasks];

    tasks.forEach((task, taskIndex) => {
      if (task.status === "done") return;

      const createdAt = new Date(task.createdAt).getTime();
      const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);

      if (hoursSinceCreated >= 24) {
        const assignedMembers = task.assignees?.map((a: any) => a.memberId) || [];
        const shuffledMembers = [...assignedMembers].sort(() => Math.random() - 0.5);
        const pendingSubtasks = task.subtasks.filter((s: any) => s.assignee === null);
        
        if (pendingSubtasks.length > 0 && shuffledMembers.length > 0) {
          hasChanges = true;
          let memberIndex = 0;
          const updatedSubtasks = task.subtasks.map((s: any) => {
            if (s.assignee === null) {
              const assignedMember = shuffledMembers[memberIndex % shuffledMembers.length];
              memberIndex++;
              return { ...s, assignee: assignedMember, status: "accepted" };
            }
            return s;
          });

          const updatedAssignees = (task.assignees || []).map((a: any) => {
            const isAssigned = updatedSubtasks.some((s: any) => s.assignee === a.memberId);
            return { ...a, status: isAssigned ? "accepted" : a.status };
          });

          updatedTasks[taskIndex] = {
            ...task,
            subtasks: updatedSubtasks,
            assignees: updatedAssignees
          };
        }
      }
    });

    if (hasChanges) {
      setTasks(updatedTasks);
      const notified = localStorage.getItem("auto_assigned_notified");
      if (!notified) {
        alert("⏰ Đã quá 24h! Hệ thống tự động chỉ định các đầu việc chưa có người nhận.");
        localStorage.setItem("auto_assigned_notified", "true");
        setTimeout(() => localStorage.removeItem("auto_assigned_notified"), 5000);
      }
    }
  }, [tasks, members, setTasks]);
  
  const addTask = () => { 
    if (!form.name.trim() || form.subtasks.length === 0 || form.assignees.length === 0) {
      alert("⚠️ Vui lòng nhập tên công việc, đầu việc nhỏ và chọn thành viên tham gia!");
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
      createdAt: new Date().toISOString(),
      assignees: form.assignees.map((id: string) => ({ 
        memberId: id, 
        role: "", 
        status: "pending" 
      }))
    };
    setTasks((t: any[]) => [...t, newTask]); 
    setForm({ name: "", description: "", subtasks: [], assignees: [], deadline: "", complexity: 2 });
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

  const toggleAssignee = (memberId: string) => {
    setForm((f: any) => ({
      ...f,
      assignees: f.assignees.includes(memberId)
        ? f.assignees.filter((id: string) => id !== memberId)
        : [...f.assignees, memberId]
    }));
  };

  const startEditing = (task: any) => {
    if (leader !== currentReviewer) {
      alert("⚠️ Chỉ trưởng nhóm mới có thể chỉnh sửa công việc!");
      return;
    }
    setEditingTask({
      ...task,
      subtaskNames: task.subtasks.map((s: any) => s.name)
    });
  };

  const saveEdit = () => {
    if (!editingTask.name.trim() || editingTask.subtaskNames.length === 0) {
      alert("⚠️ Vui lòng nhập tên công việc và ít nhất 1 đầu việc nhỏ!");
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
      alert("⚠️ Vui lòng chọn tên của bạn trên thanh tiêu đề!");
      return;
    }
    setTasks((prev: any[]) => prev.map((t: any) => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.map((s: any) => {
          if (s.id === subtaskId && s.assignee === null) {
            return { ...s, assignee: currentReviewer, status: "accepted" };
          }
          return s;
        });
        const updatedAssignees = (t.assignees || []).map((a: any) => {
          if (a.memberId === currentReviewer) {
            return { ...a, status: "accepted" };
          }
          return a;
        });
        return { 
          ...t, 
          subtasks: updatedSubtasks,
          assignees: updatedAssignees
        };
      }
      return t;
    }));
    alert("✅ Bạn đã nhận đầu việc này!");
  };

  const chiDinhCung = (taskId: string, subtaskId: string, memberId: string) => {
    if (leader !== currentReviewer) {
      alert("⚠️ Chỉ trưởng nhóm mới có thể chỉ định!");
      return;
    }
    setTasks((prev: any[]) => prev.map((t: any) => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.map((s: any) => {
          if (s.id === subtaskId) {
            return { ...s, assignee: memberId, status: "accepted" };
          }
          return s;
        });
        const updatedAssignees = (t.assignees || []).map((a: any) => {
          if (a.memberId === memberId) {
            return { ...a, status: "accepted" };
          }
          return a;
        });
        return { ...t, subtasks: updatedSubtasks, assignees: updatedAssignees };
      }
      return t;
    }));
    const member = members.find((m: any) => m.id === memberId);
    alert(`✅ Đã chỉ định đầu việc cho ${member?.name || "thành viên"}!`);
  };

  const xoaTask = (taskId: string) => {
    if (leader !== currentReviewer) {
      alert("⚠️ Chỉ trưởng nhóm mới có thể xóa công việc!");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) {
      setTasks((prev: any[]) => prev.filter((t: any) => t.id !== taskId));
    }
  };

  // ─── SỬA HÀM NÀY ─────────────────────────────────────────────────────────────
  const doiTrangThai = (id: string) => { 
    const order = ["todo", "doing", "done"]; 
    setTasks((ts: any[]) => ts.map((t: any) => {
      if (t.id !== id) return t;
      const subtaskList = t.subtasks || [];
      const hasSubtasks = subtaskList.length > 0;
      const pendingSubtasks = subtaskList.filter((s: any) => s.assignee === null);
      const allAssigned = hasSubtasks && pendingSubtasks.length === 0;
      
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
      <div style={{ 
        background: "#1e1b4b", 
        borderRadius: 12, 
        padding: "8px 14px", 
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
        fontSize: 12,
        color: "#a5b4fc"
      }}>
        <span>📌 Hướng dẫn nhanh:</span>
        <span style={{ color: "#e2e8f0" }}>⬜ Chưa có ai nhận → Nhấn "Nhận"</span>
        <span style={{ color: "#e2e8f0" }}>✅ Đã có người nhận</span>
        <span style={{ color: "#e2e8f0" }}>⏰ Quá 24h → Tự chỉ định</span>
        <HelpIcon 
          title="⏰ Quy trình 24h"
          text="Sau 24h, hệ thống sẽ tự chỉ định các đầu việc chưa có người nhận.\nHãy chủ động nhận việc sớm để chọn đúng thế mạnh!"
        />
      </div>

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
          <NutBam onClick={() => setShowForm(true)} theme={theme}>
            + Tạo công việc
          </NutBam>
        )}
      </div>
      
      {showForm && leader === currentReviewer && (
        <TheCard style={{ marginBottom: 20, borderColor: "#312e81" }} theme={theme}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h4 style={{ margin: 0, color: "#a5b4fc" }}>📝 Tạo công việc mới</h4>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={nhan}>Tên công việc *</label>
              <OInput value={form.name} onChange={v => setForm((f: any) => ({ ...f, name: v }))} placeholder="VD: Làm báo cáo marketing" theme={theme} />
            </div>
            <div>
              <label style={nhan}>Giao cho * (chọn nhiều)</label>
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
              <label style={nhan}>Hạn chót</label>
              <OInput type="date" value={form.deadline} onChange={v => setForm((f: any) => ({ ...f, deadline: v }))} theme={theme} />
            </div>
            <div>
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
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={nhan}>Mô tả chi tiết</label>
            <OInput value={form.description} onChange={v => setForm((f: any) => ({ ...f, description: v }))} placeholder="Mô tả công việc chi tiết..." theme={theme} />
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
            // ─── SỬA LỖI Ở ĐÂY ────────────────────────────────────────────────────────
            const subtaskList = t.subtasks || [];
            const hasSubtasks = subtaskList.length > 0;
            const pendingSubtasks = subtaskList.filter((s: any) => s.assignee === null);
            const allAssigned = hasSubtasks && pendingSubtasks.length === 0;
            
            const sc = TRANG_THAI[t.status as keyof typeof TRANG_THAI];
            const od = t.deadline && t.status !== "done" && new Date(t.deadline) < new Date();
            
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
                
                {/* ─── DANH SÁCH SUBTASK ───────────────────────────────────────────── */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", marginBottom: 8 }}>
                    📌 Các đầu việc nhỏ:
                  </div>
                  
                  {subtaskList.length > 0 ? (
                    subtaskList.map((s: any) => {
                      const isPending = s.assignee === null;
                      const isMine = s.assignee === currentReviewer;
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
                  
                  {/* ─── SỬA THÔNG BÁO Ở ĐÂY ───────────────────────────────────────── */}
                  {subtaskList.length > 0 && pendingSubtasks.length > 0 && (
                    <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>
                      ⏰ Còn {pendingSubtasks.length} đầu việc chưa có ai nhận. Hãy nhận đầu việc phù hợp với thế mạnh của bạn!
                    </div>
                  )}
                  {subtaskList.length > 0 && pendingSubtasks.length === 0 && t.status !== "done" && (
                    <div style={{ fontSize: 11, color: "#22c55e", marginTop: 6 }}>
                      ✅ Tất cả đầu việc đã có người nhận! Có thể bắt đầu làm việc.
                    </div>
                  )}
                </div>
                
                {/* ─── SỬA NỘP SẢN PHẨM Ở ĐÂY ────────────────────────────────────── */}
                {subtaskList.length > 0 && pendingSubtasks.length === 0 && (
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

// ─── CÁC COMPONENT KHÁC (GIỮ NGUYÊN) ──────────────────────────────────────────
// ... (ThaoLuan, DanhGiaNhanXet, DanhGiaTruongNhom, PhanTich, KetQua, App)

// ─── ỨNG DỤNG CHÍNH ────────────────────────────────────────────────────────────
export default function App() {
  // ... (giữ nguyên)
}
