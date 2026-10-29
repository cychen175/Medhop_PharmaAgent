"""Verified product-owned label table rows; independent of model availability."""
from pathlib import Path
import json,hashlib,re
from workflow import key,stamp

ALIASES=('BAKTAR','撲菌特錠400毫克','撲菌特錠','撲菌特')
COMPONENTS=('Sulfamethoxazole','Trimethoprim')
def is_baktar(name):return key(name) in {key(n) for n in ALIASES}
def compound_line(line):
    if not any(re.search(re.escape(a),line,re.I) for a in ALIASES):return line
    # Explicit ingredient description belongs to this product, not separate prescriptions.
    clause=re.search(r'成分(?:是|為|含|包含)[^，,。；;\n]*',line,re.I)
    if clause and all(re.search(re.escape(n),clause[0],re.I) for n in COMPONENTS):line=line[:clause.start()]+line[clause.end():]
    for alias in sorted(ALIASES,key=len,reverse=True):line=re.sub(re.escape(alias),' BAKTAR ',line,flags=re.I)
    return re.sub(r'BAKTAR(?:\s+BAKTAR)+','BAKTAR',line,flags=re.I)

def repair_compounds(db,pid):
    rows=[dict(r) for r in db.execute("SELECT * FROM patient_meds WHERE patient_id=? AND status='active'",(pid,))]
    events=[r[0] for r in db.execute('SELECT body FROM patient_events WHERE patient_id=?',(pid,))]
    changed=False
    for parent in rows:
        if not is_baktar(parent['name']):continue
        for event in events:
            if not re.search(r'成分(?:是|為|含|包含)',event) or not any(a.lower() in event.lower() for a in ALIASES) or not all(n.lower() in event.lower() for n in COMPONENTS):continue
            if parent['body'] not in event:continue
            for child in rows:
                if key(child['name']) not in {key(n) for n in COMPONENTS} or child['created']!=parent['created'] or child['body'] not in event:continue
                db.execute("UPDATE patient_meds SET status='component',updated=? WHERE id=?",(stamp(),child['id']));changed=True
            from workflow import medications
            parsed=next((m for m in medications(event) if is_baktar(m['name'])),None)
            if parsed and not parent['frequency'] and parsed['frequency']:
                db.execute('UPDATE patient_meds SET frequency=?,updated=? WHERE id=?',(parsed['frequency'],stamp(),parent['id']));changed=True
    if changed:db.execute('INSERT INTO patient_events(patient_id,body,source,created) VALUES(?,?,?,?)',(pid,'將明確成分描述合回 BAKTAR 複方，原始成分列保留於歷史紀錄。','複方成分紀錄修正',stamp()))
    return changed

class LabelInteractions:
    def __init__(self,root,pages):
        root=Path(root);self.rules=[]
        self.supplement=json.loads((root/'data/supplemental_label_warning.json').read_text(encoding='utf-8'))
        for rule in json.loads((root/'data/label_interaction_rules.json').read_text(encoding='utf-8'))['rules']:
            page=next(p for p in pages if p['file']==rule['file'] and p['page']==rule['page'])
            first=next(p for p in pages if p['file']==rule['file'] and p['page']==1)
            assert rule['quote'] in page['text'] and rule['product_anchor'] in first['text'] and all(n.lower() in first['text'].lower() for n in rule['components'])
            assert hashlib.sha256((root/'data/drug_info'/rule['file']).read_bytes()).hexdigest()==rule['pdf_sha256']
            self.rules.append({**rule,'full_text':page['text']})
    def evaluate(self,patient):
        meds=[m for m in patient['medications'] if m['status']=='active'];alerts=[];sources=[]
        baktar_pair=any(is_baktar(m['name']) for m in meds) and any(key(m['name'])=='glibenclamide' for m in meds)
        for r in (self.rules if baktar_pair else []):
            sid='L'+str(len(sources)+1)
            sources.append({'id':sid,'kind':'藥事 Agent 原始仿單交互作用表','file':r['file'],'page':r['page'],'title':r['file']+' · 第 4 頁','text':r['quote'],'full_text':r['full_text'],'ocr':False,'origin':'moda-agent/data/drug_info/'+r['file'],'url':'/documents/'+r['file']+'#page=4'})
            alerts.append({'status':'interaction','message':'BAKTAR × Glibenclamide：仿單記載可能增強降血糖效果，造成低血糖。請藥師核對實際產品、血糖狀況與用藥，並聯繫開方醫師確認處置。','quote':r['quote'],'source_ids':[sid],'scope':'依 BAKTAR 原仿單第 1 頁確認複方成分、第 4 頁交互作用表核對；並非 MedHop 推論。','drugs':['BAKTAR','Glibenclamide']})
        names={key(m['name']) for m in meds}
        if {'sildenafil','tadalafil'} <= names:
            r=self.supplement;sid='L'+str(len(sources)+1)
            sources.append({'id':sid,'kind':'補充原廠仿單','file':'Pfizer-VIAGRA-5.7','page':None,'title':r['title'],'text':r['quote'],'full_text':r['section']+'\n'+r['quote']+'\n'+r['scope'],'ocr':False,'origin':r['url'],'url':r['url'],'verified_on':r['verified_on']})
            alerts.append({'status':'interaction','message':'Sildenafil × Tadalafil：兩者皆為 PDE5 抑制劑，原廠仿單提醒此類藥物合用可能進一步降低血壓，不建議合用。請藥師確認是否同時使用、最後服藥時間與血壓狀況，並聯繫開方醫師核對處置。','quote':r['quote'],'source_ids':[sid],'scope':r['scope'],'drugs':['Sildenafil','Tadalafil']})
        return {'alerts':alerts,'sources':sources}
    def apply(self,patient,assessment):
        result=self.evaluate(patient);assessment['interaction_alerts']=result['alerts']
        assessment['sources'].extend(result['sources'])
        for pair in assessment['pairs']:
            for alert in result['alerts']:
                matched=({key(n) for n in pair['drugs']}=={key(n) for n in alert['drugs']})
                if not matched and alert['drugs']==['BAKTAR','Glibenclamide']:
                    matched=len(pair['drugs'])==2 and any(is_baktar(n) for n in pair['drugs']) and any(key(n)=='glibenclamide' for n in pair['drugs'])
                if matched:
                    pair.update(status='interaction',quote=alert['quote'],source_ids=alert['source_ids'],action='contact_prescriber',reason=alert['message'],classification_method='verified_label_warning')
        return result
