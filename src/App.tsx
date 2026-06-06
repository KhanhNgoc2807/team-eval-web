import { useState, useMemo, useEffect, useRef, useCallback } from "react";

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
const STORAGE_KEY = "team_eval_shared_v1";
const POLL_INTERVAL = 3000;

// ─── THEME ────────────────────────────────────────────────────────────────────
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

// ─── SHARED STORAGE HOOKS ─────────────────────────────────────────────────────
function useSharedState(defaultData) {
  const [data, setData] = useState(defaultData);
  const [syncStatus, setSyncStatus] = useState("loading"); // loading | synced | error | saving
  const lastTimestampRef = useRef(0);
  const isMountedRef = useRef(true);

  const loadFromStorage = useCallback(async (force = false) => {
    try {
      const result = await window.storage.get(STORAGE_KEY, true);
      if (!isMountedRef.current) return;
      if (result && result.value) {
        const parsed = JSON.parse(result.value);
        if (force || parsed.timestamp > lastTimestampRef.current) {
          lastTimestampRef.current = parsed.timestamp || 0;
          setData(parsed.data);
          setSyncStatus("synced");
        }
      } else {
        setSyncStatus("synced");
      }
    } catch (e) {
      if (!isMountedRef.current) return;
      setSyncStatus("synced"); // first time, no data yet
    }
  }, []);

  const saveToStorage = useCallback(async (newData) => {
    setSyncStatus("saving");
    try {
      const ts = Date.now();
      lastTimestampRef.current = ts;
      await window.storage.set(STORAGE_KEY, JSON.stringify({ data: newData, timestamp: ts }), true);
      if (isMountedRef.current) setSyncStatus("synced");
    } catch (e) {
      if (isMountedRef.current) setSyncStatus("error");
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFromStorage(true);
    return () => { isMountedRef.current = false; };
  }, []);

  // Polling for updates from other users
  useEffect(() => {
    const timer = setInterval(() => loadFromStorage(false), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadFromStorage]);

  return { data, setData, saveToStorage, syncStatus, loadFromStorage };
}

// ─── SUB COMPONENTS ───────────────────────────────────────────────────────────
function SyncIndicator({ status }) {
  const configs = {
    loading: { color: "#f59e0b", icon: "⟳", text: "Đang tải..." },
    synced: { color: "#22c55e", icon: "✓", text: "Đồng bộ" },
    saving: { color: "#6366f1", icon: "⟳", text: "Đang lưu..." },
    error: { color: "#ef4444", icon: "✗", text: "Lỗi sync" },
  };
  const cfg = configs[status] || configs.synced;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: cfg.color, background: cfg.color + "15", border: `1px solid ${cfg.color}33`, borderRadius: 20, padding: "4px 10px" }}>
      <span style={{ animation: status === "saving" || status === "loading" ? "spin 1s linear infinite" : "none" }}>{cfg.icon}</span>
      <span>{cfg.text}</span>
    </div>
  );
}

function Tag({ color, children, style = {} }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, ...style }}>{children}</span>;
}

function Card({ children, style = {}, theme }) {
  const styles = themeStyles[theme];
  return <div style={{ background: styles.cardBg, border: `1px solid ${styles.border}`, borderRadius: 16, padding: 24, ...style }}>{children}</div>;
}

