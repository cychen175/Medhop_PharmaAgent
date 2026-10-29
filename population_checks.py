"""Explicit population contraindications from verifiable original label quotations."""
from pathlib import Path
import json,hashlib
from workflow import key,literal_positions

class PopulationChecks:
    def __init__(self,root,pages):
        root=Path(root);self.rules=[]
        by_page={(p['file'],p['page']):p for p in pages}
        for rule in json.loads((root/'data/population_rules.json').read_text(encoding='utf-8'))['rules']:
            page=by_page[(rule['file'],rule['page'])]
            if rule['quote'] not in page['text'] or not literal_positions(page['text'],rule['ingredient_anchor']):raise ValueError('人口條件規則缺少原文支持')
            if hashlib.sha256((root/'data/drug_info'/rule['file']).read_bytes()).hexdigest()!=rule['pdf_sha256']:raise ValueError('人口條件規則來源已變更，需重新核對')
            self.rules.append({**rule,'ocr':bool(page.get('ocr')),'full_text':page['text']})
    def evaluate(self,patient):
        checks=[];sources=[];seen=set()
        for med in patient.get('medications',[]):
            if med['status']!='active':continue
            rules=[r for r in self.rules if key(med['name']) in {key(n) for n in r['names']}]
            for rule in rules:
                if patient.get('sex')=='男':continue
                state=patient.get('pregnancy','unknown')
                status='contraindicated' if state=='pregnant' else 'condition_unconfirmed' if state=='unknown' else 'not_applicable'
                signature=(key(med['name']),rule['id'],status)
                if signature in seen:
                    next(c for c in checks if key(c['drug'])==signature[0] and c['rule_id']==rule['id'])['med_ids'].append(med['id']);continue
                seen.add(signature)
                sid='C'+str(len(sources)+1)
                sources.append({'id':sid,'kind':'藥事 Agent 仿單'+(' · OCR，請核對 PDF' if rule['ocr'] else ''),'title':rule['file']+' · 第 '+str(rule['page'])+' 頁','file':rule['file'],'page':rule['page'],'text':rule['quote'],'full_text':rule['full_text'],'ocr':rule['ocr'],'origin':'moda-agent/data/drug_info/'+rule['file'],'url':'/documents/'+rule['file']+'#page='+str(rule['page'])})
                checks.append({'id':'population-'+str(med['id'])+'-'+rule['id'],'med_id':med['id'],'med_ids':[med['id']],'drug':med['name'],'condition':'pregnancy','status':status,'quote':rule['quote'],'source_ids':[sid],'rule_id':rule['id'],'pregnancy_weeks':patient.get('pregnancy_weeks'),'message':med['name']+' 不適合目前已知懷孕狀態：原仿單記載孕婦禁用。請在調劑前聯繫開方醫師確認處置。' if status=='contraindicated' else med['name']+' 的原仿單有孕婦禁用記載，請先確認是否懷孕。' if status=='condition_unconfirmed' else '目前未符合此來源的懷孕條件；不代表其他用藥條件均安全。','action':'contact_prescriber' if status=='contraindicated' else 'confirm_patient_condition','actual_product_confirmed':bool(med.get('license')),'scope':'以原始產品仿單的成分對應提出警示，仍需核對病人實際產品與原 PDF。'})
        return {'checks':checks,'sources':sources,'alerts':[c for c in checks if c['status']=='contraindicated'],'scope':'Only source-indexed population rules are checked; no matching rule does not establish safety.'}
