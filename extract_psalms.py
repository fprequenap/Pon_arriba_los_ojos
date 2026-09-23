# -*- coding: utf-8 -*-
from docx import Document
import re, json, os
SRC='/mnt/user-data/uploads/Salterio_Romano_Trinitario_COMPLETO__3_.docx'
P=[x.text for x in Document(SRC).paragraphs]
ART={'seal':'sea el','reinal':'Reina el','bendigal':'bendiga el','paral':'para el',
     'libral':'libra el','cuental':'cuenta el','hacial':'hacia el','cuidal':'cuida el',
     'contral':'contra el','abominal':'abomina el','mandel':'Mande el'}
def fix(s):
    def artrepl(m):
        tok=m.group(1); name=m.group(2)
        base=ART.get(tok.lower())
        if not base: return m.group(0)
        if tok[0].isupper(): base=base[0].upper()+base[1:]
        return base+' '+name
    s=re.sub(r'\b(\w+)\s+(Señor|Yahvé|Yahveh|Dios)\b', artrepl, s)
    s=re.sub(r'\bde Yahv[eé]h?\b','del Señor', s)
    s=re.sub(r'\ba Yahv[eé]h?\b','al Señor', s)
    s=re.sub(r'Yahv[eé]h?','Señor', s)
    s=s.replace('Jehová','Señor')
    return s
hdr=re.compile(r'^\s*SALMO\s+(\d+)\s*([A-Za-z])?\s*(\([^)]*\))?\s*$')
lat=re.compile(r'^\s*Psalmus\b', re.I)
sep=re.compile(r'^[\s·.]+$')
psalms={}; order=[]; cur=None; state=None
for t in P:
    s=t.strip(); m=hdr.match(s)
    if m:
        num=m.group(1)
        if num not in psalms:
            psalms[num]={'n':num,'latin':'','title':'','comment':'','verses':[]}; order.append(num)
        cur=psalms[num]; state='afterhdr'; continue
    if cur is None: continue
    if not s or sep.match(s):
        if sep.match(s): state='done'
        continue
    if state=='done': continue
    if lat.match(s):
        if not cur['latin']: cur['latin']=s
        state='title'; continue
    if state=='title':
        if not cur['title']: cur['title']=fix(s); state='comment'; continue
    if state=='comment':
        if not cur['comment']: cur['comment']=fix(s); state='body'; continue
    cur['verses'].append(fix(s))
for n,p in psalms.items():
    if not p['title']:
        p['title']='La excelencia de la Ley de Dios' if n=='118' else ('Salmo '+n)
print('psalms parsed:', len(psalms), '| empty titles now:', [n for n,p in psalms.items() if not p['title']])
def dump(n):
    p=psalms.get(n)
    if not p: return
    print('--- Salmo %s: %s (%s) verses=%d' % (n, p['title'], p['latin'], len(p['verses'])))
    for v in p['verses'][:3]: print('    ', v[:110])
for n in ['2','22','50','113','118','82','150']: dump(n)
res=sum(x['title'].count('Yahvé')+x['comment'].count('Yahvé')+sum(v.count('Yahvé') for v in x['verses']) for x in psalms.values())
print('residual Yahvé after fix:', res)
with open('app/psalms.js','w',encoding='utf-8') as f:
    f.write('window.PSALMS='); json.dump(psalms,f,ensure_ascii=False,separators=(',',':')); f.write(';')
print('psalms.js bytes:', os.path.getsize('app/psalms.js'))
