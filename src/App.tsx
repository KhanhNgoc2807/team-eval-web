import { useState, useEffect, useCallback } from "react";
import { database, ref, set, get, onValue } from "./firebase";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PEER_CRITERIA = ["Chất lượng công việc", "Chủ động & Đúng tiến độ", "Tinh thần hợp tác"];
const uid = () => Math.random().toString(36).substring(2, 9);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || uid();
  });
  const [members, setMembers] = useState<any[]>([]);
  const [peerScores, setPeerScores] = useState<any>({});
  const [isReady, setIsReady] = useState(false);
  
  // State cho đánh giá
  const [reviewer, setReviewer] = useState("");
  const [tempScores, setTempScores] = useState<any>({});

  // Cập nhật URL
  useEffect(() => {
    const newUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    window.history.replaceState(null, "", newUrl);
  }, [roomId]);

  // Load dữ liệu từ Firebase realtime
  useEffect(() => {
    if (!roomId) return;
    
    const dbRef = ref(database, `teams/${roomId}`);
    
    // Lắng nghe realtime
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log("📥 Loaded from Firebase:", data);
        if (data.members) setMembers(data.members);
        if (data.peerScores) setPeerScores(data.peerScores);
      }
      setIsReady(true);
    });
    
    return () => unsubscribe();
  }, [roomId]);

  // Lưu lên Firebase khi có thay đổi
  useEffect(() => {
    if (!isReady) return;
    
    const saveData = async () => {
      const dbRef = ref(database, `teams/${roomId}`);
      await set(dbRef, { members, peerScores });
      console.log("💾 Saved to Firebase");
    };
    
    saveData();
  }, [members, peerScores, roomId, isReady]);

  // Tạo nhóm mới
  const createNewGroup = () => {
    const newRoomId = uid();
    setRoomId(newRoomId);
    setMembers([]);
    setPeerScores({});
  };

  // Gửi link
  const generateShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard.writeText(shareUrl);
    alert("✅ Đã copy link!");
  };

  // Thêm thành viên
  const addMember = (name: string) => {
    const newMember = { id: uid(), name };
    setMembers([...members, newMember]);
  };

  // Xóa thành viên
  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  // Đánh giá đồng đội
  const submitReview = () => {
    const reviewees = members.filter(m => m.id !== reviewer);
    
    // Kiểm tra đã đánh giá hết chưa
    let allFilled = true;
    reviewees.forEach(reviewee => {
      PEER_CRITERIA.forEach(c => {
        if (!tempScores[reviewee.id]?.[c]) allFilled = false;
      });
    });
    
    if (!allFilled) {
      alert("Vui lòng đánh giá đầy đủ tất cả các tiêu chí!");
      return;
    }
    
    const newScores = { ...peerScores };
    reviewees.forEach(reviewee => {
      PEER_CRITERIA.forEach(criterion => {
        const score = tempScores[reviewee.id]?.[criterion];
        if (score) {
          if (!newScores[reviewee.id]) newScores[reviewee.id] = {};
          if (!newScores[reviewee.id][criterion]) newScores[reviewee.id][criterion] = [];
          newScores[reviewee.id][criterion].push(score);
        }
      });
    });
    
    // Đánh dấu reviewer đã hoàn thành (ẩn danh - không lưu tên)
    setPeerScores(newScores);
    setReviewer("");
    setTempScores({});
    alert("✅ Đã gửi đánh giá ẩn danh!");
  };

  // Hiển thị kết quả (ẩn danh - chỉ hiện điểm trung bình)
  const getAverageScore = (memberId: string) => {
    const scores = peerScores[memberId];
    if (!scores) return null;
    
    let allScores: number[] = [];
    PEER_CRITERIA.forEach(c => {
      if (scores[c]) allScores = [...allScores, ...scores[c]];
    });
    
    if (allScores.length === 0) return null;
    const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    return (avg / 10) * 10; // Chuyển về thang 10
  };

  if (!isReady) {
    return <div style={{ textAlign: "center", padding: 50 }}>Đang tải...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1>🏆 TEAM EVAL</h1>
      <p>Link chia sẻ: <code>{window.location.href}</code></p>
      <button onClick={generateShareLink}>🔗 Copy link</button>
      <button onClick={createNewGroup}>🔄 Tạo nhóm mới</button>
      
      <hr />
      
      <h2>👥 Thành viên</h2>
      <div>
        <input 
          id="memberName" 
          placeholder="Tên thành viên"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addMember((e.target as HTMLInputElement).value);
              (e.target as HTMLInputElement).value = "";
            }
          }}
        />
        <button onClick={() => {
          const input = document.getElementById("memberName") as HTMLInputElement;
          if (input.value) addMember(input.value);
          input.value = "";
        }}>➕ Thêm</button>
      </div>
      {members.map(m => (
        <div key={m.id}>
          <span>{m.name}</span>
          <button onClick={() => removeMember(m.id)}>🗑️ Xóa</button>
        </div>
      ))}
      
      <hr />
      
      <h2>👤 Đánh giá đồng đội (ẩn danh)</h2>
      {members.length >= 2 ? (
        <>
          <select value={reviewer} onChange={e => setReviewer(e.target.value)}>
            <option value="">Chọn tên của bạn...</option>
            {members.map(m => (
              <option key={m.id} value={m.id} disabled={peerScores[m.id]?.completed}>
                {m.name} {peerScores[m.id]?.completed ? "(✅ Đã đánh giá)" : ""}
              </option>
            ))}
          </select>
          
          {reviewer && !peerScores[reviewer]?.completed && (
            <div>
              {members.filter(m => m.id !== reviewer).map(reviewee => (
                <div key={reviewee.id} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
                  <h3>Đánh giá: {reviewee.name}</h3>
                  {PEER_CRITERIA.map(c => (
                    <div key={c}>
                      <label>{c}: </label>
                      <select 
                        value={tempScores[reviewee.id]?.[c] || 0}
                        onChange={e => setTempScores({
                          ...tempScores,
                          [reviewee.id]: { ...tempScores[reviewee.id], [c]: Number(e.target.value) }
                        })}
                      >
                        <option value={0}>—</option>
                        <option value={2}>2 - Chưa đạt</option>
                        <option value={6}>6 - Trung bình</option>
                        <option value={8}>8 - Tốt</option>
                        <option value={9}>9 - Rất tốt</option>
                        <option value={10}>10 - Xuất sắc</option>
                      </select>
                    </div>
                  ))}
                </div>
              ))}
              <button onClick={submitReview}>📤 Gửi đánh giá (ẩn danh)</button>
            </div>
          )}
        </>
      ) : (
        <p>Thêm ít nhất 2 thành viên để bắt đầu đánh giá</p>
      )}
      
      <hr />
      
      <h2>📊 Kết quả đánh giá (ẩn danh)</h2>
      <table border={1} style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Thành viên</th>
            <th>Điểm TB</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => {
            const score = getAverageScore(m.id);
            return (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{score !== null ? score.toFixed(1) : "Chưa có đánh giá"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
