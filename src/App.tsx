// ─── RESULT TAB (ĐÃ THÊM KHÓA CHO ĐẾN KHI TẤT CẢ ĐÁNH GIÁ XONG) ─────────────────
function ResultTab({ members, tasks, peerScores, leaderScores, leader, teacherScore, setTeacherScore, theme }: any) {
  const styles = themeStyles[theme];
  
  // Đếm số người đã đánh giá
  const completedReviewers = Object.keys(peerScores).filter(
    (key) => peerScores[key]?.completed === true
  ).length;

  // Nếu chưa đủ số lượng thành viên, hiển thị thông báo khóa
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
