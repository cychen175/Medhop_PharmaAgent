from pathlib import Path
import tempfile,sys,json
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from governance import PrivateStore,ReviewGate
from workflow import pair_evidence
text='新病人王小明，68 歲男性。五月裝過心臟支架，有胃食道逆流，目前吃 Clopidogrel 75mg、Aspirin 100mg、Atorvastatin 40mg，都是一天一次。'
with tempfile.TemporaryDirectory(dir=ROOT/'runtime') as folder:
 store=PrivateStore(Path(folder)/'records.sqlite3')
 r=store.message('chat',text);p=r['patient'];assert r['action']=='created' and p['id'].startswith('P-')
 assert p['name']=='王小明' and p['age']==68 and p['sex']=='男'
 assert p['history']==['五月裝過心臟支架，有胃食道逆流']
 assert [(m['name'],m['dose'],m['frequency']) for m in p['medications']]==[('Clopidogrel','75mg','一天一次'),('Aspirin','100mg','一天一次'),('Atorvastatin','40mg','一天一次')]
 assert p['pregnancy']=='unknown' and p['lactation']=='unknown'
 again=store.message('another','病人王小明，68歲男性')['patient'];assert again['id']==p['id'] and len(store.list())==1
 store.save_review('chat-review',p,{'assessment':pair_evidence(p,[]),'answer':'待藥師確認'})
 q=store.message('chat','目前懷孕12週，正在哺乳')['patient'];assert q['pregnancy']=='pregnant' and q['pregnancy_weeks']==12 and q['lactation']=='breastfeeding' and len(q['medications'])==3
 try:ReviewGate(store).report('chat','chat-review')
 except ValueError:pass
 else:raise AssertionError('Old patient context report allowed')
 assert store.message('chat','目前沒有懷孕，沒有哺乳')['patient']['pregnancy_weeks'] is None
 result={'all_passed':True,'exact_user_sentence':True,'system_generated_id':True,'age_sex_history_preserved':True,'three_medications_exact_doses_shared_frequency':True,'existing_name_no_duplicate':True,'natural_pregnancy_lactation_update':True,'stale_review_blocked':True,'live_patients_created':0}
 (ROOT/'validation/chat-input-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=False))
