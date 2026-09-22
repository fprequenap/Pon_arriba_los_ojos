/* Pon arriba los ojos — PWA
   Contenido en window.BOOK (content.js). Sin dependencias externas. */
(function(){
"use strict";
const B = window.BOOK;
const $ = s => document.querySelector(s);
const app = $("#app"), ctx = $("#ctx");
const MES = ["","enero","febrero","marzo","abril","mayo","junio","julio","agosto","setiembre","octubre","noviembre","diciembre"];
const CUM = [0,31,59,90,120,151,181,212,243,273,304,334];
const doy = (m,d) => CUM[m-1]+d;
const esc = s => (s||"").replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

/* ---------- storage ---------- */
const KEY = "pon_arriba_v1";
const ST = Object.assign({theme:"auto", fs:1, marks:[], done:[], last:null}, load());
function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch(e){ return {}; } }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(ST)); }catch(e){} }

/* ---------- flatten content ---------- */
const TRE = [];   // treatise entries
B.books.forEach((bk,bi)=> bk.chapters.forEach((ch,ci)=> ch.entries.forEach((e,ei)=>{
  TRE.push({id:"t"+bi+"_"+ci+"_"+ei, book:bk.n, bookTitle:bk.title, roman:ch.roman,
            chapTitle:ch.title, dates:e.dates, regla:e.regla, salterio:e.salterio, rs:e.rs, body:e.body});
})));
const REG = [];   // rule portions (flat, dated)
B.regla.chapters.forEach((ch,ci)=> ch.portions.forEach((p,pi)=>{
  REG.push({id:"r"+ci+"_"+pi, head:ch.head, title:ch.title, dates:p.dates, text:p.text});
}));

/* date -> item index (first date that matches) */
function buildIdx(arr){ const m={}; arr.forEach(it=> it.dates.forEach(dt=>{ m[dt.m+"-"+dt.d]=it; })); return m; }
const TRE_IDX = buildIdx(TRE), REG_IDX = buildIdx(REG);

/* nearest-upcoming fallback within the triple cycle */
function resolve(arr, idx, today){
  const key = today.m+"-"+today.d;
  if(idx[key]) return {item:idx[key], exact:true};
  const tdoy = doy(today.m,today.d);
  let best=null, bestDist=1e9;
  arr.forEach(it=> it.dates.forEach(dt=>{
    let dist = (doy(dt.m,dt.d) - tdoy + 366) % 366;
    if(dist < bestDist){ bestDist=dist; best=it; }
  }));
  return {item:best, exact:false};
}
/* which of the three annual passes are we in (by month band) */
function passOf(today){
  const m = today.m;
  if(m>=1 && m<=4) return 1;
  if(m>=5 && m<=8) return 2;
  return 3;            // 9..12
}
function fmtDate(dt){ return dt.d+" de "+MES[dt.m]; }

/* ---------- bookmarks ---------- */
function isMark(id){ return ST.marks.indexOf(id)>=0; }
function toggleMark(id){ const i=ST.marks.indexOf(id); if(i>=0)ST.marks.splice(i,1); else ST.marks.unshift(id); save(); }
function isDone(id){ return ST.done.indexOf(id)>=0; }
function toggleDone(id){ const i=ST.done.indexOf(id); if(i>=0)ST.done.splice(i,1); else ST.done.push(id); save(); }
function findById(id){ return TRE.find(x=>x.id===id) || REG.find(x=>x.id===id); }

/* ---------- render helpers ---------- */
function medHTML(body){ return '<div class="meditation">'+body.map(p=>"<p>"+esc(p)+"</p>").join("")+"</div>"; }
function daterow(dates, today){
  return '<div class="daterow">'+dates.map(dt=>{
    const now = today && dt.m===today.m && dt.d===today.d;
    return '<span class="d'+(now?' now':'')+'">'+esc(fmtDate(dt))+'</span>';
  }).join('<span class="d">·</span>')+'</div>';
}
function markBtn(id){ return '<button class="btn'+(isMark(id)?' on':' gold')+'" data-mark="'+id+'">'+
  (isMark(id)?'★ Guardado':'☆ Marcador')+'</button>'; }

