"""Join medication pairs to original label quotations and MedHop source paths.
Research connectivity never becomes a clinical interaction verdict. No new
synonyms, dosing rules or pharmacological facts are supplied here.
"""
from collections import defaultdict, deque
import re
from workflow import key, literal_positions

INTERMEDIATES={'PROTEIN','GENE','ENZYME','RECEPTOR','PATHWAY','BIOLOGICAL_PROCESS','COMPLEX'}
QUALIFIERS=re.compile(r'\b(?:no|not|neither|without|failed|lack|unlike|however|although)\b|未發現|無顯著|沒有|不會',re.I)

class PairIntegration:
    def __init__(self,corpus):
        self.corpus=corpus
        self.entities=corpus.graph.by_title
        self.drugs={key(title):title for title,row in self.entities.items() if row.get('type')=='DRUG' or re.fullmatch(r'DB\d+',title)}
        self.support_cache={}
    def candidates(self,query):
        q=key(query)
        if not q:return []
        rows=[{'title':title,'type':self.entities[title].get('type'),'entity_id':str(self.entities[title]['id'])} for k,title in self.drugs.items() if q in k]
        rows.sort(key=lambda r:(key(r['title'])!=q,r['title']))
        return rows[:30]
    def resolve(self,med):
        supplied=med.get('medhop_entity') or ''
        if supplied:
            title=self.drugs.get(key(supplied))
            if title:return {'input':med['name'],'entity':title,'method':'pharmacist_confirmed','identity_source':med.get('medhop_identity_source',''),'identity_note':med.get('medhop_identity_note','')}
        title=self.drugs.get(key(med['name']))
        return {'input':med['name'],'entity':title,'method':'exact_name' if title else 'unmapped','identity_source':'data/medhop/entities.parquet' if title else ''}
    def supported_units(self,edge):
        ident=str(edge['id'])
        if ident not in self.support_cache:
            self.support_cache[ident]=[self.corpus.unitmap[str(uid)] for uid in edge.get('text_unit_ids',[]) if str(uid) in self.corpus.unitmap and all(literal_positions(self.corpus.unitmap[str(uid)]['text'],n) for n in [edge['source'],edge['target']])]
        return self.support_cache[ident]
    def paths(self,left,right,stop=None,limit=3,max_edges=3):
        # Do not traverse a third drug or a common disease and present it as a
        # drug-mechanism chain. Every admitted edge needs both names in a unit.
        queue=deque([(left,[left],[])])
        found=[];expanded=0
        while queue and expanded<10000:
            if stop and stop.is_set():return []
            current,nodes,edges=queue.popleft();expanded+=1
            for edge in sorted(self.corpus.graph.adjacency.get(current,[]),key=lambda r:str(r['human_readable_id'])):
                other=edge['target'] if edge['source']==current else edge['source']
                if other in nodes or not self.supported_units(edge):continue
                next_nodes=nodes+[other];next_edges=edges+[edge]
                if other==right:
                    found.append({'nodes':next_nodes,'edges':next_edges})
                    if len(found)>=limit:return found
                elif len(next_edges)<max_edges and self.entities.get(other,{}).get('type') in INTERMEDIATES:
                    queue.append((other,next_nodes,next_edges))
        return found
    def join(self,patient,assessment,stop=None):
        meds={key(m['name']):m for m in patient['medications'] if m['status']=='active'}
        mapping={name:self.resolve(med) for name,med in meds.items()}
        sources=assessment['sources'];by_unit={s.get('unit_id'):s['id'] for s in sources if s.get('unit_id')}
        next_id=max([int(s['id'][1:]) for s in sources if re.fullmatch(r'M\d+',s['id'])]+[0])+1
        def source(unit):
            nonlocal next_id
            uid=str(unit['id'])
            if uid not in by_unit:
                docids=unit.get('document_ids',[])
                if isinstance(docids,str):docids=[docids]
                docs=[self.corpus.docmap[str(d)] for d in docids if str(d) in self.corpus.docmap]
                ident='M'+str(next_id);next_id+=1;by_unit[uid]=ident
                sources.append({'id':ident,'kind':'MedHop 配對支持原文','title':'; '.join(str(d.get('title','')) for d in docs) or 'MedHop 支持文本','unit_id':uid,'record_id':str(unit.get('human_readable_id','')),'text':str(unit['text']),'full_text':str(unit['text']),'file':None,'origin':'data/medhop/text_units.parquet'})
            return by_unit[uid]
        for pair in assessment['pairs']:
            if stop and stop.is_set():break
            identities=[mapping[key(n)] for n in pair['drugs']]
            research={'identities':identities,'paths':[],'source_ids':[],'clinical_evidence':False,'label':'待藥師確認'}
            pair['medhop']=research
            if not all(i['entity'] for i in identities):
                research.update(status='unmapped',message='MedHop 未精確對應：'+'、'.join(i['input'] for i in identities if not i['entity'])+'。請核對藥名或研究識別碼；未以模型猜測別名。')
            elif identities[0]['entity']==identities[1]['entity']:
                research.update(status='same_entity',message='兩筆用藥對應同一研究實體，請先核對是否同成分或識別碼誤配；不當作兩種不同藥物的交互作用。')
            else:
                left,right=[i['entity'] for i in identities]
                for path in self.paths(left,right,stop):
                    admitted=[];path_refs=[]
                    for index,edge in enumerate(path['edges']):
                        units=self.supported_units(edge)[:2];refs=[source(u) for u in units];path_refs.extend(refs)
                        admitted.append({'id':str(edge['human_readable_id']),'source':str(edge['source']),'target':str(edge['target']),'description':str(edge.get('description','')),'source_ids':refs,'traversed_reverse':edge['source']!=path['nodes'][index],'qualified_text':any(QUALIFIERS.search(str(u['text'])) for u in units)})
                    research['paths'].append({'nodes':path['nodes'],'edges':admitted,'source_ids':list(dict.fromkeys(path_refs))})
                refs=list(dict.fromkeys(ref for path in research['paths'] for ref in path['source_ids']))
                if refs:
                    research.update(status='mechanism_candidate',source_ids=refs,message='研究圖譜存在此兩藥間的來源連結，僅供核對可能機轉；連線與共同標靶不等於已證實臨床交互作用。')
                else:
                    co_units=[u for u in self.corpus.unitmap.values() if all(literal_positions(u['text'],n) for n in [left,right])][:2]
                    if co_units:research.update(status='co_mention',source_ids=[source(u) for u in co_units],message='研究原文同時提及此兩個實體，但未找到每條邊均有原文支持的配對機轉路徑；共同出現不代表交互作用。')
                    else:research.update(status='no_supported_path',message='兩藥已對應研究實體，但現有 MedHop 未找到可逐邊核對的配對路徑；不能據此排除交互作用。')
            positive=pair['status'] in {'avoid','interaction'}
            pair['integration']={'status':'label_warning' if positive else 'research_candidate' if research['status']=='mechanism_candidate' else 'review_required','label':'仿單記載併用影響，調劑前需複核' if positive else '研究機轉線索，待藥師判讀' if research['status']=='mechanism_candidate' else '來源或病人條件仍待核對','automatic_dispensing':False,'pharmacy_source_ids':list(pair['source_ids']),'medhop_source_ids':list(research['source_ids'])}
        summary=defaultdict(int)
        for pair in assessment['pairs']:summary[pair.get('medhop',{}).get('status','not_completed')]+=1
        assessment['integration_summary']={'pair_count':len(assessment['pairs']),'pharmacy':'原 moda-agent 的 100 份仿單','medhop':'既有 MedHop 圖譜及原始支持文本','research_status_counts':dict(summary),'mapping_method':'精確藥名或有來源紀錄的藥師核對識別碼','clinical_inference_from_graph':False}
        return assessment
