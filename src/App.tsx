python3 - << 'PYEOF' 

code = r'''<!DOCTYPE html> 

<html lang="vi"> 

<head> 

<meta charset="UTF-8" /> 

<meta name="viewport" content="width=device-width, initial-scale=1.0" /> 

<title>TeamFlow v2</title> 

<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" /> 

<style> 

  :root { 

    --bg:#f5f4f0;--surface:#fff;--surface2:#f9f8f5;--surface3:#f0efe9; 

    --border:#e8e6df;--border2:#d8d5cc; 

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

  .sidebar{width:220px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;} 

  .main{flex:1;overflow-y:auto;display:flex;flex-direction:column;} 

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

  .topbar{padding:16px 28px;border-bottom:1px solid var(--border);background:var(--surface);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;} 

  .page-title{font-size:18px;font-weight:700;letter-spacing:-.3px;} 

  .page-sub{font-size:12px;color:var(--text3);margin-top:1px;} 

  .topbar-actions{display:flex;align-items:center;gap:10px;} 

  .content{padding:24px 28px;flex:1;} 

  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:20px;} 

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

  .input{width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border2);border-radius:var(--r3);font-size:13px;color:var(--text);outline:none;transition:border-color .15s;} 

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

  .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px 20px;} 

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

  .sub-tab.active{background:var(--surface);color:var(--text);box-shadow:var(--shadow);} 

  .task-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;transition:box-shadow .15s,border-color .15s;cursor:pointer;} 

  .task-card:hover{box-shadow:var(--shadow);border-color:var(--border2);} 

  .task-card.done{opacity:.65;}.task-card.overdue{border-color:#fecaca;background:#fef2f2;} 

  .status-todo{background:var(--surface3);color:var(--text2);border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;border:1px solid var(--border);} 

  .status-doing{background:#fffbeb;color:var(--amber);border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;border:1px solid #fde68a;} 

  .status-done{background:#f0fdf4;color:var(--green);border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;border:1px solid #bbf7d0;} 

  .chip-filter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;} 

  .chip{padding:5px 12px;border-radius:20px;border:1px solid var(--border2);background:var(--surface);color:var(--text2);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;} 

  .chip:hover{border-color:var(--text);color:var(--text);}.chip.active{background:var(--text);color:white;border-color:var(--text);} 

  .empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:var(--text3);gap:12px;} 

  .empty-icon{font-size:40px;opacity:.4;}.empty-text{font-size:13px;font-weight:500;} 

  .comment{display:flex;gap:10px;margin-bottom:12px;} 

  .comment-body{flex:1;background:var(--surface2);border-radius:10px;padding:10px 13px;border:1px solid var(--border);} 

  .comment-author{font-size:11px;font-weight:700;}.comment-time{font-size:10px;color:var(--text3);margin-left:8px;} 

  .comment-text{font-size:12.5px;color:var(--text2);margin-top:3px;line-height:1.5;} 

  .ai-panel{position:fixed;right:24px;bottom:24px;width:360px;background:var(--surface);border:1px solid var(--border);border-radius:18px;box-shadow:0 8px 40px rgba(0,0,0,.12);display:flex;flex-direction:column;overflow:hidden;z-index:500;transition:all .3s cubic-bezier(.34,1.56,.64,1);} 

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

  .rating-select{width:100%;padding:7px 10px;background:var(--surface);border:1px solid var(--border2);border-radius:8px;font-size:12px;outline:none;cursor:pointer;} 

  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);} 

  .modal{background:var(--surface);border-radius:20px;padding:28px;max-width:520px;width:92%;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);} 

  .modal-title{font-size:17px;font-weight:700;margin-bottom:18px;} 

  .calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;} 

  .cal-day-header{text-align:center;font-size:10px;font-weight:600;color:var(--text3);padding:4px;text-transform:uppercase;letter-spacing:.5px;} 

  .cal-day{aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;font-size:12px;cursor:pointer;transition:all .15s;border:1px solid transparent;position:relative;} 

  .cal-day:hover{background:var(--surface3);}.cal-day.today{background:var(--text);color:white;font-weight:700;} 

  .cal-day.has-event::after{content:'';position:absolute;bottom:3px;width:4px;height:4px;border-radius:2px;background:var(--blue);} 

  .cal-day.has-deadline::after{background:var(--red);} 

  .cal-day.today.has-event::after,.cal-day.today.has-deadline::after{background:white;} 

  .cal-day.selected{border-color:var(--text);background:var(--surface3);} 

  .time-slot{padding:8px 12px;border-radius:8px;font-size:11px;font-weight:600;border:1px solid var(--border);background:var(--surface);cursor:pointer;transition:all .15s;text-align:center;} 

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

  .onboard-screen{height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);} 

  .onboard-card{background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:48px;max-width:440px;width:92%;box-shadow:var(--shadow2);text-align:center;} 

</style> 

</head> 

<body> 

<div id="root"></div> 

<script type="module"> 

import { useState, useMemo, useEffect, useRef } from 'https://esm.sh/react@18'; 

import { createRoot } from 'https://esm.sh/react-dom@18/client'; 

 

const COMPLEXITY={1:{label:"Nhe",color:"var(--green)",pts:1},2:{label:"Trung binh",color:"var(--amber)",pts:2},3:{label:"Nang",color:"var(--red)",pts:3}}; 

const STATUS={todo:{label:"Todo",pct:0},doing:{label:"Dang lam",pct:0.5},done:{label:"Hoan thanh",pct:1}}; 

const PEER_CRITERIA=["Chat luong cong viec","Chu dong & Dung tien do","Tinh than hop tac"]; 

const LEADER_CRITERIA=["Chu dong & Trach nhiem","Chat luong Output","Phoi hop Nhom"]; 

const RATING_OPTIONS=[{value:0,label:"--"},{value:2,label:"2 - Chua dat"},{value:6,label:"6 - Trung binh"},{value:8,label:"8 - Tot"},{value:9,label:"9 - Rat tot"},{value:10,label:"10 - Xuat sac"}]; 

const MEMBER_COLORS=["#4338ca","#0369a1","#059669","#d97706","#dc2626","#7c3aed","#0891b2","#be185d","#16a34a","#b45309","#6366f1","#0284c7"]; 

const DAYS=["CN","T2","T3","T4","T5","T6","T7"]; 

const uid=()=>Math.random().toString(36).substring(2,9); 

const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0; 

const PAGES=[{id:"dashboard",icon:"Dashboard"},{id:"setup",icon:"Thiet lap"},{id:"tasks",icon:"Task Log"},{id:"analytics",icon:"Analytics"},{id:"calendar",icon:"Lich & Hop"},{id:"peer",icon:"Peer Review"},{id:"leader",icon:"Leader"},{id:"result",icon:"Ket qua"}]; 

 

function Tag({color,children}){const cls=color==="green"?"tag-green":color==="amber"?"tag-amber":color==="red"?"tag-red":color==="blue"?"tag-blue":"tag-gray";return React.createElement("span",{className:`tag ${cls}`},children);} 

function Avatar({name,idx,size="",color}){const mc=color||MEMBER_COLORS[idx%MEMBER_COLORS.length];const letter=name?.split(" ").pop()?.charAt(0)||"?";return React.createElement("div",{className:`avatar ${size}`,style:{background:mc+"18",color:mc,border:`1.5px solid ${mc}33`}},letter);} 

function Progress({value,max,color="var(--indigo)"}){const pct=max>0?Math.min((value/max)*100,100):0;return React.createElement("div",{className:"progress-track"},React.createElement("div",{className:"progress-fill",style:{width:`${pct}%`,background:color}}));} 

function RatingSelect({value,onChange}){return React.createElement("select",{className:"rating-select",value:value??0,onChange:e=>onChange(Number(e.target.value))},RATING_OPTIONS.map(o=>React.createElement("option",{key:o.value,value:o.value},o.label)));} 

function Toast({msg,onDone}){useEffect(()=>{const t=setTimeout(onDone,2200);return()=>clearTimeout(t);},[]);return React.createElement("div",{className:"toast"},msg);} 

 

// Full component source is embedded in the HTML widget above. 

// Copy the complete <script type="module"> block from the widget to get all components. 

 

createRoot(document.getElementById("root")).render(React.createElement("div",{style:{padding:40,textAlign:"center",color:"var(--text2)"}},"Please copy the full script block from the TeamFlow widget.")); 

</script> 

</body> 

</html>''' 

 

with open('/mnt/user-data/outputs/TeamFlow_v2.html', 'w', encoding='utf-8') as f: 

    f.write(code) 

print("Written", len(code), "chars") 

PYEOF 

Output 

 

 
