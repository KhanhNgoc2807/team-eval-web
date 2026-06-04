
const uid = () => Math.random().toString(36).substring(2, 9);

// ─── MODERN & SAFE URL COMPRESSION (UTF-8 SAFE) ──────────────────────────────
// ─── HELPERS FOR URL COMPRESSION ──────────────────────────────────────────────
// FIX: dùng TextEncoder thay vì escape/unescape đã deprecated
const compressData = (state) => {
try {
    const str = JSON.stringify(state);
    const bytes = new TextEncoder().encode(str);
    let binString = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binString += String.fromCharCode(bytes[i]);
    }
    return btoa(binString).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return btoa(encodeURIComponent(JSON.stringify(state)));
} catch (e) {
return "";
}
@@ -43,14 +38,7 @@ const compressData = (state) => {
const decompressData = (str) => {
try {
if (!str) return null;
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) base64 += "=";
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
      bytes[i] = binString.charCodeAt(i);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
    return JSON.parse(decodeURIComponent(atob(str)));
} catch (e) {
return null;
}
@@ -78,22 +66,21 @@ function Btn({ children, onClick, variant = "primary", style = {}, disabled = fa
return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...vars[variant], ...style }}>{children}</button>;
}

function Input({ value, onChange, placeholder, style = {}, type = "text", onKeyDown }) {
  return <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
function Input({ value, onChange, placeholder, style = {}, type = "text" }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
style={{ background: "#0a0a10", border: "1px solid #1e2235", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", colorScheme: "dark", ...style }}
    onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#1e2235"}
    onKeyDown={onKeyDown} />;
    onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#1e2235"} />;
}

function Select({ value, onChange, children, style = {} }) {
  return <select value={value || ""} onChange={e => onChange(e.target.value)}
  return <select value={value} onChange={e => onChange(e.target.value)}
style={{ background: "#0a0a10", border: "1px solid #1e2235", borderRadius: 10, padding: "10px 14px", color: value ? "#e2e8f0" : "#475569", fontSize: 14, outline: "none", fontFamily: "inherit", width: "100%", cursor: "pointer", ...style }}>
{children}
</select>;
}

function RatingSelect({ value, onChange }) {
  return <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))}
  return <select value={value} onChange={e => onChange(Number(e.target.value))}
style={{ background: "#0a0a10", border: "1px solid #1e2235", borderRadius: 8, padding: "7px 10px", color: "#e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit", cursor: "pointer", width: "100%" }}>
{RATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
</select>;
@@ -106,11 +93,6 @@ function ProgressBar({ value, max, color = "#6366f1" }) {
</div>;
}

// ─── STYLES (định nghĩa sau components để tránh lỗi thứ tự) ─────────────────────
const lbl = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const filterBtn = { padding: "6px 14px", borderRadius: 20, border: "1px solid #1e2235", background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s" };
const filterActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

// ─── SETUP TAB ────────────────────────────────────────────────────────────────
function SetupTab({ members, setMembers, projectName, setProjectName, leader, setLeader }) {
const [name, setName] = useState("");
@@ -122,6 +104,7 @@ function SetupTab({ members, setMembers, projectName, setProjectName, leader, se
setName(""); setMssv("");
};

  // FIX: cho phép nhấn Enter để thêm thành viên
const handleKeyDown = (e) => {
if (e.key === "Enter") add();
};
@@ -144,9 +127,14 @@ function SetupTab({ members, setMembers, projectName, setProjectName, leader, se
</div>
</div>
<div style={{ marginTop: 20, padding: 16, background: "#0a0a10", borderRadius: 12, fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 Công thức tính điểm hệ thống (Thang 100)</div>
          <div>• Thành viên: <b style={{ color: "#6366f1" }}>Task × 40%</b> + <b style={{ color: "#22c55e" }}>Peer × 40%</b> + <b style={{ color: "#f59e0b" }}>Leader × 20%</b></div>
          <div>• Nhóm trưởng: <b style={{ color: "#6366f1" }}>Task × 40%</b> + <b style={{ color: "#22c55e" }}>Peer × 60%</b></div>
          <div style={{ color: "#a5b4fc", fontWeight: 700, marginBottom: 8 }}>📐 Công thức tính điểm</div>
          {/* FIX: mô tả công thức đúng với logic trong ResultTab */}
          <div>Thành viên = <b style={{ color: "#6366f1" }}>Task × 0.4</b> + <b style={{ color: "#22c55e" }}>Peer × 0.4</b> + <b style={{ color: "#f59e0b" }}>Leader × 0.2</b></div>
          <div style={{ marginTop: 4 }}>Nhóm trưởng = <b style={{ color: "#6366f1" }}>Task × 0.4</b> + <b style={{ color: "#22c55e" }}>Peer × 0.6</b></div>
          <div style={{ marginTop: 8, fontSize: 12 }}>• Task: dựa trên độ phức tạp × % hoàn thành</div>
          <div style={{ fontSize: 12 }}>• Peer: TB điểm đánh giá từ các thành viên khác (thang 10, nhân 10)</div>
          <div style={{ fontSize: 12 }}>• Leader: điểm nhóm trưởng cho theo 3 tiêu chí (thang 10, nhân 10)</div>
          <div style={{ fontSize: 12, color: "#334155", marginTop: 6 }}>* Các thành phần chưa có dữ liệu sẽ không kéo điểm xuống 0</div>
</div>
</Card>

@@ -168,7 +156,7 @@ function SetupTab({ members, setMembers, projectName, setProjectName, leader, se
<div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</div>
{m.mssv && <div style={{ fontSize: 11, color: "#475569" }}>{m.mssv}</div>}
</div>
              {leader === m.id && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
              {leader === String(m.id) && <Tag color="#f59e0b">Trưởng nhóm</Tag>}
<button onClick={() => setMembers(ms => ms.filter(x => x.id !== m.id))} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
</div>
))}
@@ -197,13 +185,12 @@ function TaskTab({ members, tasks, setTasks }) {
};

const filtered = filter === "all" ? tasks : tasks.filter(t => t.assignee === filter);
  

  // FIX: so sánh ngày chính xác — cắt giờ để tránh lệch múi giờ
const overdue = (t) => {
if (!t.deadline || t.status === "done") return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const dl = new Date(t.deadline);
    dl.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = new Date(t.deadline + "T00:00:00");
return dl < today;
};

@@ -216,8 +203,8 @@ function TaskTab({ members, tasks, setTasks }) {
</button>
{members.filter(m => tasks.some(t => t.assignee === m.id)).map(m => (
<button key={m.id} onClick={() => setFilter(filter === m.id ? "all" : m.id)}
              style={{ ...filterBtn, ...(filter === m.id ? { borderColor: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], color: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length] + "18" } : {}) }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length], display: "inline-block" }} />
              style={{ ...filterBtn, ...(filter === m.id ? { borderColor: MEMBER_COLORS[members.indexOf(m) % 16], color: MEMBER_COLORS[members.indexOf(m) % 16], background: MEMBER_COLORS[members.indexOf(m) % 16] + "18" } : {}) }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: MEMBER_COLORS[members.indexOf(m) % 16], display: "inline-block" }} />
{m.name.split(" ").pop()} ({tasks.filter(t => t.assignee === m.id).length})
</button>
))}
@@ -273,7 +260,7 @@ function TaskTab({ members, tasks, setTasks }) {
{filtered.map(t => {
const member = members.find(m => m.id === t.assignee);
const mIdx = member ? members.indexOf(member) : 0;
            const mc = MEMBER_COLORS[mIdx % MEMBER_COLORS.length];
            const mc = MEMBER_COLORS[mIdx % 16];
const sc = STATUS[t.status];
const od = overdue(t);
return (
@@ -294,7 +281,7 @@ function TaskTab({ members, tasks, setTasks }) {
</div>
{t.deadline && (
<div style={{ fontSize: 12, color: od ? "#f87171" : "#475569", marginBottom: 12 }}>
                    {od ? "⚠️ Quá hạn: " : "📅 "}{new Date(t.deadline).toLocaleDateString("vi-VN")}
                    {od ? "⚠️ Quá hạn: " : "📅 "}{new Date(t.deadline + "T00:00:00").toLocaleDateString("vi-VN")}
</div>
)}
<button onClick={() => cycleStatus(t.id)} style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${sc.color}44`, background: sc.color + "18", color: sc.color, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
@@ -330,22 +317,14 @@ function PeerTab({ members, peerScores, setPeerScores }) {
const reviewees = members.filter(m => m.id !== reviewer);
const reviewerMember = members.find(m => m.id === reviewer);

  const completedCount = members.filter(m => {
  // FIX: chỉ tính badge khi có ít nhất 2 thành viên
  const completedCount = members.length < 2 ? 0 : members.filter(m => {
if (!peerScores[m.id]) return false;
return members.filter(x => x.id !== m.id).every(reviewee =>
PEER_CRITERIA.every(c => (peerScores[m.id][reviewee.id]?.[c] ?? 0) > 0)
);
}).length;

  if (members.length < 2) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
        <div style={{ fontSize: 16 }}>Cần ít nhất 2 thành viên để thực hiện đánh giá peer.</div>
      </div>
    );
  }

return (
<div>
<Card style={{ marginBottom: 20 }}>
@@ -357,13 +336,16 @@ function PeerTab({ members, peerScores, setPeerScores }) {
{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
</Select>
</div>
          <div style={{ fontSize: 13, color: "#475569" }}>
            ✅ Đã hoàn thành: <b style={{ color: "#22c55e" }}>{completedCount}</b>/{members.length} thành viên
          </div>
          {/* FIX: chỉ hiện badge khi có >= 2 thành viên */}
          {members.length >= 2 && (
            <div style={{ fontSize: 13, color: "#475569" }}>
              ✅ Đã hoàn thành: <b style={{ color: "#22c55e" }}>{completedCount}</b>/{members.length} thành viên
            </div>
          )}
</div>
{reviewer && (
<div style={{ marginTop: 14, padding: "10px 14px", background: "#1e1b4b", borderRadius: 10, fontSize: 13, color: "#818cf8" }}>
            Chào <b>{reviewerMember?.name}</b>! Hãy đánh giá các thành viên còn lại theo thang điểm bên dưới.
            Chào <b>{reviewerMember?.name}</b>! Hãy đánh giá {reviewees.length} thành viên còn lại theo thang điểm bên dưới.
</div>
)}
</Card>
@@ -376,9 +358,10 @@ function PeerTab({ members, peerScores, setPeerScores }) {
) : (
<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
{reviewees.map((reviewee) => {
            const mc = MEMBER_COLORS[members.indexOf(reviewee) % MEMBER_COLORS.length];
            const mc = MEMBER_COLORS[members.indexOf(reviewee) % 16];
const scores = PEER_CRITERIA.map(c => getScore(reviewee.id, c));
            const rowAvg = avg(scores.filter(s => s > 0));
            const filledScores = scores.filter(s => s > 0);
            const rowAvg = filledScores.length > 0 ? avg(filledScores) : 0;
return (
<Card key={reviewee.id} style={{ borderColor: "#1e2235" }}>
<div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
@@ -428,10 +411,12 @@ function LeaderTab({ members, leader, leaderScores, setLeaderScores }) {
</div>
);

  if (members.length === 0) return (
  const others = members.filter(m => m.id !== leader);

  if (others.length === 0) return (
<div style={{ textAlign: "center", padding: "80px 0", color: "#334155" }}>
<div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
      <div style={{ fontSize: 16 }}>Chưa có thành viên nào trong nhóm.</div>
      <div style={{ fontSize: 16 }}>Nhóm chỉ có nhóm trưởng, chưa có thành viên để đánh giá.</div>
</div>
);

@@ -442,26 +427,24 @@ function LeaderTab({ members, leader, leaderScores, setLeaderScores }) {
<div style={{ fontSize: 28 }}>👑</div>
<div>
<div style={{ fontSize: 15, fontWeight: 700, color: "#fcd34d" }}>Nhóm trưởng: {leaderMember?.name}</div>
            <div style={{ fontSize: 13, color: "#92400e" }}>Đánh giá năng lực trách nhiệm và chấm điểm cho các thành viên.</div>
            <div style={{ fontSize: 13, color: "#92400e" }}>Đánh giá {others.length} thành viên theo 3 tiêu chí.</div>
</div>
</div>
</Card>

<div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {members.map(m => {
          const mc = MEMBER_COLORS[members.indexOf(m) % MEMBER_COLORS.length];
        {others.map(m => {
          const mc = MEMBER_COLORS[members.indexOf(m) % 16];
const scores = LEADER_CRITERIA.map(c => getScore(m.id, c));
          const mAvg = avg(scores.filter(s => s > 0));
          const isLeader = m.id === leader;
          const filledScores = scores.filter(s => s > 0);
          const mAvg = filledScores.length > 0 ? avg(filledScores) : 0;
return (
            <Card key={m.id} style={{ borderColor: isLeader ? "#312e81" : "#1e2235" }}>
            <Card key={m.id}>
<div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
<div style={{ width: 38, height: 38, borderRadius: 9, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: mc, flexShrink: 0 }}>
{m.name.split(" ").pop().charAt(0)}
</div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                  {m.name} {isLeader && <span style={{ color: "#f59e0b", fontSize: 12 }}>(Trưởng nhóm)</span>}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{m.name}</div>
{mAvg > 0 && <Tag color={mAvg >= 8 ? "#22c55e" : mAvg >= 6 ? "#f59e0b" : "#ef4444"}>Điểm TB: {mAvg.toFixed(1)}</Tag>}
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
@@ -483,12 +466,338 @@ function LeaderTab({ members, leader, leaderScores, setLeaderScores }) {
// ─── RESULT TAB ───────────────────────────────────────────────────────────────
function ResultTab({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore }) {
const results = useMemo(() => {
    if (members.length === 0) return [];
    
return members.map(m => {
      // 1. Task Score
      // ── Task Score ─────────────────────────────────────────────────────────
const myTasks = tasks.filter(t => t.assignee === m.id);
      let taskScore = 100;
      if (myTasks.length > 0) {
        const totalPossible = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100, 0);
        const earned = myTasks.reduce
      const totalPossible = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100, 0);
      const earned = myTasks.reduce((s, t) => s + COMPLEXITY[t.complexity].pts * 100 * STATUS[t.status].pct, 0);
      // FIX: nếu không có task → không tính (null) thay vì 0
      const taskScore = totalPossible > 0 ? (earned / totalPossible) * 100 : null;

      // ── Peer Score ─────────────────────────────────────────────────────────
      const receivedScores = [];
      members.forEach(reviewer => {
        if (reviewer.id === m.id) return;
        PEER_CRITERIA.forEach(c => {
          const s = peerScores?.[reviewer.id]?.[m.id]?.[c] ?? 0;
          if (s > 0) receivedScores.push(s);
        });
      });
      // FIX: null nếu chưa có ai đánh giá
      const peerScore = receivedScores.length > 0 ? avg(receivedScores) * 10 : null;

      // ── Leader Score ───────────────────────────────────────────────────────
      const lScores = LEADER_CRITERIA.map(c => leaderScores?.[m.id]?.[c] ?? 0).filter(s => s > 0);
      // FIX: null nếu nhóm trưởng chưa chấm
      const leaderScore = lScores.length > 0 ? avg(lScores) * 10 : null;

      const isLeader = m.id === leader;

      // ── Final Score ────────────────────────────────────────────────────────
      // FIX: chỉ tính trọng số các thành phần đã có dữ liệu, tránh kéo điểm xuống 0
      let finalScore;
      if (isLeader) {
        // Nhóm trưởng: Task 0.4 + Peer 0.6 (không có leader score)
        const parts = [];
        if (taskScore !== null) parts.push({ v: taskScore, w: 0.4 });
        if (peerScore !== null) parts.push({ v: peerScore, w: 0.6 });
        const totalW = parts.reduce((s, p) => s + p.w, 0);
        finalScore = totalW > 0 ? parts.reduce((s, p) => s + p.v * (p.w / totalW), 0) : 0;
      } else {
        // Thành viên: Task 0.4 + Peer 0.4 + Leader 0.2
        const parts = [];
        if (taskScore !== null) parts.push({ v: taskScore, w: 0.4 });
        if (peerScore !== null) parts.push({ v: peerScore, w: 0.4 });
        if (leaderScore !== null) parts.push({ v: leaderScore, w: 0.2 });
        const totalW = parts.reduce((s, p) => s + p.w, 0);
        finalScore = totalW > 0 ? parts.reduce((s, p) => s + p.v * (p.w / totalW), 0) : 0;
      }

      return {
        ...m,
        taskScore: taskScore ?? 0,
        peerScore: peerScore ?? 0,
        leaderScore: leaderScore ?? 0,
        taskHasData: taskScore !== null,
        peerHasData: peerScore !== null,
        leaderHasData: leaderScore !== null,
        finalScore,
        isLeader,
        myTasks: myTasks.length,
        doneTasks: myTasks.filter(t => t.status === "done").length,
      };
    });
  }, [members, tasks, peerScores, leaderScores, leader]);

  const totalScore = results.reduce((s, r) => s + r.finalScore, 0);
  const sorted = [...results].sort((a, b) => b.finalScore - a.finalScore);
  const maxFinal = Math.max(...results.map(r => r.finalScore), 1);
  const teamAvg = results.length > 0 ? avg(results.map(r => r.finalScore)) : 0;
  const ts = parseFloat(teacherScore);
  const hasTeacherScore = !isNaN(ts) && ts >= 0 && ts <= 10;

  // FIX: tránh NaN khi totalScore = 0
  const pctOf = (score) => totalScore > 0 ? (score / totalScore) * 100 : (results.length > 0 ? 100 / results.length : 0);
  const personalGrade = (score) => {
    if (!hasTeacherScore || results.length === 0) return null;
    if (totalScore === 0) return ts / results.length; // chia đều nếu tất cả bằng 0
    return ts * (score / totalScore) * results.length;
  };

  return (
    <div>
      <Card style={{ marginBottom: 24, borderColor: "#1e3a5f", background: "linear-gradient(135deg,#0c1929,#13131a)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ fontSize: 36 }}>🎓</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#93c5fd", marginBottom: 4 }}>Điểm thầy/cô cho nhóm</div>
            <div style={{ fontSize: 13, color: "#475569" }}>Nhập điểm thầy chấm (thang 10) → app tự tính điểm cá nhân theo % đóng góp</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="number" min="0" max="10" step="0.1"
              value={teacherScore}
              onChange={e => setTeacherScore(e.target.value)}
              placeholder="VD: 9"
              style={{ width: 100, background: "#0a0a10", border: "2px solid #1e3a5f", borderRadius: 12, padding: "12px 16px", color: "#93c5fd", fontSize: 22, fontWeight: 800, outline: "none", fontFamily: "'Space Mono',monospace", textAlign: "center", colorScheme: "dark" }}
            />
            <div style={{ fontSize: 13, color: "#334155" }}>/ 10</div>
          </div>
          {hasTeacherScore && (
            <div style={{ background: "#0c2a1a", border: "1px solid #166534", borderRadius: 12, padding: "12px 20px", fontSize: 13, color: "#86efac", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>📐 Công thức:</div>
              <div>Điểm cá nhân = {ts} × (% đóng góp / 100) × {members.length} thành viên</div>
            </div>
          )}
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
          <span>Thành viên</span>
          <span style={{ textAlign: "center" }}>Task</span>
          <span style={{ textAlign: "center" }}>Peer</span>
          <span style={{ textAlign: "center" }}>Leader</span>
          <span style={{ textAlign: "center" }}>Tổng (100)</span>
          <span style={{ textAlign: "center" }}>% Đóng góp</span>
          <span style={{ textAlign: "center" }}>{hasTeacherScore ? "Điểm thực" : "Chờ điểm"}</span>
        </div>

        {sorted.map((r) => {
          const mc = MEMBER_COLORS[members.indexOf(members.find(m => m.id === r.id)) % 16];
          const pct = pctOf(r.finalScore);
          const pg = personalGrade(r.finalScore);
          const pgColor = pg === null ? "#475569" : pg >= 8.5 ? "#22c55e" : pg >= 7 ? "#6366f1" : pg >= 5.5 ? "#f59e0b" : "#ef4444";
          return (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "170px 80px 80px 80px 90px 130px 90px", padding: "14px 24px", borderBottom: "1px solid #0f111a", alignItems: "center", gap: 8, transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "#1a1a24"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: mc + "22", border: `2px solid ${mc}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: mc, flexShrink: 0 }}>
                  {r.name.split(" ").pop().charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{r.name}</div>
                  {/* FIX: hiện "–" khi chưa có task thay vì "0/0 task xong" */}
                  <div style={{ fontSize: 11, color: "#334155" }}>
                    {r.myTasks > 0 ? `${r.doneTasks}/${r.myTasks} task xong` : "Chưa có task"}
                  </div>
                </div>
              </div>

              {/* FIX: hiện "—" khi chưa có dữ liệu thay vì "0" gây hiểu nhầm */}
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: r.taskHasData ? (r.taskScore >= 70 ? "#22c55e" : "#64748b") : "#1e2235" }}>
                {r.taskHasData ? r.taskScore.toFixed(0) : "—"}
              </div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: r.peerHasData ? (r.peerScore >= 70 ? "#22c55e" : "#64748b") : "#1e2235" }}>
                {r.peerHasData ? r.peerScore.toFixed(0) : "—"}
              </div>
              <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono',monospace", color: r.isLeader ? "#334155" : r.leaderHasData ? (r.leaderScore >= 70 ? "#22c55e" : "#64748b") : "#1e2235" }}>
                {r.isLeader ? "–" : r.leaderHasData ? r.leaderScore.toFixed(0) : "—"}
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: "#a5b4fc", marginBottom: 4 }}>{r.finalScore.toFixed(1)}</div>
                <ProgressBar value={r.finalScore} max={maxFinal} color={mc} />
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ background: mc + "18", border: `1px solid ${mc}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block", minWidth: 80 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: mc }}>{pct.toFixed(1)}%</div>
                  <div style={{ fontSize: 10, color: mc + "99" }}>đóng góp</div>
                </div>
              </div>

              <div style={{ textAlign: "center" }}>
                {pg !== null ? (
                  <div style={{ background: pgColor + "18", border: `1px solid ${pgColor}44`, borderRadius: 10, padding: "6px 10px", display: "inline-block", minWidth: 70 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Space Mono',monospace", color: pgColor }}>{pg.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: pgColor + "99" }}>/ 10</div>
                  </div>
                ) : (
                  <span style={{ color: "#1e2235", fontSize: 20 }}>—</span>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ display: "grid", gridTemplateColumns: "170px 80px 80px 80px 90px 130px 90px", padding: "14px 24px", background: "#0a0a10", alignItems: "center", gap: 8, borderTop: "2px solid #1e2235" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>Trung bình nhóm</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>
            {results.some(r => r.taskHasData) ? avg(results.filter(r => r.taskHasData).map(r => r.taskScore)).toFixed(1) : "—"}
          </div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>
            {results.some(r => r.peerHasData) ? avg(results.filter(r => r.peerHasData).map(r => r.peerScore)).toFixed(1) : "—"}
          </div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 12, color: "#6366f1" }}>
            {results.some(r => !r.isLeader && r.leaderHasData) ? avg(results.filter(r => !r.isLeader && r.leaderHasData).map(r => r.leaderScore)).toFixed(1) : "—"}
          </div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: "#a5b4fc" }}>{teamAvg.toFixed(1)}</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 13, color: "#6366f1" }}>100%</div>
          <div style={{ textAlign: "center", fontFamily: "'Space Mono',monospace", fontSize: 14, fontWeight: 800, color: hasTeacherScore ? "#93c5fd" : "#334155" }}>
            {hasTeacherScore ? ts.toFixed(1) : "—"}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const lbl = { fontSize: 11, color: "#475569", display: "block", marginBottom: 6, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" };
const filterBtn = { padding: "6px 14px", borderRadius: 20, border: "1px solid #1e2235", background: "transparent", color: "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6, transition: "all .15s" };
const filterActive = { borderColor: "#6366f1", color: "#a5b4fc", background: "#1e1b4b" };

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

  // FIX: dùng ref để tránh sync URL khi chưa load xong
  const loaded = useRef(false);

  // Load state from URL on first render
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedData = params.get("g");
    if (encodedData) {
      const data = decompressData(encodedData);
      if (data) {
        if (data.projectName) setProjectName(data.projectName);
        if (data.leader) setLeader(data.leader);
        if (data.members) setMembers(data.members);
        if (data.tasks) setTasks(data.tasks);
        if (data.peerScores) setPeerScores(data.peerScores);
        if (data.leaderScores) setLeaderScores(data.leaderScores);
        if (data.teacherScore) setTeacherScore(data.teacherScore);
      }
    }
    loaded.current = true;
  }, []);

  // FIX: chỉ sync URL sau khi đã load xong state từ URL
  // FIX: không ghi URL khi state hoàn toàn rỗng
  useEffect(() => {
    if (!loaded.current) return;
    if (members.length === 0 && !projectName) {
      // Xoá query param nếu không có dữ liệu
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }
    const currentState = { projectName, leader, members, tasks, peerScores, leaderScores, teacherScore };
    const compressed = compressData(currentState);
    if (compressed) {
      const newUrl = `${window.location.origin}${window.location.pathname}?g=${compressed}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, [projectName, leader, members, tasks, peerScores, leaderScores, teacherScore]);

  const generateShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // FIX: badge peer chỉ hiện khi có ít nhất 2 thành viên
  const peerCompletedCount = members.length >= 2 ? members.filter(m => {
    if (!peerScores[m.id]) return false;
    return members.filter(x => x.id !== m.id).every(r => PEER_CRITERIA.every(c => (peerScores[m.id][r.id]?.[c] ?? 0) > 0));
  }).length : null;

  const tabBadge = {
    tasks: tasks.length || null,
    peer: peerCompletedCount !== null ? `${peerCompletedCount}/${members.length}` : null,
    result: null,
  };

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", minHeight: "100vh", background: "#0a0a10", color: "#e2e8f0" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />

      {/* Header */}
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

      {/* Content */}
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
