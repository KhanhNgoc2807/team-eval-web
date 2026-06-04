// Cần cài đặt: npm install firebase
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Firebase config (tạo project miễn phí tại firebase.google.com)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Trong App component
const [groupId] = useState(() => new URLSearchParams(location.search).get('id') || uid());

// Lắng nghe realtime
useEffect(() => {
  const stateRef = ref(db, `teams/${groupId}`);
  onValue(stateRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      if (data.projectName) setProjectName(data.projectName);
      if (data.members) setMembers(data.members);
      if (data.tasks) setTasks(data.tasks);
      // ... cập nhật các state khác
    }
  });
}, [groupId]);

// Ghi lên Firebase khi state thay đổi
useEffect(() => {
  const stateRef = ref(db, `teams/${groupId}`);
  set(stateRef, { projectName, members, tasks, peerScores, leaderScores, leader, teacherScore });
}, [projectName, members, tasks, peerScores, leaderScores, leader, teacherScore, groupId]);
