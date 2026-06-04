import { useState, useMemo, useEffect } from "react";

// Constants
const COMPLEXITY = { 1: { label: "Nhẹ", color: "#22c55e", pts: 1 }, 2: { label: "Trung bình", color: "#f59e0b", pts: 2 }, 3: { label: "Nặng", color: "#ef4444", pts: 3 } };
const STATUS = { todo: { label: "Chưa làm", pct: 0, color: "#64748b" }, doing: { label: "Đang làm", pct: 0.5, color: "#f59e0b" }, done: { label: "Hoàn thành", pct: 1, color: "#22c55e" } };
const PEER_CRITERIA = ["Chất lượng công việc", "Chủ động & Đúng tiến độ", "Tinh thần hợp tác"];
const LEADER_CRITERIA = ["Chủ động & Trách nhiệm", "Chất lượng Output", "Phối hợp Nhóm"];
const MEMBER_COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6","#8b5cf6","#ef4444","#14b8a6"];
const TABS = [
  { id: "setup", icon: "⚙️", label: "Thiết lập" },
  { id: "tasks", icon: "📋", label: "Task Log" },
  { id: "peer", icon: "👥", label: "Peer Review" },
  { id: "leader", icon: "👑", label: "Leader" },
  { id: "result", icon: "🏆", label: "Kết quả" },
];
const uid = () => Math.random().toString(36).substring(2, 9);
const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

// Components
function Btn({ children, onClick, variant = "primary" }) {
  const styles = { primary: { background: "#6366f1", color: "#fff" }, ghost: { background: "transparent", border: "1px solid #333", color: "#ccc" } };
  return <button onClick={onClick} style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", ...styles[variant] }}>{children}</button>;
}

function Card({ children }) {
  return <div style={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 16, padding: 20, marginBottom: 16 }}>{children}</div>;
}

function Input({ value, onChange, placeholder }) {
  return <input value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", padding: 8, background: "#0f0f23", border: "1px solid #333", borderRadius: 8, color: "#fff" }} />;
}

function Select({ value, onChange, children }) {
  return <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: 8, background: "#0f0f23", border: "1px solid #333", borderRadius: 8, color: "#fff" }}>{children}</select>;
}

function RatingSelect({ value, onChange }) {
  return <select value={value ?? 0} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", padding: 6, background: "#0f0f23", border: "1px solid #333", borderRadius: 6, color: "#fff" }}>
    <option value={0}>—</option><option value={2}>2 – Chưa đạt</option><option value={6}>6 – TB</option><option value={8}>8 – Tốt</option><option value={9}>9 – Rất tốt</option><option value={10}>10 – XS</option>
  </select>;
}

// Setup Tab
function SetupTab({ members, setMembers, projectName, setProjectName, leader, setLeader }) {
  const [name, setName] = useState("");
  const add = () => { if (!name.trim()) return; setMembers([...members, { id: uid(), name: name.trim() }]); setName(""); };
  return (<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}><Card><h3>⚙️ THÔNG TIN</h3><Input value={projectName} onChange={setProjectName} placeholder="Tên dự án" /><Select value={leader} onChange={setLeader}><option value="">Chọn nhóm trưởng</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select></Card>
  <Card><h3>👥 THÀNH VIÊN</h3><div style={{ display: "flex", gap: 8 }}><Input value={name} onChange={setName} placeholder="Họ tên" /><Btn onClick={add}>Thêm</Btn></div>{members.map((m, i) => (<div key={m.id} style={{ display: "flex", justifyContent: "space-between", padding: 8, borderBottom: "1px solid #333" }}><span>{m.name}</span><button onClick={() => setMembers(members.filter(x => x.id !== m.id))}>×</button></div>))}</Card></div>);
}

// Task Tab
function TaskTab({ members, tasks, setTasks }) {
  const [form, setForm] = useState({ name: "", assignee: "", complexity: 2 });
  const addTask = () => { if (!form.name || !form.assignee) return; setTasks([...tasks, { id: uid(), ...form, status: "todo" }]); setForm({ name: "", assignee: "", complexity: 2 }); };
  const cycleStatus = (id) => { const order = ["todo", "doing", "done"]; setTasks(tasks.map(t => t.id !== id ? t : { ...t, status: order[(order.indexOf(t.status) + 1) % 3] })); };
  return (<div><Btn onClick={() => setForm({ name: "", assignee: "", complexity: 2 })}>+ Thêm Task</Btn>
  {form.name !== undefined && <Card><Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="Tên task" /><Select value={form.assignee} onChange={v => setForm({ ...form, assignee: v })}><option value="">Giao cho</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select><Btn onClick={addTask}>Lưu</Btn></Card>}
  {tasks.map(t => { const member = members.find(m => m.id === t.assignee); return (<Card key={t.id}><div><b>{t.name}</b> - {member?.name} - LV{t.complexity}</div><button onClick={() => cycleStatus(t.id)}>✅ {STATUS[t.status].label}</button></Card>);})}</div>);
}