/* psalms (Salterio Romano Trinitario · Torres Amat, Vulgata) */
const PS = window.PSALMS || {};
function psalmNum(salterio){ const m=(salterio||"").match(/Salmo\s*(\d+)/i); return m?m[1]:null; }
function getPsalm(salterio){ const n=psalmNum(salterio); return n?PS[n]:null; }
function psalmCard(p){
  if(!p) return "";
  return '<article class="card psalm">'+
    '<div class="kicker">Salterio · Torres Amat (Vulgata)</div>'+
    '<div class="eyebrow">Salmo '+esc(p.n)+(p.title?' — '+esc(p.title):'')+'</div>'+
    (p.comment?'<div class="reglaref" style="margin:6px 0">'+esc(p.comment)+'</div>':'')+
    '<div class="divider"></div>'+
    '<div class="meditation psalmtext">'+p.verses.map(v=>"<p>"+esc(v)+"</p>").join("")+'</div>'+
  '</article>';
}

/* treatise entry card */
function entryCard(e, today, opts){
  opts=opts||{};
  const done = isDone(e.id);
  return '<article class="card">'+
    '<div class="kicker">Libro '+esc(e.book)+' · Capítulo '+esc(e.roman)+'</div>'+
    '<div class="eyebrow">'+esc(e.chapTitle||"")+'</div>'+
    (opts.showDates? daterow(e.dates, today):'')+
    (e.rs? '<div class="reglaref">'+esc(e.rs)+'</div>':'')+
    '<div class="divider"></div>'+
    medHTML(e.body)+
    '<div class="rowbtns">'+
      markBtn(e.id)+
      (opts.markDone? '<button class="btn'+(done?' on':'')+'" data-done="'+e.id+'">'+(done?'✓ Leído':'Marcar leído')+'</button>':'')+
    '</div>'+
  '</article>';
}
/* rule portion card */
function ruleCard(p, today, opts){
  opts=opts||{};
  return '<article class="card rule">'+
    '<div class="kicker">Regla de San Benito</div>'+
    '<div class="eyebrow">'+esc(p.head)+(p.title?' — '+esc(p.title):'')+'</div>'+
    (opts.showDates? daterow(p.dates, today):'')+
    '<div class="divider"></div>'+
    '<div class="meditation">'+p.text.map(t=>"<p>"+esc(t)+"</p>").join("")+'</div>'+
    '<div class="rowbtns">'+markBtn(p.id)+'</div>'+
  '</article>';
}

/* ---------- views ---------- */
let VIEW = {route:"hoy", offset:0};  // offset in days for Hoy navigation

function shiftDate(base, days){
  const d = new Date(base.getTime()+days*86400000);
  return {m:d.getMonth()+1, d:d.getDate(), date:d};
}