function Btn({ children, onClick, variant = "primary", style = {}, disabled = false, theme }) {
  const base = { border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s", opacity: disabled ? 0.4 : 1 };
  const vars = {
    primary: { background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" },
    ghost: { background: "transparent", border: `1px solid ${themeStyles[theme].border}`, color: themeStyles[theme].textMuted },
    danger: { background: "#450a0a", color: "#fca5a5", border: "1px solid #7f1d1d" },
    success: { background: "#052e16", color: "#86efac", border: "1px solid #166534" }
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style = {}, type = "text", onKeyDown, theme }) {
  const styles = themeStyles[theme];
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: styles.text, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", ...style }}
    onFocus={e => e.currentTarget.style.borderColor = "#6366f1"} onBlur={e => e.currentTarget.style.borderColor = styles.border} onKeyDown={onKeyDown} />;
}

function Select({ value, onChange, children, style = {}, theme }) {
  const styles = themeStyles[theme];
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 10, padding: "10px 14px", color: value ? styles.text : styles.textMuted, fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer", ...style }}>{children}</select>;
}

function RatingSelect({ value, onChange, theme }) {
  const styles = themeStyles[theme];
  return <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))} style={{ background: styles.inputBg, border: `1px solid ${styles.border}`, borderRadius: 8, padding: "7px 10px", color: styles.text, fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
    {RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>;
}

function ProgressBar({ value, max, color = "#6366f1" }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return <div style={{ height: 8, background: "#1e2235", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}99)`, borderRadius: 4, transition: "width .5s ease" }} /></div>;
}

const lbl = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const filterBtn = (theme) => ({ padding: "6px 14px", borderRadius: 20, border: `1px solid ${themeStyles[theme].border}`, background: "transparent", color: themeStyles[theme].textMuted, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s" });
const filterActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

// ─── PEER TAB (REALTIME SHARED) ────────────────────────────────────────────────
function PeerTab({ members, peerScores, onSavePeerScore, syncStatus, theme }) {
  const [reviewer, setReviewer] = useState("");
  const [tempScores, setTempScores] = useState({});
  const [justSubmitted, setJustSubmitted] = useState(false);
  const styles = themeStyles[theme];

  const reviewees = members.filter(m => m.id !== reviewer);
  const hasCompleted = reviewer ? (peerScores[reviewer]?.completed === true) : false;

  const setScore = (revieweeId, criterion, val) => {
    setTempScores(prev => ({ ...prev, [revieweeId]: { ...(prev[revieweeId] || {}), [criterion]: val } }));
  };
  const getTempScore = (revieweeId, criterion) => tempScores[revieweeId]?.[criterion] ?? 0;

  const submitAllReviews = async () => {
    let allDone = true;
    reviewees.forEach(reviewee => {
      PEER_CRITERIA.forEach(c => { if (getTempScore(reviewee.id, c) === 0) allDone = false; });
    });
    if (!allDone) { alert("Vui lòng đánh giá đầy đủ tất cả các tiêu chí cho tất cả thành viên!"); return; }

    // Build the new scores patch
    const patch = {};
    reviewees.forEach(reviewee => {
      if (!patch[reviewee.id]) patch[reviewee.id] = {};
      PEER_CRITERIA.forEach(criterion => {
        const score = getTempScore(reviewee.id, criterion);
        if (!patch[reviewee.id][criterion]) patch[reviewee.id][criterion] = [...(peerScores[reviewee.id]?.[criterion] || [])];
        patch[reviewee.id][criterion].push(score);
      });
    });
    patch[reviewer] = { ...(peerScores[reviewer] || {}), completed: true };

    await onSavePeerScore({ ...peerScores, ...patch });
    setTempScores({});
    setReviewer("");
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 3000);
  };

  const completedCount = Object.values(peerScores).filter(v => v?.completed === true).length;

  if (members.length < 2) {
    return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👥</div><div>Cần ít nhất 2 thành viên</div></div>;
  }

  // ── Live status screen (no reviewer selected OR already done) ──
  if (!reviewer || hasCompleted) {
    return (
      <div>
        {justSubmitted && (
          <div style={{ marginBottom: 16, padding: 16, background: "#052e16", border: "1px solid #166534", borderRadius: 12, color: "#86efac", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
            ✅ Đã gửi đánh giá thành công! Dữ liệu đã được lưu và chia sẻ với cả nhóm.
          </div>
        )}
        <Card style={{ marginBottom: 20 }} theme={theme}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: styles.textMuted, fontWeight: 600 }}>Bạn là:</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Select value={reviewer} onChange={v => {
                if (peerScores[v]?.completed) { alert("⚠️ Bạn đã đánh giá rồi! Mỗi người chỉ được đánh giá 1 lần."); return; }
                setReviewer(v);
              }} theme={theme}>
                <option value="">Chọn tên của bạn...</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} disabled={peerScores[m.id]?.completed === true}>
                    {m.name} {peerScores[m.id]?.completed ? "(✅ Đã đánh giá)" : ""}
                  </option>
                ))}
              </Select>
            </div>
            <SyncIndicator status={syncStatus} />
          </div>

          {/* Real-time progress */}
          <div style={{ background: "#0f172a", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", marginBottom: 12 }}>
              📡 TIẾN ĐỘ ĐÁNH GIÁ REAL-TIME (tự cập nhật mỗi {POLL_INTERVAL/1000}s)
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {members.map((m, i) => {
                const done = peerScores[m.id]?.completed === true;
                const mc = MEMBER_COLORS[i % MEMBER_COLORS.length];
                return (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: done ? "#052e16" : styles.inputBg, borderRadius: 8, border: `1px solid ${done ? "#166534" : styles.border}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: mc, flexShrink: 0 }}>
                      {m.name.split(" ").pop().charAt(0)}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.name}</div>
                    {done ? (
                      <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 700 }}>✅ Đã đánh giá</span>
                    ) : (
                      <span style={{ fontSize: 12, color: styles.textMuted }}>⏳ Chưa đánh giá</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: styles.textMuted, textAlign: "center" }}>
              <b style={{ color: "#22c55e" }}>{completedCount}</b>/{members.length} người đã hoàn thành
            </div>
          </div>

          <div style={{ padding: 12, background: "#1e1b4b", borderRadius: 10, fontSize: 13, color: "#818cf8" }}>
            🔒 <b>Ẩn danh hoàn toàn</b>: Sau khi đánh giá, tên bạn sẽ không hiển thị. Không ai biết ai đã đánh giá ai. Dữ liệu được đồng bộ ngay lập tức cho cả nhóm.
          </div>
        </Card>

        {completedCount === members.length && members.length > 0 && (
          <Card theme={theme} style={{ textAlign: "center", background: "#0c2a1a", borderColor: "#166534" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#86efac", marginBottom: 8 }}>Tất cả thành viên đã đánh giá xong!</div>
            <div style={{ fontSize: 13, color: "#4ade80" }}>Xem kết quả tại tab 📊 Phân tích và 🏆 Kết quả</div>
          </Card>
        )}
      </div>
    );
  }

  const reviewerName = members.find(m => m.id === reviewer)?.name;
  const allFilled = reviewees.every(reviewee => PEER_CRITERIA.every(c => getTempScore(reviewee.id, c) > 0));

  return (
    <div>
      <Card theme={theme} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <span style={{ fontSize: 14, color: "#a5b4fc" }}>👤 Đang đánh giá với vai trò: </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: themeStyles[theme].text }}>{reviewerName}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SyncIndicator status={syncStatus} />
            <Btn onClick={() => { setReviewer(""); setTempScores({}); }} variant="ghost" theme={theme}>↺ Thoát</Btn>
          </div>
        </div>
        <div style={{ fontSize: 13, color: styles.textMuted }}>
          🔒 Sau khi bấm "Gửi đánh giá", tên bạn sẽ được ẩn danh hoàn toàn và dữ liệu sẽ đồng bộ tức thì.
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {reviewees.map(reviewee => {
          const mc = MEMBER_COLORS[members.indexOf(reviewee) % MEMBER_COLORS.length];
          const isFilled = PEER_CRITERIA.every(c => getTempScore(reviewee.id, c) > 0);
          return (
            <Card key={reviewee.id} style={{ borderColor: isFilled ? "#22c55e44" : themeStyles[theme].border }} theme={theme}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: mc }}>
                  {reviewee.name.split(" ").pop().charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: styles.text }}>{reviewee.name}</div>
                  {isFilled && <div style={{ fontSize: 11, color: "#22c55e" }}>✓ Đã chọn điểm</div>}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {PEER_CRITERIA.map(c => (
                  <div key={c}>
                    <div style={{ fontSize: 12, color: styles.textMuted, marginBottom: 8 }}>{c}</div>
                    <RatingSelect value={getTempScore(reviewee.id, c)} onChange={v => setScore(reviewee.id, c, v)} theme={theme} />
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Btn onClick={submitAllReviews} variant="success" theme={theme} disabled={!allFilled} style={{ padding: "12px 32px", fontSize: 16 }}>
          🔒 Gửi đánh giá (ẩn danh) {allFilled ? "✅" : "⚠️"}
        </Btn>
        {!allFilled && (
          <div style={{ fontSize: 12, color: styles.textMuted, marginTop: 8 }}>Vui lòng đánh giá đủ tất cả các tiêu chí cho tất cả thành viên</div>
        )}
      </div>
    </div>
  );
}

// ─── SCHEDULE TAB ─────────────────────────────────────────────────────────────
function ScheduleTab({ members, scheduleSlots, setScheduleSlots, scheduleSelections, setScheduleSelections, onSave, theme }) {
  const styles = themeStyles[theme];
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotStart, setNewSlotStart] = useState("");
  const [newSlotEnd, setNewSlotEnd] = useState("");
  const [selectedMember, setSelectedMember] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const addTimeSlot = () => {
    if (!newSlotDate || !newSlotStart || !newSlotEnd) return;
    const newSlot = { id: uid(), date: newSlotDate, start: newSlotStart, end: newSlotEnd, label: `${new Date(newSlotDate).toLocaleDateString("vi-VN")} - ${newSlotStart}→${newSlotEnd}` };
    const newSlots = [...scheduleSlots, newSlot];
    setScheduleSlots(newSlots);
    onSave({ scheduleSlots: newSlots });
    setNewSlotDate(""); setNewSlotStart(""); setNewSlotEnd(""); setShowCreateForm(false);
  };

  const deleteSlot = (slotId) => {
    const newSlots = scheduleSlots.filter(s => s.id !== slotId);
    const newSel = { ...scheduleSelections };
    Object.keys(newSel).forEach(memberId => { if (newSel[memberId][slotId]) delete newSel[memberId][slotId]; });
    setScheduleSlots(newSlots); setScheduleSelections(newSel);
    onSave({ scheduleSlots: newSlots, scheduleSelections: newSel });
  };

  const toggleSelection = (slotId) => {
    if (!selectedMember) return;
    const newSel = { ...scheduleSelections, [selectedMember]: { ...(scheduleSelections[selectedMember] || {}), [slotId]: !(scheduleSelections[selectedMember]?.[slotId] || false) } };
    setScheduleSelections(newSel);
    onSave({ scheduleSelections: newSel });
  };

  const slotTotals = useMemo(() => {
    const totals = {};
    scheduleSlots.forEach(slot => { let count = 0; members.forEach(m => { if (scheduleSelections[m.id]?.[slot.id]) count++; }); totals[slot.id] = count; });
    return totals;
  }, [scheduleSlots, scheduleSelections, members]);

  const bestSlot = useMemo(() => {
    if (!scheduleSlots.length) return null;
    let best = scheduleSlots[0], bestCount = 0;
    scheduleSlots.forEach(slot => { if (slotTotals[slot.id] > bestCount) { bestCount = slotTotals[slot.id]; best = slot; } });
    return { slot: best, count: bestCount, total: members.length };
  }, [scheduleSlots, slotTotals, members]);

  const copyResult = () => {
    if (!bestSlot) return;
    const text = `📅 KẾT QUẢ KHẢO SÁT LỊCH HỌP NHÓM\n\nKhung giờ được chọn nhiều nhất: ${bestSlot.slot.label}\n${bestSlot.count}/${bestSlot.total} người rảnh\n\nChi tiết:\n${scheduleSlots.map(slot => { const avail = members.filter(m => scheduleSelections[m.id]?.[slot.id]).map(m => m.name).join(", "); return `${slot.label}: ${slotTotals[slot.id]} người${avail ? ` (${avail})` : ""}`; }).join("\n")}`;
    navigator.clipboard.writeText(text); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div>
      <Card theme={theme} style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#a5b4fc" }}>📅 KHẢO SÁT LỊCH RẢNH</h3>
          <Btn onClick={() => setShowCreateForm(!showCreateForm)} variant="ghost" theme={theme}>{showCreateForm ? "✖ Đóng" : "+ Thêm khung giờ"}</Btn>
        </div>
        {showCreateForm && (
          <div style={{ background: styles.inputBg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
              <div><label style={lbl}>Ngày</label><Input type="date" value={newSlotDate} onChange={setNewSlotDate} theme={theme} /></div>
              <div><label style={lbl}>Từ giờ</label><Input type="time" value={newSlotStart} onChange={setNewSlotStart} theme={theme} /></div>
              <div><label style={lbl}>Đến giờ</label><Input type="time" value={newSlotEnd} onChange={setNewSlotEnd} theme={theme} /></div>
              <div><Btn onClick={addTimeSlot} theme={theme}>Thêm</Btn></div>
            </div>
          </div>
        )}
        {scheduleSlots.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: styles.textMuted }}><div style={{ fontSize: 48, marginBottom: 12 }}>📅</div><div>Chưa có khung giờ nào.</div></div>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Bạn là:</label>
              <Select value={selectedMember} onChange={setSelectedMember} theme={theme} style={{ maxWidth: 300 }}>
                <option value="">Chọn tên của bạn...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </div>
            {selectedMember && (
              <div style={{ overflowX: "auto", marginBottom: 24 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead><tr style={{ borderBottom: `1px solid ${styles.border}` }}>
                    <th style={{ textAlign: "left", padding: 12 }}>Khung giờ</th>
                    <th style={{ textAlign: "center", padding: 12 }}>Lựa chọn</th>
                    <th style={{ textAlign: "center", padding: 12 }}>Số người rảnh</th>
                    <th style={{ textAlign: "center", padding: 12 }}></th>
                  </tr></thead>
                  <tbody>{scheduleSlots.map(slot => (
                    <tr key={slot.id} style={{ borderBottom: `1px solid ${styles.border}` }}>
                      <td style={{ padding: 12 }}>{slot.label}</td>
                      <td style={{ textAlign: "center", padding: 12 }}>
                        <button onClick={() => toggleSelection(slot.id)} style={{ width: 32, height: 32, borderRadius: 8, background: scheduleSelections[selectedMember]?.[slot.id] ? "#22c55e" : styles.inputBg, border: `1px solid ${scheduleSelections[selectedMember]?.[slot.id] ? "#22c55e" : styles.border}`, cursor: "pointer", color: scheduleSelections[selectedMember]?.[slot.id] ? "#fff" : styles.textMuted }}>
                          {scheduleSelections[selectedMember]?.[slot.id] ? "✓" : "○"}
                        </button>
                      </td>
                      <td style={{ textAlign: "center", padding: 12 }}><span style={{ fontWeight: 700, color: "#22c55e" }}>{slotTotals[slot.id]}</span>/{members.length}</td>
                      <td style={{ textAlign: "center", padding: 12 }}><button onClick={() => deleteSlot(slot.id)} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18 }}>🗑️</button></td>
                    </tr>
                  ))}</tbody>
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
                  <Btn onClick={copyResult} variant="primary" theme={theme}>{copySuccess ? "✓ Đã copy!" : "📋 Copy kết quả"}</Btn>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ─── SETUP TAB ────────────────────────────────────────────────────────────────
function SetupTab({ members, setMembers, projectName, setProjectName, leader, setLeader, onSave, theme }) {
  const [name, setName] = useState("");
  const [mssv, setMssv] = useState("");
  const styles = themeStyles[theme];
  const add = () => {
    if (!name.trim()) return;
    const newMembers = [...members, { id: uid(), name: name.trim(), mssv: mssv.trim() }];
    setMembers(newMembers); onSave({ members: newMembers }); setName(""); setMssv("");
  };
  const handleKeyDown = (e) => { if (e.key === "Enter") add(); };
  const removeMember = (id) => {
    const newMembers = members.filter(m => m.id !== id);
    setMembers(newMembers); onSave({ members: newMembers });
  };
  return (
    <div className="two-columns" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <Card theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>⚙️ THIẾT LẬP</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={lbl}>Tên dự án / môn học</label><Input value={projectName} onChange={v => { setProjectName(v); onSave({ projectName: v }); }} placeholder="VD: Dự án Marketing - Học kỳ 2" theme={theme} /></div>
          <div><label style={lbl}>Trưởng nhóm</label><Select value={leader} onChange={v => { setLeader(v); onSave({ leader: v }); }} theme={theme}><option value="">Chọn trưởng nhóm...</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></div>
        </div>
        <div style={{ marginTop: 20, padding: 16, background: styles.inputBg, borderRadius: 12, fontSize: 13, color: styles.textMuted, lineHeight: 1.8 }}>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 CÔNG THỨC TÍNH ĐIỂM</div>
          <div>Thành viên = <b style={{ color: "#6366f1" }}>Công việc × 40%</b> + <b style={{ color: "#22c55e" }}>Đồng đội × 40%</b> + <b style={{ color: "#f59e0b" }}>Trưởng nhóm × 20%</b></div>
          <div>Trưởng nhóm = <b style={{ color: "#6366f1" }}>Công việc × 40%</b> + <b style={{ color: "#22c55e" }}>Đồng đội × 60%</b></div>
        </div>
        <div style={{ marginTop: 16, padding: 14, background: "#1e1b4b", borderRadius: 12, fontSize: 13, color: "#818cf8" }}>
          💡 <b>Hướng dẫn sử dụng:</b> Trưởng nhóm thiết lập xong → Chia sẻ link (nút 🔗 Chia sẻ) cho cả nhóm → Mỗi người mở link, vào tab "Đánh giá đồng đội", chọn tên mình và đánh giá → Dữ liệu tự đồng bộ cho tất cả.
        </div>
      </Card>
      <Card theme={theme}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>👥 DANH SÁCH THÀNH VIÊN</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, marginBottom: 16 }}>
          <Input value={name} onChange={setName} placeholder="Họ và tên" onKeyDown={handleKeyDown} theme={theme} />
          <Input value={mssv} onChange={setMssv} placeholder="Mã số sinh viên" onKeyDown={handleKeyDown} theme={theme} />
          <Btn onClick={add} theme={theme}>Thêm</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
          {members.length === 0 && <div style={{ textAlign: "center", padding: 40, color: styles.textMuted, fontSize: 14 }}>Chưa có thành viên nào</div>}
          {members.map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: styles.inputBg, borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: MEMBER_COLORS[i % MEMBER_COLORS.length] + "22", border: `2px solid ${MEMBER_COLORS[i % MEMBER_COLORS.length]}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: MEMBER_COLORS[i % MEMBER_COLORS.length], flexShrink: 0 }}>
                {m.name.split(" ").pop().charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: styles.text }}>{m.name}</div>
                {m.mssv && <div style={{ fontSize: 11, color: styles.textMuted }}>MSSV: {m.mssv}</div>}
              </div>
              {leader === m.id && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
              <button onClick={() => removeMember(m.id)} style={{ background: "none", border: "none", color: styles.textMuted, cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── TASK TAB ─────────────────────────────────────────────────────────────────
function TaskTab({ members, tasks, setTasks, onSave, theme }) {
  const [form, setForm] = useState({ name: "", assignees: [], deadline: "", complexity: 2 });
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const styles = themeStyles[theme];

  const addTask = () => {
    if (!form.name.trim() || form.assignees.length === 0) return;
    const newTasks = [...tasks, { id: uid(), name: form.name, assignees: form.assignees, deadline: form.deadline, complexity: form.complexity, status: "todo" }];
    setTasks(newTasks); onSave({ tasks: newTasks }); setForm({ name: "", assignees: [], deadline: "", complexity: 2 }); setShowForm(false);
  };

  const toggleAssignee = (memberId) => {
    setForm(f => ({ ...f, assignees: f.assignees.includes(memberId) ? f.assignees.filter(id => id !== memberId) : [...f.assignees, memberId] }));
  };

  const cycleStatus = (id) => {
    const order = ["todo", "doing", "done"];
    const newTasks = tasks.map(t => t.id !== id ? t : { ...t, status: order[(order.indexOf(t.status) + 1) % 3] });
    setTasks(newTasks); onSave({ tasks: newTasks });
  };

  const deleteTask = (id) => {
    const newTasks = tasks.filter(t => t.id !== id);
    setTasks(newTasks); onSave({ tasks: newTasks });
  };

  const filtered = filter === "all" ? tasks : tasks.filter(t => t.assignees?.includes(filter));
  const overdue = (t) => { if (!t.deadline || t.status === "done") return false; const today = new Date(); today.setHours(0,0,0,0); return new Date(t.deadline + "T00:00:00") < today; };
  const btnStyle = filterBtn(theme);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button onClick={() => setFilter("all")} style={{ ...btnStyle, ...(filter === "all" ? filterActive : {}) }}>Tất cả ({tasks.length})</button>
          {members.map((m, mi) => (
            <button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)} style={{ ...btnStyle, ...(filter === m.id ? { borderColor: MEMBER_COLORS[mi % MEMBER_COLORS.length], color: MEMBER_COLORS[mi % MEMBER_COLORS.length], background: MEMBER_COLORS[mi % MEMBER_COLORS.length] + "18" } : {}) }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MEMBER_COLORS[mi % MEMBER_COLORS.length], display: "inline-block" }} />
              <span>{m.name.split(" ").pop()} ({tasks.filter(t => t.assignees?.includes(m.id)).length})</span>
            </button>
          ))}
        </div>
        <Btn onClick={() => setShowForm(true)} theme={theme}>+ Thêm công việc</Btn>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 20, borderColor: "#312e81" }} theme={theme}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, alignItems: "start", marginBottom: 12 }}>
            <div><label style={lbl}>Tên công việc *</label><Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Mô tả ngắn..." theme={theme} /></div>
            <div><label style={lbl}>Hạn chót</label><Input type="date" value={form.deadline} onChange={v => setForm(f => ({ ...f, deadline: v }))} theme={theme} /></div>
            <div><label style={lbl}>Độ khó</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[1,2,3].map(v => (
                  <button key={v} onClick={() => setForm(f => ({ ...f, complexity: v }))} style={{ flex: 1, padding: "10px 4px", borderRadius: 8, border: `1px solid ${form.complexity === v ? COMPLEXITY[v].color : themeStyles[theme].border}`, background: form.complexity === v ? COMPLEXITY[v].color + "22" : "transparent", color: form.complexity === v ? COMPLEXITY[v].color : themeStyles[theme].textMuted, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Cấp {v}</button>
                ))}
              </div>
            </div>
          </div>
          <div><label style={lbl}>Giao cho * (chọn nhiều)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {members.map(m => (
                <button key={m.id} onClick={() => toggleAssignee(m.id)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${form.assignees.includes(m.id) ? "#22c55e" : themeStyles[theme].border}`, background: form.assignees.includes(m.id) ? "#22c55e22" : "transparent", color: form.assignees.includes(m.id) ? "#22c55e" : themeStyles[theme].text, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  {form.assignees.includes(m.id) ? "✓ " : "○ "}{m.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Btn onClick={() => setShowForm(false)} variant="ghost" theme={theme}>Hủy</Btn>
            <Btn onClick={addTask} theme={theme}>✓ Thêm công việc</Btn>
          </div>
        </Card>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: themeStyles[theme].textMuted }}><div style={{ fontSize: 48, marginBottom: 12 }}>📋</div><div style={{ fontSize: 16, fontWeight: 600 }}>Chưa có công việc nào</div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 14 }}>
          {filtered.map(t => {
            const assigneeMembers = members.filter(m => t.assignees?.includes(m.id));
            const sc = STATUS[t.status];
            const od = overdue(t);
            return (
              <div key={t.id} style={{ background: themeStyles[theme].cardBg, border: `1px solid ${t.status === "done" ? "#166534" : od ? "#7f1d1d" : themeStyles[theme].border}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {assigneeMembers.map(m => (
                      <span key={m.id} style={{ background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length] + "22", color: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], border: `1px solid ${MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length]}44`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{m.name.split(" ").pop()}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Tag color={COMPLEXITY[t.complexity].color}>Cấp {t.complexity}</Tag>
                    <button onClick={() => deleteTask(t.id)} style={{ background: "none", border: "none", color: themeStyles[theme].textMuted, cursor: "pointer", fontSize: 18 }}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.status === "done" ? "#4ade80" : themeStyles[theme].text, textDecoration: t.status === "done" ? "line-through" : "none", marginBottom: 10 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: themeStyles[theme].textMuted, marginBottom: 8 }}>👥 {assigneeMembers.map(m => m.name).join(", ")}</div>
                {t.deadline && <div style={{ fontSize: 12, color: od ? "#f87171" : themeStyles[theme].textMuted, marginBottom: 12 }}>{od ? "⚠️ Quá hạn: " : "📅 Hạn: "}{new Date(t.deadline + "T00:00:00").toLocaleDateString("vi-VN")}</div>}
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

// ─── LEADER TAB ───────────────────────────────────────────────────────────────
function LeaderTab({ members, leader, leaderScores, onSaveLeaderScore, theme }) {
  const styles = themeStyles[theme];
  const setScore = (memberId, criterion, val) => {
    const newScores = { ...leaderScores, [memberId]: { ...(leaderScores[memberId] || {}), [criterion]: val } };
    onSaveLeaderScore(newScores);
  };
  const getScore = (memberId, criterion) => leaderScores?.[memberId]?.[criterion] ?? 0;
  if (!leader) return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👑</div><div>Chưa chọn trưởng nhóm. Vào tab <b style={{ color: "#a5b4fc" }}>Thiết lập</b> để chọn.</div></div>;
  const leaderMember = members.find(m => m.id === leader);
  const others = members.filter(m => m.id !== leader);
  if (!others.length) return <div style={{ textAlign: "center", padding: 80, color: styles.textMuted }}><div style={{ fontSize: 48 }}>👥</div><div>Nhóm chỉ có trưởng nhóm</div></div>;
  return (
    <div>
      <Card style={{ marginBottom: 20, borderColor: "#451a03" }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ fontSize: 28 }}>👑</div><div><div style={{ fontSize: 15, fontWeight: 700, color: "#fcd34d" }}>Trưởng nhóm: {leaderMember?.name}</div><div style={{ fontSize: 13, color: "#92400e" }}>Đánh giá {others.length} thành viên</div></div></div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {others.map(m => {
          const mc = MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length];
          const mAvg = avg(LEADER_CRITERIA.map(c => getScore(m.id, c)).filter(s => s > 0));
          return (
            <Card key={m.id} theme={theme}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: mc }}>{m.name.split(" ").pop().charAt(0)}</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: styles.text }}>{m.name}</div>
                {mAvg > 0 && <Tag color={mAvg >= 8 ? "#22c55e" : mAvg >= 6 ? "#f59e0b" : "#ef4444"}>TB: {mAvg.toFixed(1)}</Tag>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                {LEADER_CRITERIA.map(c => (<div key={c}><div style={{ fontSize: 12, color: styles.textMuted, marginBottom: 8 }}>{c}</div><RatingSelect value={getScore(m.id, c)} onChange={v => setScore(m.id, c, v)} theme={theme} /></div>))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ANALYSIS TAB ─────────────────────────────────────────────────────────────
function AnalysisTab({ members, tasks, peerScores, leaderScores, leader, theme }) {
  const styles = themeStyles[theme];
  const getMemberScores = (memberId) => {
    const scores = {};
    PEER_CRITERIA.forEach(criterion => {
      const arr = peerScores[memberId]?.[criterion] || [];
      scores[criterion] = arr.length > 0 ? avg(arr) : 0;
    });
    return scores;
  };
  const teamAvgScores = useMemo(() => {
    const totals = {}; const counts = {};
    PEER_CRITERIA.forEach(c => { totals[c] = 0; counts[c] = 0; });
    members.forEach(m => { const s = getMemberScores(m.id); PEER_CRITERIA.forEach(c => { if (s[c] > 0) { totals[c] += s[c]; counts[c]++; } }); });
    const avgs = {};
    PEER_CRITERIA.forEach(c => { avgs[c] = counts[c] > 0 ? totals[c] / counts[c] : 0; });
    return avgs;
  }, [members, peerScores]);

  const getScoreLevel = (score) => {
    if (score >= 8.5) return { text: "Xuất sắc", color: "#22c55e", icon: "⭐" };
    if (score >= 7) return { text: "Tốt", color: "#22c55e", icon: "🟢" };
    if (score >= 5) return { text: "Trung bình", color: "#f59e0b", icon: "🟡" };
    return { text: "Cần cải thiện", color: "#ef4444", icon: "🔴" };
  };
  const getSuggestion = (criterion, score) => {
    if (score >= 7) return null;
    const suggestions = { "Chất lượng công việc": "📌 Review kỹ trước khi nộp, học hỏi từ người giỏi hơn", "Chủ động & Đúng tiến độ": "📌 Báo cáo tiến độ thường xuyên, chia nhỏ công việc", "Tinh thần hợp tác": "📌 Chủ động hỗ trợ đồng đội, phản hồi nhanh, tham gia họp đầy đủ" };
    return suggestions[criterion] || "📌 Cần cải thiện";
  };
  const weakestCriterion = Object.entries(teamAvgScores).reduce((a, b) => a[1] < b[1] ? a : b);

  return (
    <div>
      <Card theme={theme} style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#a5b4fc" }}>📈 THỐNG KÊ CẢ NHÓM</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr style={{ borderBottom: `1px solid ${styles.border}` }}>
              <th style={{ textAlign: "left", padding: 12 }}>Tiêu chí</th>
              <th style={{ textAlign: "center", padding: 12 }}>Điểm TB</th>
              <th style={{ textAlign: "center", padding: 12 }}>Đánh giá</th>
              <th style={{ textAlign: "center", padding: 12 }}>Trạng thái</th>
            </tr></thead>
            <tbody>{PEER_CRITERIA.map(c => { const score = teamAvgScores[c]; const level = getScoreLevel(score); return (
              <tr key={c} style={{ borderBottom: `1px solid ${styles.border}` }}>
                <td style={{ padding: 12 }}>{c}</td>
                <td style={{ textAlign: "center", padding: 12 }}><span style={{ fontWeight: 700, fontSize: 16 }}>{score.toFixed(1)}</span></td>
                <td style={{ textAlign: "center", padding: 12 }}><span style={{ color: level.color }}>{level.icon} {level.text}</span></td>
                <td style={{ textAlign: "center", padding: 12 }}>{score < 7 ? <span style={{ color: "#ef4444" }}>🔴 CẦN CẢI THIỆN</span> : <span style={{ color: "#22c55e" }}>✅ Tốt</span>}</td>
              </tr>
            );})}
            </tbody>
          </table>
        </div>
        {weakestCriterion[1] < 7 && weakestCriterion[1] > 0 && (
          <div style={{ marginTop: 20, padding: 16, background: "#1e1b4b", borderRadius: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "#fcd34d" }}>🎯 KHUYẾN NGHỊ</div>
            <div style={{ fontSize: 14, color: styles.text }}>Nhóm cần cải thiện <b style={{ color: "#f59e0b" }}>"{weakestCriterion[0]}"</b> (điểm {weakestCriterion[1].toFixed(1)}/10)</div>
          </div>
        )}
      </Card>
      <h3 style={{ fontSize: 15, color: "#a5b4fc", marginBottom: 16 }}>👤 PHÂN TÍCH TỪNG THÀNH VIÊN</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {members.map((m, mi) => {
          const scores = getMemberScores(m.id);
          const mc = MEMBER_COLORS[mi % MEMBER_COLORS.length];
          const weaknesses = PEER_CRITERIA.filter(c => scores[c] < 7 && scores[c] > 0);
          const strengths = PEER_CRITERIA.filter(c => scores[c] >= 7 && scores[c] > 0);
          const memberTasks = tasks.filter(t => t.assignees?.includes(m.id));
          return (
            <Card key={m.id} style={{ borderColor: mc + "44" }} theme={theme}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: mc }}>{m.name.split(" ").pop().charAt(0)}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: styles.text }}>{m.name}</div>
                {m.id === leader && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
                <div style={{ fontSize: 12, color: styles.textMuted, marginLeft: "auto" }}>📋 {memberTasks.filter(t => t.status === "done").length}/{memberTasks.length} công việc</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>✅ ĐIỂM MẠNH</div>
                  {strengths.length > 0 ? strengths.map(c => { const level = getScoreLevel(scores[c]); return (<div key={c} style={{ marginBottom: 8 }}><div style={{ fontSize: 13 }}>{c}</div><div style={{ fontSize: 12, color: level.color }}>{scores[c].toFixed(1)}/10 - {level.text}</div></div>); }) : <div style={{ fontSize: 13, color: styles.textMuted }}>Chưa có dữ liệu</div>}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 8 }}>⚠️ ĐIỂM YẾU & GỢI Ý</div>
                  {weaknesses.length > 0 ? weaknesses.map(c => (<div key={c} style={{ marginBottom: 12 }}><div style={{ fontSize: 13 }}>{c}</div><div style={{ fontSize: 12, color: "#ef4444", marginBottom: 4 }}>{scores[c].toFixed(1)}/10</div><div style={{ fontSize: 12, color: "#818cf8", background: "#1e1b4b", padding: 6, borderRadius: 6 }}>{getSuggestion(c, scores[c])}</div></div>)) : <div style={{ fontSize: 13, color: styles.textMuted }}>{scores[PEER_CRITERIA[0]] === 0 ? "Chưa có dữ liệu" : "✅ Không có điểm yếu!"}</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESULT TAB ───────────────────────────────────────────────────────────────
function ResultTab({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore, onSave, theme }) {
  const styles = themeStyles[theme];
  const getPeerScoreForMember = (memberId) => {
    const allScores = [];
    PEER_CRITERIA.forEach(c => { const s = peerScores[memberId]?.[c]; if (s && s.length) allScores.push(...s); });
    if (!allScores.length) return null;
    return avg(allScores) * 10;
  };
  const results = useMemo(() => {
    if (!members.length) return [];
    return members.map(m => {
      const myTasks = tasks.filter(t => t.assignees?.includes(m.id));
      let taskScore = 100;
      if (myTasks.length > 0) {
        const totalPossible = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100, 0);
        const earned = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100 * STATUS[t.status].pct, 0);
        taskScore = totalPossible > 0 ? (earned / totalPossible) * 100 : 100;
      }
      const peerScore = getPeerScoreForMember(m.id) ?? 100;
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
      <Card style={{ marginBottom: 24, borderColor: "#1e3a5f" }} theme={theme}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ fontSize: 36 }}>🎓</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 16, fontWeight: 800, color: "#93c5fd" }}>Điểm giảng viên cho nhóm</div><div style={{ fontSize: 13, color: styles.textMuted }}>Nhập điểm giảng viên (thang 10)</div></div>
          <input type="number" min="0" max="10" step="0.1" value={teacherScore} onChange={e => { setTeacherScore(e.target.value); onSave({ teacherScore: e.target.value }); }} placeholder="VD: 9" style={{ width: 100, background: styles.inputBg, border: "2px solid #1e3a5f", borderRadius: 12, padding: "12px 16px", color: "#93c5fd", fontSize: 22, fontWeight: 800, textAlign: "center" }} />
          <div style={{ fontSize: 13, color: styles.textMuted }}>/ 10</div>
        </div>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Điểm TB hệ thống", value: teamAvg.toFixed(1), icon: "📊", color: "#6366f1", sub: "thang 100" },
          { label: hasTeacherScore ? "Điểm GV" : "Chờ điểm GV", value: hasTeacherScore ? ts.toFixed(1) : "—", icon: "🎓", color: "#3b82f6", sub: "thang 10" },
          { label: "Điểm cao nhất", value: hasTeacherScore && results.length ? Math.max(...results.map(r => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⭐", color: "#22c55e", sub: "thang 10" },
          { label: "Điểm thấp nhất", value: hasTeacherScore && results.length ? Math.min(...results.map(r => personalGrade(r.finalScore))).toFixed(2) : "—", icon: "⚠️", color: "#f59e0b", sub: "thang 10" },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: "center" }} theme={theme}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: "clamp(18px,4vw,28px)", fontWeight: 800, color: s.color, margin: "8px 0 2px" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: styles.textMuted, marginBottom: 2 }}>{s.sub}</div>
            <div style={{ fontSize: 11, color: styles.textMuted }}>{s.label}</div>
          </Card>
        ))}
      </div>
      <Card style={{ padding: 0, overflow: "hidden" }} theme={theme}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ padding: "14px 24px", background: styles.inputBg, borderBottom: `1px solid ${styles.border}`, display: "grid", gridTemplateColumns: "minmax(140px,1fr) 75px 75px 75px 85px 105px 95px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: styles.textMuted, textTransform: "uppercase", gap: 8, minWidth: 700 }}>
            <span>Thành viên</span><span style={{ textAlign: "center" }}>Công việc</span><span style={{ textAlign: "center" }}>Đồng đội</span><span style={{ textAlign: "center" }}>TN</span><span style={{ textAlign: "center" }}>Tổng (100)</span><span style={{ textAlign: "center" }}>% Đóng góp</span><span style={{ textAlign: "center" }}>{hasTeacherScore ? "Điểm thực" : "Chờ điểm"}</span>
          </div>
          {sorted.map(r => {
            const mi = members.findIndex(m => m.id === r.id);
            const mc = MEMBER_COLORS[mi >= 0 ? mi % MEMBER_COLORS.length : 0];
            const pct = pctOf(r.finalScore);
            const pg = personalGrade(r.finalScore);
            const pgColor = pg === null ? styles.textMuted : pg >= 8.5 ? "#22c55e" : pg >= 7 ? "#6366f1" : pg >= 5.5 ? "#f59e0b" : "#ef4444";
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "minmax(140px,1fr) 75px 75px 75px 85px 105px 95px", padding: "14px 24px", borderBottom: `1px solid ${styles.border}`, alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: mc, flexShrink: 0 }}>{r.name.split(" ").pop().charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: styles.text }}>{r.name.split(" ").pop()}</div>
                    <div style={{ fontSize: 11, color: styles.textMuted }}>{r.doneTasks}/{r.myTasks} cv</div>
                  </div>
                </div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{r.taskScore.toFixed(0)}</div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{r.peerScore.toFixed(0)}</div>
                <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{r.isLeader ? "–" : r.leaderScore.toFixed(0)}</div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#a5b4fc", marginBottom: 4 }}>{r.finalScore.toFixed(1)}</div>
                  <ProgressBar value={r.finalScore} max={maxFinal} color={mc} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ background: mc + "18", border: `1px solid ${mc}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: mc }}>{pct.toFixed(1)}%</div>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  {pg !== null ? <div style={{ background: pgColor + "18", border: `1px solid ${pgColor}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block" }}><div style={{ fontSize: 16, fontWeight: 800, color: pgColor }}>{pg.toFixed(2)}</div></div> : <span style={{ color: styles.textMuted, fontSize: 20 }}>—</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const defaultData = {
  projectName: "", leader: "", members: [], tasks: [],
  peerScores: {}, leaderScores: {}, teacherScore: "",
  scheduleSlots: [], scheduleSelections: {},
};

export default function App() {
  const [tab, setTab] = useState("setup");
  const [theme, setTheme] = useState("dark");
  const [isCopied, setIsCopied] = useState(false);

  const { data, setData, saveToStorage, syncStatus, loadFromStorage } = useSharedState(defaultData);

  // Destructure for convenience
  const { projectName, leader, members, tasks, peerScores, leaderScores, teacherScore, scheduleSlots, scheduleSelections } = data;

  const setField = (field) => (value) => setData(prev => ({ ...prev, [field]: value }));

  // Merge-save: only overwrite specified fields, keep the rest from latest storage
  const mergeSave = useCallback(async (patch) => {
    // Read latest first, then merge, to avoid overwriting concurrent changes
    try {
      const result = await window.storage.get(STORAGE_KEY, true);
      let latest = data;
      if (result && result.value) {
        const parsed = JSON.parse(result.value);
        latest = { ...defaultData, ...parsed.data };
      }
      const merged = { ...latest, ...patch };
      setData(merged);
      await saveToStorage(merged);
    } catch (e) {
      const merged = { ...data, ...patch };
      setData(merged);
      await saveToStorage(merged);
    }
  }, [data, saveToStorage]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const generateShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true); setTimeout(() => setIsCopied(false), 2000);
  };

  const styles = themeStyles[theme];

  if (syncStatus === "loading") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: styles.bg, color: styles.text, gap: 16 }}>
        <div style={{ fontSize: 48 }}>⟳</div>
        <div style={{ fontSize: 16, color: styles.textMuted }}>Đang tải dữ liệu nhóm...</div>
      </div>
    );
  }

  const completedPeerCount = members.filter(m => peerScores[m.id]?.completed === true).length;
  const tabBadge = {
    tasks: tasks.length || null,
    peer: members.length >= 2 ? `${completedPeerCount}/${members.length}` : null,
    schedule: scheduleSlots.length > 0 ? scheduleSlots.length : null,
  };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: styles.bg, color: styles.text }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .two-columns { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .app-nav button .tab-label { display: none; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: styles.headerBg, borderBottom: `1px solid ${styles.border}`, padding: "0 16px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, padding: "12px 0", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>✦</div>
            <div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 700, color: "#a5b4fc", letterSpacing: 2 }}>TEAM EVAL</div>
              <div style={{ fontSize: 11, color: "#5c54c7", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectName || "NHÓM CỦA BẠN"}</div>
            </div>
          </div>

          <nav className="app-nav" style={{ display: "flex", gap: 3, background: styles.inputBg, borderRadius: 14, padding: 4, flex: "1 1 auto", overflowX: "auto", justifyContent: "center" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "8px 10px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, transition: "all .2s", background: tab === t.id ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent", color: tab === t.id ? "#fff" : styles.textMuted, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                <span>{t.icon}</span>
                <span className="tab-label">{t.label}</span>
                {tabBadge[t.id] && <span style={{ background: tab === t.id ? "rgba(255,255,255,.25)" : styles.border, borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 800 }}>{tabBadge[t.id]}</span>}
              </button>
            ))}
          </nav>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <SyncIndicator status={syncStatus} />
            <Btn onClick={toggleTheme} variant="ghost" theme={theme} style={{ padding: "8px 12px", fontSize: 18 }}>{theme === "dark" ? "☀️" : "🌙"}</Btn>
            <Btn onClick={generateShareLink} variant={isCopied ? "success" : "primary"} theme={theme} style={{ padding: "8px 14px", fontSize: 12, whiteSpace: "nowrap" }}>{isCopied ? "✓ Đã copy!" : "🔗 Chia sẻ"}</Btn>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px" }}>
        {tab === "setup" && (
          <SetupTab
            members={members} setMembers={setField("members")}
            projectName={projectName} setProjectName={setField("projectName")}
            leader={leader} setLeader={setField("leader")}
            onSave={mergeSave} theme={theme}
          />
        )}
        {tab === "tasks" && (
          <TaskTab members={members} tasks={tasks} setTasks={setField("tasks")} onSave={mergeSave} theme={theme} />
        )}
        {tab === "peer" && (
          <PeerTab
            members={members} peerScores={peerScores}
            onSavePeerScore={(newScores) => mergeSave({ peerScores: newScores })}
            syncStatus={syncStatus} theme={theme}
          />
        )}
        {tab === "leader" && (
          <LeaderTab
            members={members} leader={leader} leaderScores={leaderScores}
            onSaveLeaderScore={(newScores) => mergeSave({ leaderScores: newScores })}
            theme={theme}
          />
        )}
        {tab === "schedule" && (
          <ScheduleTab
            members={members}
            scheduleSlots={scheduleSlots} setScheduleSlots={setField("scheduleSlots")}
            scheduleSelections={scheduleSelections} setScheduleSelections={setField("scheduleSelections")}
            onSave={mergeSave} theme={theme}
          />
        )}
        {tab === "analysis" && (
          <AnalysisTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} theme={theme} />
        )}
        {tab === "result" && (
          <ResultTab
            members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores}
            leader={leader} teacherScore={teacherScore} setTeacherScore={setField("teacherScore")}
            onSave={mergeSave} theme={theme}
          />
        )}
      </div>
    </div>
  );
}