// Peer Tab
function PeerTab({ members, peerScores, setPeerScores }) {
  const [reviewer, setReviewer] = useState("");
  const setScore = (reviewee, criterion, val) => { setPeerScores(ps => ({ ...ps, [reviewer]: { ...ps[reviewer], [reviewee]: { ...ps[reviewer]?.[reviewee], [criterion]: val } } })); };
  const getScore = (reviewee, criterion) => peerScores?.[reviewer]?.[reviewee]?.[criterion] ?? 0;
  if (members.length < 2) return <Card>Cần ít nhất 2 thành viên</Card>;
  return (<div><Select value={reviewer} onChange={setReviewer}><option value="">Chọn người đánh giá</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
  {reviewer && members.filter(m => m.id !== reviewer).map(r => (<Card key={r.id}><b>{r.name}</b>{PEER_CRITERIA.map(c => (<div key={c}>{c}: <RatingSelect value={getScore(r.id, c)} onChange={v => setScore(r.id, c, v)} /></div>))}</Card>))}</div>);
}

// Leader Tab
function LeaderTab({ members, leader, leaderScores, setLeaderScores }) {
  const setScore = (memberId, criterion, val) => { setLeaderScores(ls => ({ ...ls, [memberId]: { ...ls[memberId], [criterion]: val } })); };
  const getScore = (memberId, criterion) => leaderScores?.[memberId]?.[criterion] ?? 0;
  if (!leader) return <Card>Chưa chọn nhóm trưởng</Card>;
  return (<div>{members.map(m => (<Card key={m.id}><b>{m.name}</b>{LEADER_CRITERIA.map(c => (<div key={c}>{c}: <RatingSelect value={getScore(m.id, c)} onChange={v => setScore(m.id, c, v)} /></div>))}</Card>))}</div>);
}

// Result Tab
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
    return { ...m, taskScore, peerScore, finalScore, isLeader };
  }), [members, tasks, peerScores, leaderScores, leader]);
  return (<div><Card><h3>🎓 Điểm thầy cô</h3><Input value={teacherScore} onChange={setTeacherScore} placeholder="Điểm (0-10)" /></Card>
  {results.map(r => (<Card key={r.id}><b>{r.name}</b> | Task: {r.taskScore.toFixed(0)} | Peer: {r.peerScore.toFixed(0)} | Tổng: {r.finalScore.toFixed(1)}</Card>))}</div>);
}

// Main App
export default function App() {
  const [tab, setTab] = useState("setup");
  const [projectName, setProjectName] = useState("");
  const [leader, setLeader] = useState("");
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [peerScores, setPeerScores] = useState({});
  const [leaderScores, setLeaderScores] = useState({});
  const [teacherScore, setTeacherScore] = useState("");

  return (<div style={{ fontFamily: "sans-serif", minHeight: "100vh", background: "#0a0a0f", color: "#fff", padding: 20 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>{TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 20px", background: tab === t.id ? "#6366f1" : "#1a1a2e", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" }}>{t.icon} {t.label}</button>))}</div>
  {tab === "setup" && <SetupTab members={members} setMembers={setMembers} projectName={projectName} setProjectName={setProjectName} leader={leader} setLeader={setLeader} />}
  {tab === "tasks" && <TaskTab members={members} tasks={tasks} setTasks={setTasks} />}
  {tab === "peer" && <PeerTab members={members} peerScores={peerScores} setPeerScores={setPeerScores} />}
  {tab === "leader" && <LeaderTab members={members} leader={leader} leaderScores={leaderScores} setLeaderScores={setLeaderScores} />}
  {tab === "result" && <ResultTab members={members} tasks={tasks} peerScores={peerScores} leaderScores={leaderScores} leader={leader} teacherScore={teacherScore} setTeacherScore={setTeacherScore} />}
  </div>);
}
