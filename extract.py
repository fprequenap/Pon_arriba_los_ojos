# -*- coding: utf-8 -*-
from docx import Document
import re, json, os

SRC='/mnt/user-data/uploads/Pon_arriba_los_ojos.docx'
d=Document(SRC)
P=[p.text for p in d.paragraphs]
N=len(P)

MONTHS={'Enero':1,'Febrero':2,'Marzo':3,'Abril':4,'Mayo':5,'Junio':6,'Julio':7,'Agosto':8,
        'Setiembre':9,'Septiembre':9,'Octubre':10,'Noviembre':11,'Diciembre':12}
MN='(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Setiembre|Septiembre|Octubre|Noviembre|Diciembre)'
tri_mid=re.compile(MN+r'\s*\d+\s*·')                 # treatise date line (middots)
tri_dot=re.compile(r'^'+MN+r'\s*\d+\s*\.\s*'+MN)     # regla date line (periods)
is_book=re.compile(r'^Libro\s+(Primero|Segundo|Tercero|Cuarto|Quinto|Sexto)\s*$', re.I)
is_chap=re.compile(r'^Cap[ií]tulo\s+([IVXLC]+)\.?\s*(.*)$')
rs_split=re.compile(r'^\s*Regla:\s*(.*?)\s*—\s*Salterio:\s*(.*)$')

def dates_of(s):
    return [{'m':MONTHS[m],'d':int(n)} for m,n in re.findall(MN+r'\s*(\d+)', s)]

def key_of(s):
    mo=re.match(MN+r'\s*\d+', s); return mo.group(0) if mo else None

# locate section boundaries
regla_head=next(i for i in range(800,N) if P[i].strip().upper().startswith('REGLA SAN BENITO'))
# glossary = maximal trailing run of "Term. definition" lines (alphabetical). find its start.
def looks_glossary(s):
    return bool(re.match(r'^[A-ZÁÉÍÓÚÑ][^.]{1,70}(\([^)]*\))?\.\s+\S', s))
gloss_start=None
i=N-1
# walk up while lines look like glossary entries (allow blanks)
last=None
for i in range(N-1, regla_head, -1):
    s=P[i].strip()
    if not s: continue
    if looks_glossary(s):
        gloss_start=i
    else:
        break
# gloss_start now = topmost glossary line
GLO=gloss_start

# ---------- FRONT MATTER (robust: skip blank paragraphs) ----------
first_book=next(i for i,t in enumerate(P) if is_book.match(t.strip()))
front=[P[i].strip() for i in range(0, first_book) if P[i].strip()]

def capname(s):
    s=s.replace('©','').strip()
    low={'de','del','la','las','los','y'}
    out=[]
    for w in s.split():
        if w.lower() in low and out: out.append(w.lower())
        elif w.isalpha(): out.append(w[:1].upper()+w[1:].lower())
        else: out.append(w)
    return '© '+' '.join(out)

def find(pred, default=''):
    for x in front:
        if pred(x): return x
    return default

copy_raw = find(lambda x: x.startswith('©'))
year_raw = find(lambda x: re.fullmatch(r'[mdclxvi]{2,}', x.lower()))
amdg_raw = find(lambda x: x.upper()=='AMDG')
nota_tit = find(lambda x: x.lower().startswith('nota sobre la regla'))
dedic    = find(lambda x: x.startswith('A ') and 'Gambra' in x) or find(lambda x: x.startswith('A ') and len(x)>40)

meta={
 'title':front[0] if front else 'PON ARRIBA LOS OJOS',
 'subtitle':front[1] if len(front)>1 else '',
 'copyright':capname(copy_raw) if copy_raw else '© Francisco de Paula Requena Paredes',
 'year':year_raw.upper() if year_raw else 'MMXXVI',
 'amdg':amdg_raw or 'AMDG',
 'notaReglaTitulo':nota_tit or 'Nota sobre la Regla incorporada',
 'buyUrl':'https://amzn.eu/d/06RM5TL8',
 'email':'fprequenap@gmail.com',
}
# nota paragraphs = those after the nota title, excluding front-page items
skip={copy_raw, year_raw, amdg_raw, dedic, nota_tit, meta['title'], meta['subtitle']}
nota=[]
seen_tit=False
for x in front:
    if x==nota_tit: seen_tit=True; continue
    if seen_tit and x not in skip: nota.append(x)
meta['notaRegla']=nota