function renderHoy(){
  const base = new Date();
  const today = shiftDate(base, VIEW.offset);
  const pass = passOf(today);
  const tr = resolve(TRE, TRE_IDX, today);
  const rg = resolve(REG, REG_IDX, today);
  const wd = today.date.toLocaleDateString("es-ES",{weekday:"long"});
  ctx.textContent = wd.charAt(0).toUpperCase()+wd.slice(1)+" · "+today.d+" "+MES[today.m]+" · "+pass+"ª vuelta";

  let h = '<div class="view">';
  h += '<div class="navday">'+
        '<button data-day="-1">‹ Anterior</button>'+
        '<div class="lbl">'+(VIEW.offset===0?"Hoy":(today.d+" de "+MES[today.m]))+'</div>'+
        '<button data-day="1">Siguiente ›</button>'+
       '</div>';
  h += '<div class="daterow" style="margin-bottom:14px">'+
        '<span class="pill">'+pass+'ª de 3 vueltas</span>'+
        '<span class="pill">Regla · Salterio · Meditación</span></div>';

  if(VIEW.offset===0 && !isDone(tr.item.id)){
    h += '<div class="reminder"><span style="font-size:1.4em">✛</span>'+
         '<div class="txt"><b>Lectura de hoy</b> — aún no marcada como leída.</div></div>';
  }
  if(!tr.exact){
    h += '<div class="reglaref" style="margin-bottom:10px">No hay meditación asignada a este día; se muestra la lectura más próxima del ciclo.</div>';
  }
  h += entryCard(tr.item, today, {showDates:true, markDone:true});
  h += psalmCard(getPsalm(tr.item.salterio));
  h += ruleCard(rg.item, today, {showDates:true});
  h += '<div class="footnote">A. M. D. G. · «Pon arriba los ojos»</div>';
  h += '</div>';
  app.innerHTML = h;
  ST.last = tr.item.id; save();
}

function renderLector(){
  const sub = VIEW.sub || "tratado";
  let h = '<div class="view"><div class="seg">'+
    seg("tratado","Tratado",sub)+seg("salterio","Salterio",sub)+seg("regla","Regla",sub)+seg("glosario","Glosario",sub)+'</div>';
  if(sub==="salterio"){
    h += '<div class="reglaref" style="margin-bottom:12px">Salterio Romano Trinitario · Torres Amat (Vulgata) · 150 salmos</div><div class="list">';
    const nums=Object.keys(PS).sort((a,b)=>a-b);
    nums.forEach(n=>{ const p=PS[n];
      h += '<button data-psalm="'+n+'"><div class="chaphead">Salmo '+esc(n)+'</div><div>'+esc(p.title||"")+'</div></button>';
    });
    h += '</div>';
  } else if(sub==="tratado"){
    B.books.forEach((bk,bi)=>{
      h += '<div class="booktitle">Libro '+esc(bk.n)+' — '+esc(bk.title)+'</div><div class="list">';
      bk.chapters.forEach((ch,ci)=>{
        const n = ch.entries.length;
        h += '<button data-chap="'+bi+"_"+ci+'"><div class="chaphead">Capítulo '+esc(ch.roman)+'</div>'+
             '<div>'+esc(ch.title)+'</div><div class="sub">'+n+' lectura'+(n>1?'s':'')+'</div></button>';
      });
      h += '</div>';
    });
  } else if(sub==="regla"){
    h += '<div class="reglaref" style="margin-bottom:12px">'+esc(B.regla.edition||"")+'</div><div class="list">';
    B.regla.chapters.forEach((ch,ci)=>{
      h += '<button data-regch="'+ci+'"><div class="chaphead">'+esc(ch.head)+'</div>'+
           (ch.title?'<div>'+esc(ch.title)+'</div>':'')+
           '<div class="sub">'+ch.portions.length+' porción'+(ch.portions.length>1?'es':'')+'</div></button>';
    });
    h += '</div>';
  } else {
    h += '<div class="list">';
    B.glossary.forEach((g,gi)=>{
      h += '<div class="hit" style="cursor:default"><div class="where">'+esc(g.term)+'</div>'+esc(g.def)+'</div>';
    });
    h += '</div>';
  }
  h += '</div>';
  app.innerHTML = h; ctx.textContent="Lector";
}
function seg(id,label,cur){ return '<button data-sub="'+id+'" class="'+(cur===id?'active':'')+'">'+label+'</button>'; }

