<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>TeamFlow v2</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
<style>
  :root {
    --bg:#ffffff;--surface:#ffffff;--surface2:#f8f8f8;--surface3:#f2f2f0;
    --border:#ebebeb;--border2:#d9d9d9;
    --text:#1a1916;--text2:#6b6860;--text3:#9c9a94;
    --indigo:#4338ca;--blue:#1d4ed8;--green:#059669;--amber:#d97706;--red:#dc2626;--purple:#7c3aed;
    --shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04);
    --shadow2:0 2px 8px rgba(0,0,0,.08),0 8px 32px rgba(0,0,0,.06);
    --r:14px;--r2:10px;--r3:8px;
    --font:'Sora',sans-serif;--mono:'JetBrains Mono',monospace;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:100%;font-family:var(--font);background:var(--bg);color:var(--text);font-size:14px;-webkit-font-smoothing:antialiased;}
  ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
  input,select,button,textarea{font-family:var(--font);}
  .app{display:flex;height:100vh;overflow:hidden;}
  .sidebar{width:220px;background:#ffffff;border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;}
  .main{flex:1;overflow-y:auto;display:flex;flex-direction:column;background:#ffffff;}
  .logo{padding:20px 20px 16px;border-bottom:1px solid var(--border);}
  .logo-mark{display:flex;align-items:center;gap:10px;}
  .logo-icon{width:32px;height:32px;background:var(--text);border-radius:9px;display:flex;align-items:center;justify-content:center;}
  .logo-icon svg{width:16px;height:16px;fill:white;}
  .logo-name{font-size:15px;font-weight:700;letter-spacing:-.3px;}
  .logo-sub{font-size:10px;color:var(--text3);letter-spacing:.5px;margin-top:1px;}
  .sidebar-nav{padding:12px 10px;flex:1;}
  .nav-section{margin-bottom:20px;}
  .nav-label{font-size:10px;font-weight:600;letter-spacing:1px;color:var(--text3);text-transform:uppercase;padding:0 10px 6px;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:var(--r3);cursor:pointer;transition:all .15s;border:none;background:none;width:100%;text-align:left;color:var(--text2);font-size:13px;font-weight:500;}
  .nav-item:hover{background:var(--surface3);color:var(--text);}
  .nav-item.active{background:var(--text);color:white;}
  .nav-icon{font-size:15px;width:20px;text-align:center;}
  .nav-badge{margin-left:auto;background:var(--red);color:white;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700;}
  .sidebar-project{padding:12px 16px;border-top:1px solid var(--border);}
  .project-pill{background:var(--surface3);border-radius:10px;padding:10px 12px;border:1px solid var(--border);}
  .project-label{font-size:10px;color:var(--text3);font-weight:600;letter-spacing:.5px;margin-bottom:4px;}
  .project-name{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .share-btn{margin-top:8px;width:100%;padding:7px;background:var(--text);color:white;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;transition:opacity .15s;}
  .share-btn:hover{opacity:.8;}
  .topbar{padding:16px 28px;border-bottom:1px solid var(--border);background:#ffffff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.3px;}
  .page-sub{font-size:12px;color:var(--text3);margin-top:1px;}
  .topbar-actions{display:flex;align-items:center;gap:10px;}
  .content{padding:24px 28px;flex:1;}
  .card{background:#ffffff;border:1px solid var(--border);border-radius:var(--r);padding:20px;}
  .card-ghost{background:var(--surface2);border:1px solid var(--border);border-radius:var(--r2);padding:16px;}
  .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;}
  .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
  .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--r3);border:none;cursor:pointer;font-size:13px;font-weight:600;transition:all .15s;}
  .btn-primary{background:var(--text);color:white;}.btn-primary:hover{opacity:.85;}
  .btn-ghost{background:transparent;border:1px solid var(--border2);color:var(--text2);}.btn-ghost:hover{background:var(--surface3);color:var(--text);}
  .btn-sm{padding:5px 12px;font-size:12px;}
  .btn-danger{background:#fef2f2;border:1px solid #fecaca;color:var(--red);}
  .btn-success{background:#f0fdf4;border:1px solid #bbf7d0;color:var(--green);}
  .input{width:100%;padding:9px 12px;background:#ffffff;border:1px solid var(--border2);border-radius:var(--r3);font-size:13px;color:var(--text);outline:none;transition:border-color .15s;}
  .input:focus{border-color:var(--text);}.input::placeholder{color:var(--text3);}
  select.input{cursor:pointer;}textarea.input{resize:vertical;min-height:80px;}
  .form-group{display:flex;flex-direction:column;gap:5px;}
  .form-label{font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;}
  .tag{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:5px;font-size:11px;font-weight:600;}
  .tag-blue{background:#eff6ff;color:var(--blue);border:1px solid #bfdbfe;}
  .tag-green{background:#f0fdf4;color:var(--green);border:1px solid #bbf7d0;}
  .tag-amber{background:#fffbeb;color:var(--amber);border:1px solid #fde68a;}
  .tag-red{background:#fef2f2;color:var(--red);border:1px solid #fecaca;}
  .tag-gray{background:var(--surface3);color:var(--text2);border:1px solid var(--border);}
  .stat-card{background:#ffffff;border:1px solid var(--border);border-radius:var(--r);padding:18px 20px;}
  .stat-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;margin-bottom:12px;}
  .stat-value{font-size:28px;font-weight:800;font-family:var(--mono);letter-spacing:-1px;}
  .stat-label{font-size:11px;color:var(--text3);font-weight:500;margin-top:3px;}
  .stat-change{font-size:11px;margin-top:6px;font-weight:600;}.stat-change.up{color:var(--green);}.stat-change.down{color:var(--red);}
  .progress-track{height:6px;background:var(--surface3);border-radius:3px;overflow:hidden;}
  .progress-fill{height:100%;border-radius:3px;transition:width .5s ease;}
  .avatar{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;}
  .avatar-sm{width:26px;height:26px;border-radius:7px;font-size:11px;}
  .avatar-lg{width:42px;height:42px;border-radius:12px;font-size:15px;}
  .member-chip{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;}
  .sub-tabs{display:flex;gap:2px;background:var(--surface3);border-radius:10px;padding:3px;margin-bottom:20px;width:fit-content;}
  .sub-tab{padding:6px 16px;border-radius:8px;border:none;background:none;font-size:12px;font-weight:600;color:var(--text3);cursor:pointer;transition:all .15s;}
  .sub-tab.active{background:#ffffff;color:var(--text);box-shadow:var(--shadow);}
  .task-card{background:#ffffff;border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;transition:box-shadow .15s,border-color .15s;cursor:pointer;}
  .task-card:hover{box-shadow:var(--shadow);border-color:var(--border2);}
  .task-card.done{opacity:.65;}.task-card.overdue{border-color:#fecaca;background:#fef2f2;}
  .status-todo{background:var(--surface3);color:var(--text2);border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;border:1px solid var(--border);}
  .status-doing{background:#fffbeb;color:var(--amber);border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;border:1px solid #fde68a;}
  .status-done{background:#f0fdf4;color:var(--green);border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;border:1px solid #bbf7d0;}
  .chip-filter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;}
  .chip{padding:5px 12px;border-radius:20px;border:1px solid var(--border2);background:#ffffff;color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;}
  .chip:hover{border-color:var(--text);color:var(--text);}.chip.active{background:var(--text);color:white;border-color:var(--text);}
  .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:var(--text3);gap:12px;}
  .empty-icon{font-size:40px;opacity:.4;}.empty-text{font-size:13px;font-weight:500;}
  .comment{display:flex;gap:10px;margin-bottom:12px;}
  .comment-body{flex:1;background:var(--surface2);border-radius:10px;padding:10px 13px;border:1px solid var(--border);}
  .comment-author{font-size:11px;font-weight:700;}.comment-time{font-size:10px;color:var(--text3);margin-left:8px;}
  .comment-text{font-size:12.5px;color:var(--text2);margin-top:3px;line-height:1.5;}
  .ai-panel{position:fixed;right:24px;bottom:24px;width:360px;background:#ffffff;border:1px solid var(--border);border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.12);display:flex;flex-direction:column;overflow:hidden;z-index:500;transition:all .3s cubic-bezier(.34,1.56,.64,1);}
  .ai-panel.collapsed{height:52px;}.ai-panel.expanded{height:480px;}
  .ai-header{padding:14px 16px;background:var(--text);color:white;display:flex;align-items:center;gap:10px;cursor:pointer;flex-shrink:0;}
  .ai-dot{width:8px;height:8px;background:#4ade80;border-radius:50%;animation:pulse 2s infinite;}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
  .ai-messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;}
  .ai-msg{padding:10px 13px;border-radius:12px;font-size:12.5px;line-height:1.55;max-width:90%;}
  .ai-msg.bot{background:var(--surface2);border:1px solid var(--border);align-self:flex-start;border-bottom-left-radius:4px;}
  .ai-msg.user{background:var(--text);color:white;align-self:flex-end;border-bottom-right-radius:4px;}
  .ai-input-row{padding:10px 12px;border-top:1px solid var(--border);display:flex;gap:8px;}
  .ai-input{flex:1;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;font-size:12px;outline:none;}
  .ai-send{padding:8px 14px;background:var(--text);color:white;border:none;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;}
  .rating-select{width:100%;padding:7px 10px;background:#ffffff;border:1px solid var(--border2);border-radius:8px;font-size:12px;outline:none;cursor:pointer;}
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);}
  .modal{background:#ffffff;border-radius:20px;padding:28px;max-width:520px;width:92%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);}
  .modal-title{font-size:17px;font-weight:700;margin-bottom:18px;}
  .calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;}
  .cal-day-header{text-align:center;font-size:10px;font-weight:600;color:var(--text3);padding:4px;text-transform:uppercase;letter-spacing:.5px;}
  .cal-day{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;font-size:12px;cursor:pointer;transition:all .15s;border:1px solid transparent;position:relative;}
  .cal-day:hover{background:var(--surface3);}.cal-day.today{background:var(--text);color:white;font-weight:700;}
  .cal-day.has-event::after{content:'';position:absolute;bottom:3px;width:4px;height:4px;border-radius:2px;background:var(--blue);}
  .cal-day.has-deadline::after{background:var(--red);}
  .cal-day.today.has-event::after,.cal-day.today.has-deadline::after{background:white;}
  .cal-day.selected{border-color:var(--text);background:var(--surface3);}
  .time-slot{padding:8px 12px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid var(--border);background:#ffffff;cursor:pointer;transition:all .15s;text-align:center;}
  .time-slot.free{background:#f0fdf4;border-color:#bbf7d0;color:var(--green);}
  .time-slot.busy{background:#fef2f2;border-color:#fecaca;color:var(--red);}
  .table{width:100%;border-collapse:collapse;}
  .table th{text-align:left;font-size:10px;font-weight:700;color:var(--text3);letter-spacing:.8px;text-transform:uppercase;padding:10px 14px;border-bottom:1px solid var(--border);}
  .table td{padding:12px 14px;border-bottom:1px solid var(--border);font-size:13px;}
  .table tr:last-child td{border-bottom:none;}.table tr:hover td{background:var(--surface2);}
  .divider{height:1px;background:var(--border);margin:16px 0;}
  .divider-label{display:flex;align-items:center;gap:10px;color:var(--text3);font-size:11px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;}
  .divider-label::before,.divider-label::after{content:'';flex:1;height:1px;background:var(--border);}
  .toast{position:fixed;top:20px;right:24px;background:var(--text);color:white;padding:12px 18px;border-radius:12px;font-size:13px;font-weight:500;z-index:2000;animation:slideIn .3s ease;}
  @keyframes slideIn{from{transform:translateY(-20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
  .onboard-screen{height:100vh;display:flex;align-items:center;justify-content:center;background:#ffffff;}
  .onboard-card{background:#ffffff;border:1px solid var(--border);border-radius:24px;padding:48px;max-width:440px;width:92%;box-shadow:var(--shadow2);text-align:center;}

  /* ===== AVAILABILITY FEATURE ===== */
  .avail-grid{display:grid;gap:12px;}
  .avail-member-row{background:#ffffff;border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;}
  .avail-member-header{display:flex;align-items:center;gap:10px;margin-bottom:12px;}
  .avail-slots-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;}
  .avail-day-col{display:flex;flex-direction:column;gap:4px;}
  .avail-day-label{font-size:9px;font-weight:700;color:var(--text3);text-align:center;letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px;}
  .avail-slot{padding:4px 2px;border-radius:5px;font-size:9px;font-weight:600;text-align:center;cursor:pointer;border:1px solid var(--border);background:#ffffff;color:var(--text3);transition:all .12s;user-select:none;}
  .avail-slot.free{background:#f0fdf4;border-color:#86efac;color:#15803d;}
  .avail-slot.busy{background:#fef2f2;border-color:#fca5a5;color:#b91c1c;}
  .avail-slot:hover{transform:scale(1.05);}
  .overlap-heatmap{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:12px;}
  .overlap-col{display:flex;flex-direction:column;gap:4px;}
  .overlap-day-label{font-size:9px;font-weight:700;color:var(--text3);text-align:center;letter-spacing:.5px;text-transform:uppercase;margin-bottom:2px;}
  .overlap-cell{padding:5px 2px;border-radius:6px;font-size:9px;font-weight:700;text-align:center;border:1px solid transparent;}
  .suggest-meeting-banner{background:linear-gradient(135deg,#1a1916 0%,#3a3a35 100%);color:white;border-radius:var(--r);padding:20px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;}
  .suggest-banner-left{flex:1;}
  .suggest-banner-title{font-size:14px;font-weight:700;margin-bottom:4px;}
  .suggest-banner-sub{font-size:12px;opacity:.7;}
  .avail-legend{display:flex;gap:12px;align-items:center;font-size:11px;color:var(--text2);}
  .avail-legend-dot{width:10px;height:10px;border-radius:3px;}
  .meeting-card{background:#ffffff;border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;margin-bottom:10px;}
  .meeting-card-header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;}
  .meeting-title{font-size:14px;font-weight:600;margin-bottom:4px;}
  .meeting-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .meeting-attendees{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;}
  .week-nav{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
  .week-nav-btn{padding:5px 10px;border-radius:7px;border:1px solid var(--border2);background:#ffffff;cursor:pointer;font-size:13px;transition:all .15s;}
  .week-nav-btn:hover{background:var(--surface3);}
  .week-label{font-size:13px;font-weight:600;color:var(--text);}
</style>
</head>
<body>
<div id="root"></div>
<script type="module">
import { useState, useMemo, useEffect, useRef, useCallback } from 'https://esm.sh/react@18';
import { createRoot } from 'https://esm.sh/react-dom@18/client';
const h = React.createElement;

const COMPLEXITY={1:{label:"Nhẹ",color:"var(--green)",pts:1},2:{label:"Trung bình",color:"var(--amber)",pts:2},3:{label:"Nặng",color:"var(--red)",pts:3}};
const STATUS={todo:{label:"Todo",pct:0},doing:{label:"Đang làm",pct:0.5},done:{label:"Hoàn thành",pct:1}};
const PEER_CRITERIA=["Chất lượng công việc","Chủ động & Đúng tiến độ","Tinh thần hợp tác"];
const LEADER_CRITERIA=["Chủ động & Trách nhiệm","Chất lượng Output","Phối hợp Nhóm"];
const RATING_OPTIONS=[{value:0,label:"--"},{value:2,label:"2 - Chưa đạt"},{value:6,label:"6 - Trung bình"},{value:8,label:"8 - Tốt"},{value:9,label:"9 - Rất tốt"},{value:10,label:"10 - Xuất sắc"}];
const MEMBER_COLORS=["#4338ca","#0369a1","#059669","#d97706","#dc2626","#7c3aed","#0891b2","#be185d","#16a34a","#b45309","#6366f1","#0284c7"];
const WEEK_DAYS=["T2","T3","T4","T5","T6","T7","CN"];
const TIME_SLOTS=["8:00","9:00","10:00","11:00","13:00","14:00","15:00","16:00","17:00"];
const uid=()=>Math.random().toString(36).substring(2,9);
const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;

const PAGES=[
  {id:"dashboard",icon:"📊",label:"Dashboard"},
  {id:"setup",icon:"⚙️",label:"Thiết lập"},
  {id:"tasks",icon:"✅",label:"Task Log"},
  {id:"analytics",icon:"📈",label:"Analytics"},
  {id:"availability",icon:"📅",label:"Lịch rảnh"},
  {id:"calendar",icon:"🗓️",label:"Lịch & Họp"},
  {id:"peer",icon:"🤝",label:"Peer Review"},
  {id:"leader",icon:"👑",label:"Leader"},
  {id:"result",icon:"🏆",label:"Kết quả"},
];

// ---- Small components ----
function Tag({color,children}){
  const cls=color==="green"?"tag-green":color==="amber"?"tag-amber":color==="red"?"tag-red":color==="blue"?"tag-blue":"tag-gray";
  return h("span",{className:`tag ${cls}`},children);
}
function Avatar({name,idx,size="",color}){
  const mc=color||MEMBER_COLORS[(idx||0)%MEMBER_COLORS.length];
  const letter=name?.split(" ").pop()?.charAt(0)||"?";
  return h("div",{className:`avatar ${size}`,style:{background:mc+"18",color:mc,border:`1.5px solid ${mc}33`}},letter);
}
function Progress({value,max,color="var(--indigo)"}){
  const pct=max>0?Math.min((value/max)*100,100):0;
  return h("div",{className:"progress-track"},h("div",{className:"progress-fill",style:{width:`${pct}%`,background:color}}));
}
function RatingSelect({value,onChange}){
  return h("select",{className:"rating-select",value:value??0,onChange:e=>onChange(Number(e.target.value))},
    RATING_OPTIONS.map(o=>h("option",{key:o.value,value:o.value},o.label)));
}
function Toast({msg,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2200);return()=>clearTimeout(t);},[]);
  return h("div",{className:"toast"},msg);
}

// ---- Availability Page ----
// availability[memberId][weekOffset][dayIdx][slotIdx] = "free"|"busy"|undefined
function AvailabilityPage({members,availability,setAvailability,meetings,setMeetings}){
  const [weekOffset,setWeekOffset]=useState(0);
  const [showMeetingModal,setShowMeetingModal]=useState(false);
  const [meetingForm,setMeetingForm]=useState({title:"",day:"",slot:"",duration:"60",attendees:[]});
  const [toast,setToast]=useState(null);
  const [activeTab,setActiveTab]=useState("avail"); // avail | meetings | suggest

  const weekKey=`w${weekOffset}`;

  // Get week date range label
  const weekLabel=useMemo(()=>{
    const now=new Date();
    const mon=new Date(now);
    mon.setDate(now.getDate()-now.getDay()+1+weekOffset*7);
    const sun=new Date(mon);sun.setDate(mon.getDate()+6);
    const fmt=d=>`${d.getDate()}/${d.getMonth()+1}`;
    return `${fmt(mon)} – ${fmt(sun)}`;
  },[weekOffset]);

  function toggleSlot(memberId,dayIdx,slotIdx){
    setAvailability(prev=>{
      const next={...prev};
      if(!next[memberId])next[memberId]={};
      if(!next[memberId][weekKey])next[memberId][weekKey]={};
      if(!next[memberId][weekKey][dayIdx])next[memberId][weekKey][dayIdx]={};
      const cur=next[memberId][weekKey][dayIdx][slotIdx];
      next[memberId][weekKey][dayIdx][slotIdx]=cur==="free"?"busy":cur==="busy"?undefined:"free";
      return next;
    });
  }

  function getSlot(memberId,dayIdx,slotIdx){
    return availability?.[memberId]?.[weekKey]?.[dayIdx]?.[slotIdx];
  }

  // Overlap: count how many members are free for each slot
  const overlapMatrix=useMemo(()=>{
    const matrix=[];
    for(let d=0;d<7;d++){
      const col=[];
      for(let s=0;s<TIME_SLOTS.length;s++){
        let count=0;
        const freeMembers=[];
        members.forEach(m=>{
          if(getSlot(m.id,d,s)==="free"){count++;freeMembers.push(m);}
        });
        col.push({count,freeMembers,total:members.length});
      }
      matrix.push(col);
    }
    return matrix;
  },[members,availability,weekOffset,weekKey]);

  // Best suggested slots = highest overlap
  const suggestedSlots=useMemo(()=>{
    const flat=[];
    for(let d=0;d<7;d++){
      for(let s=0;s<TIME_SLOTS.length;s++){
        const {count,freeMembers}=overlapMatrix[d][s];
        if(count>0)flat.push({dayIdx:d,slotIdx:s,count,freeMembers});
      }
    }
    return flat.sort((a,b)=>b.count-a.count).slice(0,5);
  },[overlapMatrix]);

  function overlapColor(count,total){
    if(total===0)return{bg:"#f8f8f8",border:"#ebebeb",text:"#9c9a94"};
    const pct=count/total;
    if(pct===0)return{bg:"#ffffff",border:"#ebebeb",text:"#9c9a94"};
    if(pct<0.4)return{bg:"#fff7ed",border:"#fed7aa",text:"#c2410c"};
    if(pct<0.7)return{bg:"#fefce8",border:"#fde047",text:"#854d0e"};
    if(pct<1)return{bg:"#f0fdf4",border:"#86efac",text:"#15803d"};
    return{bg:"#dcfce7",border:"#4ade80",text:"#166534"};
  }

  function saveMeeting(){
    if(!meetingForm.title||meetingForm.day===""||meetingForm.slot===""){setToast("Vui lòng điền đầy đủ thông tin!");return;}
    setMeetings(prev=>[...prev,{id:uid(),...meetingForm,weekKey,createdAt:new Date().toISOString()}]);
    setShowMeetingModal(false);
    setMeetingForm({title:"",day:"",slot:"",duration:"60",attendees:[]});
    setToast("Đã tạo lịch họp! 📅");
  }

  function deleteMeeting(id){setMeetings(prev=>prev.filter(m=>m.id!==id));}

  const thisWeekMeetings=meetings.filter(m=>m.weekKey===weekKey);

  return h("div",null,
    toast&&h(Toast,{msg:toast,onDone:()=>setToast(null)}),
    h("div",{className:"topbar"},
      h("div",null,
        h("div",{className:"page-title"},"📅 Lịch rảnh & Họp nhóm"),
        h("div",{className:"page-sub"},"Ghi nhận lịch rảnh thành viên & tìm giờ họp phù hợp")
      ),
      h("div",{className:"topbar-actions"},
        h("button",{className:"btn btn-primary",onClick:()=>setShowMeetingModal(true)},"+ Tạo lịch họp")
      )
    ),
    h("div",{className:"content"},
      // Sub tabs
      h("div",{className:"sub-tabs"},
        h("button",{className:`sub-tab ${activeTab==="avail"?"active":""}`,onClick:()=>setActiveTab("avail")},"📋 Lịch rảnh"),
        h("button",{className:`sub-tab ${activeTab==="suggest"?"active":""}`,onClick:()=>setActiveTab("suggest")},"✨ Gợi ý giờ họp"),
        h("button",{className:`sub-tab ${activeTab==="meetings"?"active":""}`,onClick:()=>setActiveTab("meetings")},`🗓️ Lịch họp (${thisWeekMeetings.length})`)
      ),

      // Week nav
      h("div",{className:"week-nav"},
        h("button",{className:"week-nav-btn",onClick:()=>setWeekOffset(w=>w-1)},"← Tuần trước"),
        h("span",{className:"week-label"},`Tuần ${weekLabel}`),
        h("button",{className:"week-nav-btn",onClick:()=>setWeekOffset(w=>w+1)},"Tuần sau →"),
        weekOffset!==0&&h("button",{className:"week-nav-btn",onClick:()=>setWeekOffset(0),style:{marginLeft:4,fontSize:11}},"Hôm nay")
      ),

      activeTab==="avail"&&h("div",null,
        // Legend
        h("div",{className:"avail-legend",style:{marginBottom:14}},
          h("div",{style:{display:"flex",alignItems:"center",gap:5}},[
            h("div",{key:"f",className:"avail-legend-dot",style:{background:"#f0fdf4",border:"1px solid #86efac"}}),
            h("span",{key:"fl"},"Rảnh")
          ]),
          h("div",{style:{display:"flex",alignItems:"center",gap:5}},[
            h("div",{key:"b",className:"avail-legend-dot",style:{background:"#fef2f2",border:"1px solid #fca5a5"}}),
            h("span",{key:"bl"},"Bận")
          ]),
          h("div",{style:{display:"flex",alignItems:"center",gap:5}},[
            h("div",{key:"e",className:"avail-legend-dot",style:{background:"#f8f8f8",border:"1px solid #ebebeb"}}),
            h("span",{key:"el"},"Chưa điền")
          ]),
          h("span",{style:{color:"var(--text3)",fontSize:11}},"— Nhấn ô để chuyển: rảnh → bận → xóa")
        ),

        members.length===0
          ?h("div",{className:"empty"},h("div",{className:"empty-icon"},"👥"),h("div",{className:"empty-text"},"Chưa có thành viên. Vào Thiết lập để thêm."))
          :h("div",{className:"avail-grid"},
            members.map((m,mi)=>h("div",{key:m.id,className:"avail-member-row"},
              h("div",{className:"avail-member-header"},
                h(Avatar,{name:m.name,idx:mi}),
                h("span",{style:{fontWeight:600,fontSize:13}}),m.name,
                h("span",{style:{fontSize:11,color:"var(--text3)",marginLeft:"auto"}},
                  `Rảnh: ${Object.values(availability?.[m.id]?.[weekKey]||{}).flatMap(d=>Object.values(d)).filter(v=>v==="free").length} slot`)
              ),
              // Day columns
              h("div",{style:{display:"flex",gap:6}},
                h("div",{style:{width:48,flexShrink:0}}), // spacer for time labels
                WEEK_DAYS.map((day,di)=>h("div",{key:di,className:"avail-day-col",style:{flex:1}},
                  h("div",{className:"avail-day-label"},day)
                ))
              ),
              TIME_SLOTS.map((slot,si)=>h("div",{key:si,style:{display:"flex",gap:6,marginTop:4}},
                h("div",{style:{width:48,flexShrink:0,fontSize:9,fontWeight:600,color:"var(--text3)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:6}},slot),
                WEEK_DAYS.map((_,di)=>{
                  const state=getSlot(m.id,di,si);
                  return h("div",{key:di,style:{flex:1},className:`avail-slot${state==="free"?" free":state==="busy"?" busy":""}`,
                    onClick:()=>toggleSlot(m.id,di,si)},
                    state==="free"?"✓":state==="busy"?"✗":"·"
                  );
                })
              ))
            ))
          )
      ),

      activeTab==="suggest"&&h("div",null,
        members.length===0
          ?h("div",{className:"empty"},h("div",{className:"empty-icon"},"👥"),h("div",{className:"empty-text"},"Thêm thành viên trước."))
          :h("div",null,
            // Heatmap
            h("div",{className:"card",style:{marginBottom:16}},
              h("div",{style:{fontWeight:700,fontSize:14,marginBottom:4}},"🔥 Heatmap lịch rảnh chung"),
              h("div",{style:{fontSize:12,color:"var(--text3)",marginBottom:14}},"Màu càng xanh = càng nhiều người rảnh cùng lúc"),
              h("div",{style:{display:"flex",gap:6}},
                h("div",{style:{width:48}}),
                WEEK_DAYS.map((d,di)=>h("div",{key:di,style:{flex:1,fontSize:9,fontWeight:700,color:"var(--text3)",textAlign:"center",letterSpacing:.5,textTransform:"uppercase"}},d))
              ),
              TIME_SLOTS.map((slot,si)=>h("div",{key:si,style:{display:"flex",gap:6,marginTop:4}},
                h("div",{style:{width:48,flexShrink:0,fontSize:9,fontWeight:600,color:"var(--text3)",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:6}},slot),
                WEEK_DAYS.map((_,di)=>{
                  const {count,total}=overlapMatrix[di][si];
                  const {bg,border,text}=overlapColor(count,total);
                  return h("div",{key:di,style:{flex:1,padding:"5px 2px",borderRadius:6,border:`1px solid ${border}`,background:bg,color:text,fontSize:9,fontWeight:700,textAlign:"center",minHeight:24,display:"flex",alignItems:"center",justifyContent:"center"}},
                    count>0?`${count}/${total}`:"·"
                  );
                })
              ))
            ),

            // Suggestions
            h("div",{className:"card"},
              h("div",{style:{fontWeight:700,fontSize:14,marginBottom:12}},"✨ Gợi ý giờ họp tốt nhất"),
              suggestedSlots.length===0
                ?h("div",{className:"empty",style:{padding:"30px 20px"}},h("div",{className:"empty-icon"},"📭"),h("div",{className:"empty-text"},"Chưa có dữ liệu lịch rảnh"))
                :h("div",{style:{display:"flex",flexDirection:"column",gap:10}},
                  suggestedSlots.map((s,i)=>h("div",{key:i,style:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"var(--surface2)",borderRadius:10,border:"1px solid var(--border)"}},
                    h("div",{style:{width:28,height:28,borderRadius:8,background:i===0?"var(--text)":"var(--surface3)",color:i===0?"white":"var(--text2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}},i+1),
                    h("div",{style:{flex:1}},
                      h("div",{style:{fontWeight:600,fontSize:13}},`${WEEK_DAYS[s.dayIdx]} – ${TIME_SLOTS[s.slotIdx]}`),
                      h("div",{style:{fontSize:11,color:"var(--text3)",marginTop:2}},`${s.count}/${members.length} người rảnh`)
                    ),
                    h("div",{style:{display:"flex",gap:4}},
                      s.freeMembers.map((m,mi)=>h(Avatar,{key:m.id,name:m.name,idx:members.findIndex(x=>x.id===m.id),size:"avatar-sm"}))
                    ),
                    h("button",{className:"btn btn-sm btn-success",onClick:()=>{
                      setMeetingForm(f=>({...f,day:String(s.dayIdx),slot:String(s.slotIdx),attendees:s.freeMembers.map(m=>m.id)}));
                      setShowMeetingModal(true);
                    }},"Đặt lịch")
                  ))
                )
            )
          )
      ),

      activeTab==="meetings"&&h("div",null,
        h("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}},
          h("div",{style:{fontWeight:600,fontSize:13}},`${thisWeekMeetings.length} cuộc họp tuần này`),
          h("button",{className:"btn btn-primary btn-sm",onClick:()=>setShowMeetingModal(true)},"+ Thêm")
        ),
        thisWeekMeetings.length===0
          ?h("div",{className:"empty"},h("div",{className:"empty-icon"},"🗓️"),h("div",{className:"empty-text"},"Chưa có cuộc họp nào tuần này"))
          :h("div",null,thisWeekMeetings.map(mtg=>h("div",{key:mtg.id,className:"meeting-card"},
            h("div",{className:"meeting-card-header"},
              h("div",{style:{flex:1}},
                h("div",{className:"meeting-title"},mtg.title),
                h("div",{className:"meeting-meta"},
                  h(Tag,{color:"blue"},`${WEEK_DAYS[Number(mtg.day)]} ${TIME_SLOTS[Number(mtg.slot)]}`),
                  h(Tag,{color:"gray"},`${mtg.duration} phút`)
                ),
                h("div",{className:"meeting-attendees"},
                  (mtg.attendees||[]).map(aid=>{
                    const m=members.find(x=>x.id===aid);
                    if(!m)return null;
                    return h("div",{key:aid,className:"member-chip",style:{padding:"4px 8px"}},
                      h(Avatar,{name:m.name,idx:members.findIndex(x=>x.id===aid),size:"avatar-sm"}),
                      h("span",{style:{fontSize:11,fontWeight:500}},m.name)
                    );
                  })
                )
              ),
              h("button",{className:"btn btn-sm btn-danger",onClick:()=>deleteMeeting(mtg.id)},"Xóa")
            )
          )))
      )
    ),

    // Meeting modal
    showMeetingModal&&h("div",{className:"modal-overlay",onClick:e=>{if(e.target===e.currentTarget)setShowMeetingModal(false)}},
      h("div",{className:"modal"},
        h("div",{className:"modal-title"},"📅 Tạo lịch họp"),
        h("div",{style:{display:"flex",flexDirection:"column",gap:14}},
          h("div",{className:"form-group"},
            h("label",{className:"form-label"},"Tên cuộc họp"),
            h("input",{className:"input",placeholder:"VD: Sprint Planning tuần 3",value:meetingForm.title,onChange:e=>setMeetingForm(f=>({...f,title:e.target.value}))})
          ),
          h("div",{className:"grid-2"},
            h("div",{className:"form-group"},
              h("label",{className:"form-label"},"Ngày"),
              h("select",{className:"input",value:meetingForm.day,onChange:e=>setMeetingForm(f=>({...f,day:e.target.value}))},
                h("option",{value:""},"-- Chọn ngày --"),
                WEEK_DAYS.map((d,i)=>h("option",{key:i,value:i},d))
              )
            ),
            h("div",{className:"form-group"},
              h("label",{className:"form-label"},"Giờ bắt đầu"),
              h("select",{className:"input",value:meetingForm.slot,onChange:e=>setMeetingForm(f=>({...f,slot:e.target.value}))},
                h("option",{value:""},"-- Chọn giờ --"),
                TIME_SLOTS.map((t,i)=>h("option",{key:i,value:i},t))
              )
            )
          ),
          h("div",{className:"form-group"},
            h("label",{className:"form-label"},"Thời lượng (phút)"),
            h("select",{className:"input",value:meetingForm.duration,onChange:e=>setMeetingForm(f=>({...f,duration:e.target.value}))},
              ["30","45","60","90","120"].map(d=>h("option",{key:d,value:d},`${d} phút`))
            )
          ),
          h("div",{className:"form-group"},
            h("label",{className:"form-label"},"Thành viên tham dự"),
            h("div",{style:{display:"flex",flexWrap:"wrap",gap:6}},
              members.map((m,mi)=>{
                const sel=(meetingForm.attendees||[]).includes(m.id);
                return h("div",{key:m.id,onClick:()=>setMeetingForm(f=>({...f,attendees:sel?f.attendees.filter(a=>a!==m.id):[...f.attendees,m.id]})),
                  style:{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,border:`1px solid ${sel?"var(--text)":"var(--border2)"}`,background:sel?"var(--text)":"#fff",cursor:"pointer",transition:"all .15s"}},
                  h(Avatar,{name:m.name,idx:mi}),
                  h("span",{style:{fontSize:12,fontWeight:500,color:sel?"white":"var(--text)"}},m.name)
                );
              })
            )
          ),
          h("div",{style:{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}},
            h("button",{className:"btn btn-ghost",onClick:()=>setShowMeetingModal(false)},"Hủy"),
            h("button",{className:"btn btn-primary",onClick:saveMeeting},"Lưu lịch họp")
          )
        )
      )
    )
  );
}

// ---- Dashboard ----
function DashboardPage({members,tasks,meetings,availability}){
  const done=tasks.filter(t=>t.status==="done").length;
  const total=tasks.length;
  const overdue=tasks.filter(t=>t.deadline&&new Date(t.deadline)<new Date()&&t.status!=="done").length;

  // Count total free slots across all members this week
  const totalFreeSlots=useMemo(()=>{
    let n=0;
    Object.values(availability||{}).forEach(m=>{
      Object.values(m["w0"]||{}).forEach(day=>{Object.values(day).forEach(v=>{if(v==="free")n++;});});
    });
    return n;
  },[availability]);

  return h("div",null,
    h("div",{className:"topbar"},
      h("div",null,
        h("div",{className:"page-title"},"Dashboard"),
        h("div",{className:"page-sub"},"Tổng quan dự án nhóm")
      )
    ),
    h("div",{className:"content"},
      h("div",{className:"grid-4",style:{marginBottom:20}},
        h("div",{className:"stat-card"},h("div",{className:"stat-icon",style:{background:"#eff6ff"}},h("span",null,"👥")),h("div",{className:"stat-value"},members.length),h("div",{className:"stat-label"},"Thành viên")),
        h("div",{className:"stat-card"},h("div",{className:"stat-icon",style:{background:"#f0fdf4"}},h("span",null,"✅")),h("div",{className:"stat-value"},done),h("div",{className:"stat-label"},"Task hoàn thành")),
        h("div",{className:"stat-card"},h("div",{className:"stat-icon",style:{background:"#fef2f2"}},h("span",null,"⚠️")),h("div",{className:"stat-value"},overdue),h("div",{className:"stat-label"},"Quá hạn")),
        h("div",{className:"stat-card"},h("div",{className:"stat-icon",style:{background:"#f0fdf4"}},h("span",null,"📅")),h("div",{className:"stat-value"},meetings.length),h("div",{className:"stat-label"},"Cuộc họp"))
      ),
      h("div",{className:"grid-2"},
        h("div",{className:"card"},
          h("div",{style:{fontWeight:700,marginBottom:12}},"Tiến độ Task"),
          total===0?h("div",{style:{color:"var(--text3)",fontSize:13}},"Chưa có task nào"):h("div",null,
            h(Progress,{value:done,max:total,color:"var(--green)"}),
            h("div",{style:{fontSize:12,color:"var(--text3)",marginTop:6}},`${done}/${total} task hoàn thành (${Math.round(done/total*100)}%)`)
          )
        ),
        h("div",{className:"card"},
          h("div",{style:{fontWeight:700,marginBottom:12}},"📅 Lịch họp sắp tới"),
          meetings.length===0?h("div",{style:{color:"var(--text3)",fontSize:13}},"Chưa có lịch họp"):
          h("div",{style:{display:"flex",flexDirection:"column",gap:8}},
            meetings.slice(0,3).map(m=>h("div",{key:m.id,style:{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"var(--surface2)",borderRadius:8,border:"1px solid var(--border)"}},
              h("span",{style:{fontSize:16}},"📌"),
              h("div",null,
                h("div",{style:{fontSize:13,fontWeight:600}},m.title),
                h("div",{style:{fontSize:11,color:"var(--text3)"}},`${WEEK_DAYS[Number(m.day)]} lúc ${TIME_SLOTS[Number(m.slot)]} · ${m.duration} phút`)
              )
            ))
          )
        )
      )
    )
  );
}

// ---- Setup Page ----
function SetupPage({project,setProject,members,setMembers,sprint,setSprint,toast,showToast}){
  const [name,setName]=useState("");
  const [role,setRole]=useState("member");

  function addMember(){
    if(!name.trim())return;
    setMembers(prev=>[...prev,{id:uid(),name:name.trim(),role}]);
    setName("");showToast("Đã thêm thành viên!");
  }
  function removeMember(id){setMembers(prev=>prev.filter(m=>m.id!==id));}

  return h("div",null,
    h("div",{className:"topbar"},
      h("div",null,h("div",{className:"page-title"},"⚙️ Thiết lập dự án"),h("div",{className:"page-sub"},"Cài đặt cơ bản cho nhóm"))
    ),
    h("div",{className:"content"},
      h("div",{className:"grid-2"},
        h("div",{className:"card"},
          h("div",{style:{fontWeight:700,marginBottom:14}},"Thông tin dự án"),
          h("div",{className:"form-group",style:{marginBottom:10}},
            h("label",{className:"form-label"},"Tên dự án"),
            h("input",{className:"input",value:project.name,onChange:e=>setProject(p=>({...p,name:e.target.value}))})
          ),
          h("div",{className:"form-group",style:{marginBottom:10}},
            h("label",{className:"form-label"},"Mô tả"),
            h("textarea",{className:"input",value:project.desc,onChange:e=>setProject(p=>({...p,desc:e.target.value}))})
          ),
          h("div",{className:"grid-2"},
            h("div",{className:"form-group"},
              h("label",{className:"form-label"},"Bắt đầu"),
              h("input",{className:"input",type:"date",value:sprint.start,onChange:e=>setSprint(s=>({...s,start:e.target.value}))})
            ),
            h("div",{className:"form-group"},
              h("label",{className:"form-label"},"Kết thúc"),
              h("input",{className:"input",type:"date",value:sprint.end,onChange:e=>setSprint(s=>({...s,end:e.target.value}))})
            )
          )
        ),
        h("div",{className:"card"},
          h("div",{style:{fontWeight:700,marginBottom:14}},"Thành viên nhóm"),
          h("div",{style:{display:"flex",gap:8,marginBottom:12}},
            h("input",{className:"input",placeholder:"Tên thành viên",value:name,onChange:e=>setName(e.target.value),onKeyDown:e=>e.key==="Enter"&&addMember()}),
            h("select",{className:"input",style:{width:120},value:role,onChange:e=>setRole(e.target.value)},
              h("option",{value:"member"},"Member"),h("option",{value:"leader"},"Leader")
            ),
            h("button",{className:"btn btn-primary",style:{whiteSpace:"nowrap"},onClick:addMember},"Thêm")
          ),
          members.length===0?h("div",{style:{color:"var(--text3)",fontSize:13,textAlign:"center",padding:20}},"Chưa có thành viên nào"):
          h("div",{style:{display:"flex",flexDirection:"column",gap:6}},
            members.map((m,i)=>h("div",{key:m.id,className:"member-chip"},
              h(Avatar,{name:m.name,idx:i}),
              h("span",{style:{fontWeight:600,fontSize:13,flex:1}},m.name),
              h(Tag,{color:m.role==="leader"?"amber":"blue"},m.role),
              h("button",{className:"btn btn-sm btn-danger",style:{padding:"3px 8px"},onClick:()=>removeMember(m.id)},"✕")
            ))
          )
        )
      )
    )
  );
}

// ---- Tasks Page ----
function TasksPage({members,tasks,setTasks,showToast}){
  const [filter,setFilter]=useState("all");
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({title:"",assignee:"",complexity:1,status:"todo",deadline:""});

  function addTask(){
    if(!form.title.trim()||!form.assignee)return;
    setTasks(prev=>[...prev,{id:uid(),...form}]);
    setForm({title:"",assignee:"",complexity:1,status:"todo",deadline:""});
    setShowAdd(false);showToast("Đã thêm task!");
  }
  function updateTask(id,patch){setTasks(prev=>prev.map(t=>t.id===id?{...t,...patch}:t));}
  function deleteTask(id){setTasks(prev=>prev.filter(t=>t.id!==id));}

  const filtered=tasks.filter(t=>filter==="all"||t.status===filter||t.assignee===filter);

  return h("div",null,
    h("div",{className:"topbar"},
      h("div",null,h("div",{className:"page-title"},"✅ Task Log"),h("div",{className:"page-sub"},"Quản lý công việc nhóm")),
      h("button",{className:"btn btn-primary",onClick:()=>setShowAdd(v=>!v)},showAdd?"Đóng":"+ Thêm Task")
    ),
    h("div",{className:"content"},
      showAdd&&h("div",{className:"card",style:{marginBottom:16}},
        h("div",{style:{fontWeight:700,marginBottom:12}},"Thêm task mới"),
        h("div",{style:{display:"flex",flexDirection:"column",gap:10}},
          h("div",{className:"form-group"},h("label",{className:"form-label"},"Tiêu đề"),h("input",{className:"input",placeholder:"Tên task...",value:form.title,onChange:e=>setForm(f=>({...f,title:e.target.value}))})),
          h("div",{className:"grid-3"},
            h("div",{className:"form-group"},h("label",{className:"form-label"},"Người thực hiện"),
              h("select",{className:"input",value:form.assignee,onChange:e=>setForm(f=>({...f,assignee:e.target.value}))},
                h("option",{value:""},"-- Chọn --"),
                members.map(m=>h("option",{key:m.id,value:m.id},m.name))
              )
            ),
            h("div",{className:"form-group"},h("label",{className:"form-label"},"Độ phức tạp"),
              h("select",{className:"input",value:form.complexity,onChange:e=>setForm(f=>({...f,complexity:Number(e.target.value)}))},
                Object.entries(COMPLEXITY).map(([k,v])=>h("option",{key:k,value:k},v.label))
              )
            ),
            h("div",{className:"form-group"},h("label",{className:"form-label"},"Deadline"),h("input",{className:"input",type:"date",value:form.deadline,onChange:e=>setForm(f=>({...f,deadline:e.target.value}))}))
          ),
          h("div",{style:{display:"flex",justifyContent:"flex-end"}},h("button",{className:"btn btn-primary",onClick:addTask},"Lưu task"))
        )
      ),
      h("div",{className:"chip-filter"},
        h("div",{className:`chip ${filter==="all"?"active":""}`,onClick:()=>setFilter("all")},"Tất cả"),
        h("div",{className:`chip ${filter==="todo"?"active":""}`,onClick:()=>setFilter("todo")},"Todo"),
        h("div",{className:`chip ${filter==="doing"?"active":""}`,onClick:()=>setFilter("doing")},"Đang làm"),
        h("div",{className:`chip ${filter==="done"?"active":""}`,onClick:()=>setFilter("done")},"Hoàn thành"),
        ...members.map(m=>h("div",{key:m.id,className:`chip ${filter===m.id?"active":""}`,onClick:()=>setFilter(m.id)},m.name))
      ),
      filtered.length===0?h("div",{className:"empty"},h("div",{className:"empty-icon"},"📋"),h("div",{className:"empty-text"},"Không có task nào")):
      h("div",{style:{display:"flex",flexDirection:"column",gap:8}},
        filtered.map(t=>{
          const member=members.find(m=>m.id===t.assignee);
          const mi=members.findIndex(m=>m.id===t.assignee);
          const isOverdue=t.deadline&&new Date(t.deadline)<new Date()&&t.status!=="done";
          return h("div",{key:t.id,className:`task-card ${t.status==="done"?"done":""} ${isOverdue?"overdue":""}`},
            h("div",{style:{display:"flex",alignItems:"flex-start",gap:12}},
              h("div",{style:{flex:1}},
                h("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:6}},
                  h("span",{style:{fontWeight:600,fontSize:13}},t.title),
                  isOverdue&&h(Tag,{color:"red"},"Quá hạn")
                ),
                h("div",{style:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}},
                  member&&h("div",{style:{display:"flex",alignItems:"center",gap:5}},
                    h(Avatar,{name:member.name,idx:mi,size:"avatar-sm"}),
                    h("span",{style:{fontSize:11,color:"var(--text2)"}},member.name)
                  ),
                  h(Tag,{color:t.complexity===3?"red":t.complexity===2?"amber":"green"},COMPLEXITY[t.complexity].label),
                  t.deadline&&h("span",{style:{fontSize:11,color:"var(--text3)"}},`📅 ${t.deadline}`)
                )
              ),
              h("div",{style:{display:"flex",gap:6,alignItems:"center"}},
                h("select",{className:"input",style:{width:130,padding:"4px 8px",fontSize:11},value:t.status,onChange:e=>updateTask(t.id,{status:e.target.value})},
                  Object.entries(STATUS).map(([k,v])=>h("option",{key:k,value:k},v.label))
                ),
                h("button",{className:"btn btn-sm btn-danger",style:{padding:"4px 8px"},onClick:()=>deleteTask(t.id)},"✕")
              )
            )
          );
        })
      )
    )
  );
}

// ---- Analytics Page ----
function AnalyticsPage({members,tasks}){
  const stats=useMemo(()=>members.map((m,i)=>{
    const mt=tasks.filter(t=>t.assignee===m.id);
    const done=mt.filter(t=>t.status==="done");
    const pts=done.reduce((a,t)=>a+COMPLEXITY[t.complexity].pts,0);
    const totalPts=mt.reduce((a,t)=>a+COMPLEXITY[t.complexity].pts,0);
    return{...m,idx:i,total:mt.length,done:done.length,pts,totalPts,rate:mt.length?Math.round(done.length/mt.length*100):0};
  }),[members,tasks]);
  const maxPts=Math.max(...stats.map(s=>s.pts),1);

  return h("div",null,
    h("div",{className:"topbar"},h("div",null,h("div",{className:"page-title"},"📈 Analytics"),h("div",{className:"page-sub"},"Phân tích đóng góp thành viên"))),
    h("div",{className:"content"},
      h("table",{className:"table"},
        h("thead",null,h("tr",null,
          h("th",null,"Thành viên"),h("th",null,"Task"),h("th",null,"Hoàn thành"),h("th",null,"Điểm"),h("th",null,"Tỉ lệ hoàn thành")
        )),
        h("tbody",null,stats.map(s=>h("tr",{key:s.id},
          h("td",null,h("div",{style:{display:"flex",alignItems:"center",gap:8}},h(Avatar,{name:s.name,idx:s.idx}),h("span",{style:{fontWeight:600}},s.name))),
          h("td",null,s.total),
          h("td",null,h(Tag,{color:"green"},s.done)),
          h("td",null,h("div",{style:{display:"flex",alignItems:"center",gap:8,minWidth:120}},
            h(Progress,{value:s.pts,max:maxPts,color:MEMBER_COLORS[s.idx%MEMBER_COLORS.length]}),
            h("span",{style:{fontSize:12,fontFamily:"var(--mono)",minWidth:24}},s.pts)
          )),
          h("td",null,h("span",{style:{fontFamily:"var(--mono)",fontWeight:700,color:s.rate>=70?"var(--green)":s.rate>=40?"var(--amber)":"var(--red)"}},`${s.rate}%`))
        )))
      )
    )
  );
}

// ---- Peer Review ----
function PeerPage({members,peerReviews,setPeerReviews,showToast}){
  const [reviewer,setReviewer]=useState("");
  const [saved,setSaved]=useState(false);
  function getRating(reviewerId,revieweeId,ci){
    return peerReviews?.[reviewerId]?.[revieweeId]?.[ci]??0;
  }
  function setRating(reviewerId,revieweeId,ci,val){
    setPeerReviews(prev=>{
      const next={...prev};
      if(!next[reviewerId])next[reviewerId]={};
      if(!next[reviewerId][revieweeId])next[reviewerId][revieweeId]={};
      next[reviewerId][revieweeId][ci]=val;
      return next;
    });
  }
  function save(){setSaved(true);showToast("Đã lưu đánh giá!");}
  const peers=members.filter(m=>m.id!==reviewer);

  return h("div",null,
    h("div",{className:"topbar"},h("div",null,h("div",{className:"page-title"},"🤝 Peer Review"),h("div",{className:"page-sub"},"Đánh giá đồng nghiệp"))),
    h("div",{className:"content"},
      h("div",{className:"form-group",style:{maxWidth:280,marginBottom:20}},
        h("label",{className:"form-label"},"Bạn là ai?"),
        h("select",{className:"input",value:reviewer,onChange:e=>{setReviewer(e.target.value);setSaved(false);}},
          h("option",{value:""},"-- Chọn --"),
          members.map(m=>h("option",{key:m.id,value:m.id},m.name))
        )
      ),
      reviewer&&peers.length===0&&h("div",{style:{color:"var(--text3)",fontSize:13}},"Không có ai để đánh giá."),
      reviewer&&peers.map(p=>{
        const pi=members.findIndex(m=>m.id===p.id);
        return h("div",{key:p.id,className:"card",style:{marginBottom:12}},
          h("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
            h(Avatar,{name:p.name,idx:pi}),
            h("span",{style:{fontWeight:700,fontSize:14}},p.name)
          ),
          h("table",{className:"table"},
            h("thead",null,h("tr",null,h("th",null,"Tiêu chí"),h("th",null,"Điểm"))),
            h("tbody",null,PEER_CRITERIA.map((c,ci)=>h("tr",{key:ci},
              h("td",null,c),h("td",null,h(RatingSelect,{value:getRating(reviewer,p.id,ci),onChange:v=>setRating(reviewer,p.id,ci,v)}))
            )))
          )
        );
      }),
      reviewer&&peers.length>0&&h("button",{className:"btn btn-primary",style:{marginTop:8},onClick:save},"💾 Lưu đánh giá")
    )
  );
}

// ---- Leader Page ----
function LeaderPage({members,leaderReviews,setLeaderReviews,showToast}){
  function getRating(memberId,ci){return leaderReviews?.[memberId]?.[ci]??0;}
  function setRating(memberId,ci,val){
    setLeaderReviews(prev=>{
      const next={...prev};
      if(!next[memberId])next[memberId]={};
      next[memberId][ci]=val;return next;
    });
  }
  return h("div",null,
    h("div",{className:"topbar"},h("div",null,h("div",{className:"page-title"},"👑 Leader Review"),h("div",{className:"page-sub"},"Đánh giá từ trưởng nhóm"))),
    h("div",{className:"content"},
      members.length===0?h("div",{className:"empty"},h("div",{className:"empty-icon"},"👑"),h("div",{className:"empty-text"},"Thêm thành viên trước")):
      members.map((m,mi)=>h("div",{key:m.id,className:"card",style:{marginBottom:12}},
        h("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:12}},
          h(Avatar,{name:m.name,idx:mi}),h("span",{style:{fontWeight:700,fontSize:14}},m.name)
        ),
        h("table",{className:"table"},
          h("thead",null,h("tr",null,h("th",null,"Tiêu chí"),h("th",null,"Điểm"))),
          h("tbody",null,LEADER_CRITERIA.map((c,ci)=>h("tr",{key:ci},
            h("td",null,c),h("td",null,h(RatingSelect,{value:getRating(m.id,ci),onChange:v=>setRating(m.id,ci,v)}))
          )))
        )
      )),
      members.length>0&&h("button",{className:"btn btn-primary",onClick:()=>showToast("Đã lưu đánh giá Leader!")},"💾 Lưu tất cả")
    )
  );
}

// ---- Result Page ----
function ResultPage({members,tasks,peerReviews,leaderReviews}){
  const results=useMemo(()=>members.map((m,i)=>{
    const mt=tasks.filter(t=>t.assignee===m.id);
    const pts=mt.filter(t=>t.status==="done").reduce((a,t)=>a+COMPLEXITY[t.complexity].pts,0);
    const taskScore=mt.length?Math.min(pts/mt.length*3.33,10):0;

    let peerSum=0,peerCount=0;
    members.forEach(r=>{
      if(r.id===m.id)return;
      PEER_CRITERIA.forEach((_,ci)=>{
        const v=peerReviews?.[r.id]?.[m.id]?.[ci];
        if(v){peerSum+=v;peerCount++;}
      });
    });
    const peerScore=peerCount?peerSum/peerCount:0;

    let ldrSum=0,ldrCount=0;
    LEADER_CRITERIA.forEach((_,ci)=>{const v=leaderReviews?.[m.id]?.[ci];if(v){ldrSum+=v;ldrCount++;}});
    const ldrScore=ldrCount?ldrSum/ldrCount:0;

    const final=(taskScore*0.4+peerScore*0.35+ldrScore*0.25).toFixed(2);
    return{...m,idx:i,taskScore:taskScore.toFixed(1),peerScore:peerScore.toFixed(1),ldrScore:ldrScore.toFixed(1),final};
  }).sort((a,b)=>b.final-a.final),[members,tasks,peerReviews,leaderReviews]);

  return h("div",null,
    h("div",{className:"topbar"},h("div",null,h("div",{className:"page-title"},"🏆 Kết quả"),h("div",{className:"page-sub"},"Tổng hợp điểm số cuối kỳ"))),
    h("div",{className:"content"},
      results.length===0?h("div",{className:"empty"},h("div",{className:"empty-icon"},"🏆"),h("div",{className:"empty-text"},"Chưa có dữ liệu")):
      h("table",{className:"table"},
        h("thead",null,h("tr",null,
          h("th",null,"#"),h("th",null,"Thành viên"),h("th",null,"Task (40%)"),h("th",null,"Peer (35%)"),h("th",null,"Leader (25%)"),h("th",null,"Điểm cuối")
        )),
        h("tbody",null,results.map((r,i)=>h("tr",{key:r.id},
          h("td",null,i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1),
          h("td",null,h("div",{style:{display:"flex",alignItems:"center",gap:8}},h(Avatar,{name:r.name,idx:r.idx}),h("span",{style:{fontWeight:600}},r.name))),
          h("td",null,h("span",{style:{fontFamily:"var(--mono)"}}),r.taskScore),
          h("td",null,h("span",{style:{fontFamily:"var(--mono)"}}),r.peerScore),
          h("td",null,h("span",{style:{fontFamily:"var(--mono)"}}),r.ldrScore),
          h("td",null,h("span",{style:{fontFamily:"var(--mono)",fontWeight:800,fontSize:16,color:i===0?"var(--green)":i===1?"var(--amber)":"var(--text)"}},r.final))
        )))
      )
    )
  );
}

// ---- Calendar Page ----
function CalendarPage({tasks,meetings}){
  const today=new Date();
  const [month,setMonth]=useState(today.getMonth());
  const [year,setYear]=useState(today.getFullYear());
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstDay=(new Date(year,month,1).getDay()+6)%7;
  const MONTHS=["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

  function prevMonth(){if(month===0){setMonth(11);setYear(y=>y-1);}else setMonth(m=>m-1);}
  function nextMonth(){if(month===11){setMonth(0);setYear(y=>y+1);}else setMonth(m=>m+1);}

  function dayHasDeadline(d){
    const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return tasks.some(t=>t.deadline===ds);
  }
  function isToday(d){return d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();}

  return h("div",null,
    h("div",{className:"topbar"},h("div",null,h("div",{className:"page-title"},"🗓️ Lịch"),h("div",{className:"page-sub"},"Deadline & sự kiện"))),
    h("div",{className:"content"},
      h("div",{className:"card",style:{maxWidth:500}},
        h("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}},
          h("button",{className:"btn btn-ghost btn-sm",onClick:prevMonth},"←"),
          h("span",{style:{fontWeight:700}},`${MONTHS[month]} ${year}`),
          h("button",{className:"btn btn-ghost btn-sm",onClick:nextMonth},"→")
        ),
        h("div",{className:"calendar-grid"},
          WEEK_DAYS.map(d=>h("div",{key:d,className:"cal-day-header"},d)),
          Array(firstDay).fill(null).map((_,i)=>h("div",{key:`e${i}`})),
          Array.from({length:daysInMonth},(_,i)=>i+1).map(d=>h("div",{key:d,className:`cal-day ${isToday(d)?"today":""} ${dayHasDeadline(d)?"has-deadline":""}`},d))
        )
      )
    )
  );
}

// ---- App ----
function App(){
  const [page,setPage]=useState("dashboard");
  const [project,setProject]=useState({name:"Dự án nhóm",desc:""});
  const [sprint,setSprint]=useState({start:"",end:""});
  const [members,setMembers]=useState([]);
  const [tasks,setTasks]=useState([]);
  const [peerReviews,setPeerReviews]=useState({});
  const [leaderReviews,setLeaderReviews]=useState({});
  const [availability,setAvailability]=useState({});
  const [meetings,setMeetings]=useState([]);
  const [toast,setToast]=useState(null);
  const [aiOpen,setAiOpen]=useState(false);
  const [aiMsgs,setAiMsgs]=useState([{role:"bot",text:"Xin chào! Tôi có thể giúp bạn quản lý dự án nhóm. Hỏi tôi bất cứ điều gì!"}]);
  const [aiInput,setAiInput]=useState("");

  function showToast(msg){setToast(msg);}

  function sendAI(){
    if(!aiInput.trim())return;
    const userMsg=aiInput.trim();
    setAiMsgs(m=>[...m,{role:"user",text:userMsg}]);
    setAiInput("");
    setTimeout(()=>{
      let reply="Tôi hiểu rồi! Hiện tại tôi đang hỗ trợ bạn quản lý lịch họp và task nhóm.";
      if(userMsg.toLowerCase().includes("lịch"))reply="Vào tab 'Lịch rảnh' để xem và cập nhật lịch rảnh của từng thành viên, rồi dùng 'Gợi ý giờ họp' để tìm khung giờ phù hợp nhất!";
      else if(userMsg.toLowerCase().includes("task"))reply="Vào 'Task Log' để thêm và quản lý công việc. Mỗi task có thể gán cho thành viên, đặt deadline và mức độ phức tạp.";
      else if(userMsg.toLowerCase().includes("họp"))reply="Để tạo lịch họp, vào 'Lịch rảnh' → tab 'Lịch họp' → nhấn '+ Tạo lịch họp'. Hệ thống cũng gợi ý giờ họp dựa trên lịch rảnh chung!";
      setAiMsgs(m=>[...m,{role:"bot",text:reply}]);
    },600);
  }

  const renderPage=()=>{
    switch(page){
      case"dashboard":return h(DashboardPage,{members,tasks,meetings,availability});
      case"setup":return h(SetupPage,{project,setProject,members,setMembers,sprint,setSprint,toast,showToast});
      case"tasks":return h(TasksPage,{members,tasks,setTasks,showToast});
      case"analytics":return h(AnalyticsPage,{members,tasks});
      case"availability":return h(AvailabilityPage,{members,availability,setAvailability,meetings,setMeetings});
      case"calendar":return h(CalendarPage,{tasks,meetings});
      case"peer":return h(PeerPage,{members,peerReviews,setPeerReviews,showToast});
      case"leader":return h(LeaderPage,{members,leaderReviews,setLeaderReviews,showToast});
      case"result":return h(ResultPage,{members,tasks,peerReviews,leaderReviews});
      default:return h("div",null,"...");
    }
  };

  return h("div",{className:"app"},
    toast&&h(Toast,{msg:toast,onDone:()=>setToast(null)}),
    h("div",{className:"sidebar"},
      h("div",{className:"logo"},
        h("div",{className:"logo-mark"},
          h("div",{className:"logo-icon"},h("svg",{viewBox:"0 0 16 16"},h("path",{d:"M8 1L1 5v6l7 4 7-4V5L8 1z"}))),
          h("div",null,h("div",{className:"logo-name"},"TeamFlow"),h("div",{className:"logo-sub"},"v2.0"))
        )
      ),
      h("div",{className:"sidebar-nav"},
        h("div",{className:"nav-section"},
          h("div",{className:"nav-label"},"Chức năng"),
          PAGES.map(p=>h("button",{key:p.id,className:`nav-item ${page===p.id?"active":""}`,onClick:()=>setPage(p.id)},
            h("span",{className:"nav-icon"},p.icon),p.label
          ))
        )
      ),
      h("div",{className:"sidebar-project"},
        h("div",{className:"project-pill"},
          h("div",{className:"project-label"},"DỰ ÁN HIỆN TẠI"),
          h("div",{className:"project-name"},project.name||"Chưa đặt tên"),
          h("div",{style:{fontSize:10,color:"var(--text3)",marginTop:2}},`${members.length} thành viên · ${tasks.length} tasks`)
        )
      )
    ),
    h("div",{className:"main"},renderPage()),
    // AI panel
    h("div",{className:`ai-panel ${aiOpen?"expanded":"collapsed"}`},
      h("div",{className:"ai-header",onClick:()=>setAiOpen(v=>!v)},
        h("div",{className:"ai-dot"}),
        h("span",{style:{fontWeight:600,flex:1,fontSize:13}},"AI Assistant"),
        h("span",{style:{fontSize:11,opacity:.7}},aiOpen?"▼":"▲")
      ),
      aiOpen&&h("div",{className:"ai-messages"},
        aiMsgs.map((m,i)=>h("div",{key:i,className:`ai-msg ${m.role}`},m.text))
      ),
      aiOpen&&h("div",{className:"ai-input-row"},
        h("input",{className:"ai-input",placeholder:"Hỏi về dự án...",value:aiInput,onChange:e=>setAiInput(e.target.value),onKeyDown:e=>e.key==="Enter"&&sendAI()}),
        h("button",{className:"ai-send",onClick:sendAI},"Gửi")
      )
    )
  );
}

createRoot(document.getElementById("root")).render(h(App,null));
</script>
</body>
</html>