# ---------- TREATISE ----------
books=[]; cur_book=None; cur_chap=None; seen=set()
i=59
while i < regla_head:
    s=P[i].strip()
    if not s: i+=1; continue
    if is_book.match(s):
        # book title on next non-empty line
        title=''
        j=i+1
        while j<regla_head and not P[j].strip(): j+=1
        if j<regla_head and not is_chap.match(P[j].strip()) and not tri_mid.match(P[j].strip()):
            title=P[j].strip(); nxt=j+1
        else: nxt=i+1
        cur_book={'n':s.split()[1],'title':title,'chapters':[]}
        books.append(cur_book); cur_chap=None
        i=nxt; continue
    mc=is_chap.match(s)
    if mc:
        roman=mc.group(1); inline=mc.group(2).strip()
        title=inline
        j=i+1
        if not title:
            while j<regla_head and not P[j].strip(): j+=1
            if j<regla_head and not tri_mid.match(P[j].strip()):
                title=P[j].strip(); j+=1
        cur_chap={'roman':roman,'title':title,'entries':[]}
        if cur_book is None:
            cur_book={'n':'Primero','title':'','chapters':[]}; books.append(cur_book)
        cur_book['chapters'].append(cur_chap)
        i=j; continue
    if tri_mid.match(s):
        k=key_of(s)
        # gather RSHEAD + body until next structural marker
        rs=P[i+1].strip() if i+1<regla_head else ''
        body=[]; j=i+2
        while j<regla_head:
            t=P[j].strip()
            if not t: j+=1; continue
            if tri_mid.match(t) or is_chap.match(t) or is_book.match(t): break
            body.append(t); j+=1
        if k in seen:   # duplicate (Cap IV block) -> skip
            i=j; continue
        seen.add(k)
        m=rs_split.match(rs)
        entry={'dates':dates_of(s),
               'regla': m.group(1).strip() if m else '',
               'salterio': m.group(2).strip() if m else '',
               'rs': rs,
               'body': body}
        if cur_chap is None:
            cur_chap={'roman':'','title':'','entries':[]}; cur_book['chapters'].append(cur_chap)
        cur_chap['entries'].append(entry)
        i=j; continue
    i+=1

# ---------- REGLA APPENDIX ----------
regla={'heading':P[regla_head].strip(),'edition':'','dedic':[],'chapters':[]}
# edition note (845) + dedicatoria (846-847) sit just above regla_head
for i in range(regla_head-6, regla_head):
    s=P[i].strip()
    if s.startswith('Según el reimpreso'): regla['edition']=s
    elif s and s!='* * *' and not s.upper().startswith('REGLA'):
        regla['dedic'].append(s)

cur=None
end=GLO if GLO else N
def is_reglahdr(s):
    return bool(re.match(r'^(PRÓLOGO|CAP[IÍ]TULO)\b', s.upper()))
pending=None; last=None
for i in range(regla_head+1, end):
    s=P[i].strip()
    if not s or s=='* * *' or s.upper()=='CAPÍTULOS': continue
    if s.upper()=='APÉNDICE': break
    if s.upper() in ('RESÚMEN','RESUMEN'):
        cur={'head':'RESUMEN','title':'','portions':[],'extra':True}
        regla['chapters'].append(cur); last=None; pending=None; continue
    if cur is not None and cur.get('extra') and not cur['title'] and not cur['portions']:
        cur['title']=s[0].upper()+s[1:]; continue
    if tri_dot.match(s):
        pending=dates_of(s); continue
    if is_reglahdr(s):
        mo=re.match(r'^(PR[ÓO]LOGO|CAP[IÍ]TULO\s+[A-ZÁÉÍÓÚ0-9]+)\.?\s*(.*)$', s, re.I)
        cur={'head':(mo.group(1) if mo else s).strip(),'title':(mo.group(2) if mo else '').strip(),'portions':[]}
        regla['chapters'].append(cur); last=None; continue
    if cur is None:
        cur={'head':'PRÓLOGO','title':'','portions':[]}; regla['chapters'].append(cur)
    if pending is not None:
        last={'dates':pending,'text':[]}; cur['portions'].append(last); pending=None
    if last is None:
        last={'dates':[],'text':[]}; cur['portions'].append(last)
    last['text'].append(s)

# ---------- GLOSSARY ----------
glos=[]
if GLO:
    for i in range(GLO, N):
        s=P[i].strip()
        if not s: continue
        mo=re.match(r'^([A-ZÁÉÍÓÚÑ][^.]{1,80}?(?:\([^)]*\))?)\.\s+(.*)$', s)
        if mo: glos.append({'term':mo.group(1).strip(),'def':mo.group(2).strip()})
        elif glos: glos[-1]['def']+=' '+s

for b in books:
    b['chapters']=[c for c in b['chapters'] if c['entries']]
DATA={'meta':meta,'books':books,'regla':regla,'glossary':glos}

# ---- diagnostics ----
tre=sum(len(c['entries']) for b in books for c in b['chapters'])
print('books:',len(books),'| chapters:',sum(len(b['chapters']) for b in books),'| treatise entries:',tre)
for b in books:
    print('  Libro',b['n'],'-',b['title'],'|',len(b['chapters']),'caps',
          sum(len(c['entries']) for c in b['chapters']),'entries')
print('regla chapters:',len(regla['chapters']),
      '| regla portions:',sum(len(c['portions']) for c in regla['chapters']))
print('glossary terms:',len(glos), '| first:',glos[0]['term'] if glos else None,'| last:',glos[-1]['term'] if glos else None)

os.makedirs('/home/claude/pon/app',exist_ok=True)
with open('/home/claude/pon/app/content.js','w',encoding='utf-8') as f:
    f.write('window.BOOK=')
    json.dump(DATA,f,ensure_ascii=False,separators=(',',':'))
    f.write(';')
print('content.js bytes:', os.path.getsize('/home/claude/pon/app/content.js'))
# sample
e=books[0]['chapters'][0]['entries'][0]
print('SAMPLE entry dates',e['dates'],'| regla',e['regla'],'| salterio',e['salterio'],'| body paras',len(e['body']))
print('   body[0]:',e['body'][0][:120])