function renderChap(bi,ci){
  const ch = B.books[bi].chapters[ci];
  let h='<div class="view reader"><div class="navday"><button data-back="lector">‹ Lector</button>'+
        '<div class="lbl">Capítulo '+esc(ch.roman)+'</div><span style="width:70px"></span></div>';
  h += '<h2 class="chaphead">'+esc(ch.title)+'</h2>';
  h += '<div class="reglaref" style="margin-bottom:14px">Libro '+esc(B.books[bi].n)+' — '+esc(B.books[bi].title)+'</div>';
  ch.entries.forEach(raw=>{
    const e = TRE.find(x=>x.dates===raw.dates) || Object.assign({id:"t"+bi+"_"+ci+"_"+ch.entries.indexOf(raw)}, raw, {book:B.books[bi].n, roman:ch.roman, chapTitle:ch.title});
    h += '<article class="card">'+ daterow(e.dates) +
         (e.rs?'<div class="reglaref">'+esc(e.rs)+'</div>':'')+
         '<div class="divider"></div>'+ medHTML(e.body)+
         '<div class="rowbtns">'+markBtn(e.id)+'</div></article>';
    h += psalmCard(getPsalm(raw.salterio));
  });
  h+='</div>'; app.innerHTML=h; ctx.textContent="Tratado"; window.scrollTo(0,0);
}
function renderPsalm(n){
  const p=PS[n]; if(!p){ setRoute("lector"); return; }
  let h='<div class="view reader"><div class="navday"><button data-back="lector-salterio">‹ Salterio</button>'+
        '<div class="lbl">Salmo '+esc(n)+'</div><span style="width:70px"></span></div>'+
        psalmCard(p)+'</div>';
  app.innerHTML=h; ctx.textContent="Salterio"; window.scrollTo(0,0);
}
function renderRegCh(ci){
  const ch=B.regla.chapters[ci];
  let h='<div class="view reader"><div class="navday"><button data-back="lector-regla">‹ Regla</button>'+
        '<div class="lbl">'+esc(ch.head)+'</div><span style="width:70px"></span></div>';
  if(ch.title) h+='<h2 class="chaphead">'+esc(ch.title)+'</h2>';
  ch.portions.forEach((p,pi)=>{
    const id="r"+ci+"_"+pi;
    h+='<article class="card rule">'+daterow(p.dates)+'<div class="divider"></div>'+
       '<div class="meditation">'+p.text.map(t=>"<p>"+esc(t)+"</p>").join("")+'</div>'+
       '<div class="rowbtns">'+markBtn(id)+'</div></article>';
  });
  h+='</div>'; app.innerHTML=h; ctx.textContent="Regla de San Benito"; window.scrollTo(0,0);
}

