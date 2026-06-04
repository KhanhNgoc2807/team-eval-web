// Tự động đồng bộ khi URL thay đổi (không cần F5)
useEffect(() => {
  const handlePopState = () => {
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
  };
  
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