/* ---------- search ---------- */
let CORPUS=null;
function buildCorpus(){
  if(CORPUS) return CORPUS;
  CORPUS=[];
  TRE.forEach(e=> CORPUS.push({id:e.id, where:"Tratado · Cap. "+e.roman, text:e.body.join(" "), kind:"t"}));
  REG.forEach(p=> CORPUS.push({id:p.id, where:"Regla · "+p.head, text:p.text.join(" "), kind:"r"}));
  B.glossary.forEach((g,i)=> CORPUS.push({id:"g"+i, where:"Glosario · "+g.term, text:g.def, kind:"g", term:g.term}));
  Object.keys(PS).forEach(n=>{ const p=PS[n]; CORPUS.push({id:"p"+n, where:"Salterio · Salmo "+n, text:(p.title||"")+" "+p.verses.join(" "), kind:"p"}); });
  return CORPUS;
}
function norm(s){ return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""); }
function renderBuscar(q){
  q = q||VIEW.q||"";
  let h='<div class="view"><div class="searchbox">'+
        '<input id="q" type="search" placeholder="Buscar en el tratado, la Regla y el glosario…" value="'+esc(q)+'"></div>';
  if(q.trim().length>=2){
    const nq=norm(q.trim()); const cor=buildCorpus(); const res=[];
    for(const c of cor){ const i=norm(c.text).indexOf(nq); if(i>=0) res.push({c,i}); if(res.length>=60) break; }
    h+='<div class="reglaref" style="margin-bottom:10px">'+res.length+(res.length>=60?"+":"")+' resultado(s)</div>';
    res.forEach(({c,i})=>{
      const start=Math.max(0,i-50), snip=c.text.slice(start,i+nq.length+90);
      const marked=esc(snip).replace(new RegExp("("+nq.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","i"),"<mark>$1</mark>");
      h+='<div class="hit" data-open="'+c.id+'"><div class="where">'+esc(c.where)+'</div>'+
         (start>0?"…":"")+marked+'…</div>';
    });
    if(!res.length) h+='<div class="empty">Sin coincidencias.</div>';
  } else {
    h+='<div class="empty">Escribe al menos dos letras.</div>';
  }
  h+='</div>'; app.innerHTML=h; ctx.textContent="Buscar";
  const inp=$("#q"); if(inp){ inp.focus();
    inp.addEventListener("input", ()=>{ VIEW.q=inp.value; clearTimeout(inp._t); inp._t=setTimeout(()=>renderBuscar(inp.value),180); });
  }
}
function openId(id){
  if(id[0]==="t"){ const e=TRE.find(x=>x.id===id); if(e){ openSingle(entryCard(e,null,{showDates:true})); } }
  else if(id[0]==="r"){ const p=REG.find(x=>x.id===id); if(p){ openSingle(ruleCard(p,null,{showDates:true})); } }
  else if(id[0]==="p"){ renderPsalm(id.slice(1)); }
  else if(id[0]==="g"){ setRoute("lector"); VIEW.sub="glosario"; renderLector(); }
}
function openSingle(cardHTML){
  app.innerHTML='<div class="view"><div class="navday"><button data-back="'+VIEW.route+'">‹ Volver</button>'+
    '<div class="lbl"></div><span style="width:70px"></span></div>'+cardHTML+'</div>';
  window.scrollTo(0,0);
}

/* ---------- marcadores ---------- */
function renderMarcadores(){
  let h='<div class="view">';
  if(!ST.marks.length){ h+='<div class="empty">Aún no has guardado marcadores.<br>Pulsa ☆ en cualquier lectura.</div>'; }
  else{
    h+='<div class="reglaref" style="margin-bottom:12px">'+ST.marks.length+' marcador(es)</div>';
    ST.marks.forEach(id=>{
      const it=findById(id); if(!it) return;
      const where = id[0]==="t" ? "Tratado · Cap. "+it.roman : "Regla · "+it.head;
      const preview = (it.body||it.text||[]).join(" ").slice(0,140);
      h+='<div class="hit" data-open="'+id+'"><div class="where">'+esc(where)+'</div>'+esc(preview)+'…'+
         '<div style="margin-top:8px"><button class="btn" data-unmark="'+id+'">Quitar</button></div></div>';
    });
  }
  h+='</div>'; app.innerHTML=h; ctx.textContent="Marcadores";
}

/* ---------- ajustes ---------- */
function renderAjustes(){
  const done=ST.done.length;
  let h='<div class="view"><div class="card">'+
    '<div class="setrow"><div><div class="k">Tema</div><div class="h">Claro, oscuro o según el sistema</div></div>'+
      '<div class="choices">'+
        tbtn("auto","Auto",ST.theme)+tbtn("day","Claro",ST.theme)+tbtn("night","Oscuro",ST.theme)+'</div></div>'+
    '<div class="setrow"><div><div class="k">Tamaño de letra</div><div class="h">'+Math.round(ST.fs*100)+'%</div></div>'+
      '<div class="choices"><button data-fs="-">A−</button><button data-fs="0">A</button><button data-fs="+">A＋</button></div></div>'+
    '<div class="setrow"><div><div class="k">Recordatorio diario</div><div class="h">Aviso al abrir en un día nuevo</div></div>'+
      '<div class="choices">'+
        '<button data-remind="off" class="'+(!ST.remind?'active':'')+'">No</button>'+
        '<button data-remind="on" class="'+(ST.remind?'active':'')+'">Sí</button></div></div>'+
    '<div class="setrow"><div><div class="k">Lecturas marcadas leídas</div><div class="h">Progreso en «Hoy»</div></div>'+
      '<div class="k" style="color:var(--gold)">'+done+'</div></div>'+
  '</div>';
  h+='<div class="card"><div class="eyebrow">Sobre la obra</div>'+
     '<p style="margin:.3em 0" class="reglaref">'+esc(B.meta.title)+' — '+esc(B.meta.subtitle)+'</p>'+
     '<p class="reglaref">'+esc(B.meta.copyright)+' · '+esc(B.meta.year)+'</p>'+
     '<p class="reglaref">'+esc(B.meta.dedication||"")+'</p>'+
     '<div class="rowbtns"><button class="btn" data-nota="1">Nota sobre la Regla</button>'+
     '<button class="btn" data-front="1">Presentación</button></div></div>';
  h+='</div>'; app.innerHTML=h; ctx.textContent="Ajustes";
}
function tbtn(v,l,cur){ return '<button data-theme="'+v+'" class="'+(cur===v?'active':'')+'">'+l+'</button>'; }

/* ---------- theme / font apply ---------- */
function applyTheme(){
  const r=document.documentElement;
  if(ST.theme==="auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme",ST.theme);
  const tc = getComputedStyle(document.body).getPropertyValue("--indigo");
  document.querySelector('meta[name="theme-color"]').setAttribute("content", ST.theme==="night"?"#0E1424":"#0E1424");
}
function applyFs(){ document.documentElement.style.setProperty("--fs", ST.fs); }

/* ---------- router ---------- */
function setRoute(r){
  VIEW.route=r;
  document.querySelectorAll("#nav button").forEach(b=> b.classList.toggle("active", b.dataset.route===r));
  window.scrollTo(0,0);
  if(r==="hoy"){ VIEW.offset=0; renderHoy(); }
  else if(r==="lector"){ renderLector(); }
  else if(r==="buscar"){ renderBuscar(); }
  else if(r==="marcadores"){ renderMarcadores(); }
  else if(r==="ajustes"){ renderAjustes(); }
}

/* ---------- events ---------- */
document.addEventListener("click", ev=>{
  const t=ev.target.closest("[data-route],[data-day],[data-sub],[data-chap],[data-regch],[data-psalm],[data-back],[data-mark],[data-done],[data-open],[data-unmark],[data-theme],[data-fs],[data-remind],[data-nota],[data-front]");
  if(!t) return;
  const d=t.dataset;
  if(d.route){ setRoute(d.route); }
  else if(d.day){ VIEW.offset += parseInt(d.day,10); renderHoy(); }
  else if(d.sub){ VIEW.sub=d.sub; renderLector(); }
  else if(d.chap){ const [bi,ci]=d.chap.split("_").map(Number); renderChap(bi,ci); }
  else if(d.regch!==undefined){ renderRegCh(parseInt(d.regch,10)); }
  else if(d.psalm){ renderPsalm(d.psalm); }
  else if(d.back){
    if(d.back==="lector-regla"){ VIEW.sub="regla"; setRoute("lector"); }
    else if(d.back==="lector-salterio"){ VIEW.sub="salterio"; setRoute("lector"); }
    else setRoute(d.back);
  }
  else if(d.mark){ toggleMark(d.mark); t.classList.toggle("on"); t.classList.toggle("gold");
    t.textContent = isMark(d.mark)?"★ Guardado":"☆ Marcador"; }
  else if(d.done){ toggleDone(d.done); t.classList.toggle("on");
    t.textContent = isDone(d.done)?"✓ Leído":"Marcar leído"; }
  else if(d.open){ openId(d.open); }
  else if(d.unmark){ toggleMark(d.unmark); renderMarcadores(); }
  else if(d.theme){ ST.theme=d.theme; save(); applyTheme(); renderAjustes(); }
  else if(d.fs){ if(d.fs==="0")ST.fs=1; else ST.fs=Math.min(1.6,Math.max(.8, ST.fs+(d.fs==="+"?.1:-.1))); ST.fs=Math.round(ST.fs*10)/10; save(); applyFs(); renderAjustes(); }
  else if(d.remind){
    ST.remind = (d.remind==="on"); save();
    if(ST.remind && "Notification" in window && Notification.permission==="default"){
      try{ Notification.requestPermission(); }catch(e){}
    }
    renderAjustes();
  }
  else if(d.nota){ showText("Nota sobre la Regla incorporada", B.meta.notaRegla); }
  else if(d.front){ showFront(); }
});
function showFront(){
  const m=B.meta;
  app.innerHTML='<div class="view"><div class="navday"><button data-back="ajustes">‹ Ajustes</button>'+
    '<div class="lbl"></div><span style="width:70px"></span></div>'+
    '<article class="card" style="text-align:center">'+
      '<img src="pelayo.jpg" alt="Don Pelayo con la Cruz de la Victoria (Covadonga)" '+
        'style="width:100%;max-width:320px;border-radius:12px;border:1px solid var(--rule);box-shadow:var(--shadow)">'+
      '<div class="eyebrow" style="margin-top:14px">'+esc(m.subtitle)+'</div>'+
      '<h2 style="margin:.1em 0">'+esc(m.title)+'</h2>'+
      '<div class="reglaref">'+esc(m.copyright)+' · '+esc(m.year)+' · '+esc(m.amdg)+'</div>'+
      '<div class="divider"></div>'+
      '<p class="meditation" style="text-align:left">'+esc(m.dedication||"")+'</p>'+
    '</article></div>';
  window.scrollTo(0,0);
}
function showText(title, paras){
  app.innerHTML='<div class="view"><div class="navday"><button data-back="ajustes">‹ Ajustes</button>'+
    '<div class="lbl"></div><span style="width:70px"></span></div>'+
    '<article class="card"><h2>'+esc(title)+'</h2><div class="meditation">'+
    paras.map(p=>"<p>"+esc(p)+"</p>").join("")+'</div></article></div>';
  window.scrollTo(0,0);
}

/* ---------- boot ---------- */
applyTheme(); applyFs();
setRoute("hoy");

/* splash: auto-dismiss + tap to skip */
(function(){
  const sp=$("#splash"); if(!sp) return;
  const hide=()=>sp.classList.add("hide");
  sp.addEventListener("click", hide);
  setTimeout(hide, 1900);
})();

/* daily local reminder — best-effort, only while the app is opened.
   Nota: un aviso programado con la app cerrada exige Web Push + backend
   (en iOS, solo en PWA instalada, iOS 16.4+); un sitio estático no lo cubre. */
(function(){
  if(!ST.remind || !("Notification" in window) || Notification.permission!=="granted") return;
  const key = new Date().toISOString().slice(0,10);
  if(ST.lastNotify===key) return;
  const t=resolve(TRE, TRE_IDX, {m:new Date().getMonth()+1, d:new Date().getDate()});
  if(t.item && !isDone(t.item.id)){
    try{ new Notification("Pon arriba los ojos", {body:"La lectura de hoy te espera.", icon:"icon-192.png"}); ST.lastNotify=key; save(); }catch(e){}
  }
})();

/* ---------- service worker + auto-update ---------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{
    navigator.serviceWorker.register("sw.js?v=1").then(reg=>{
      reg.update();
      setInterval(()=>reg.update(), 60*60*1000);
    }).catch(()=>{});
    let refreshing=false;
    navigator.serviceWorker.addEventListener("controllerchange", ()=>{
      if(refreshing) return; refreshing=true;
      const toast=$("#toast"); if(toast){ toast.classList.add("show"); }
      setTimeout(()=>location.reload(), 700);
    });
  });
}
})();
