from pathlib import Path
import json,sys,tempfile
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from workflow import PatientStore,identity,medications,pair_evidence,accept_classification,directly_paired,canonical
examples=json.loads((ROOT/'data/examples.json').read_text(encoding='utf-8'))
for e in examples:
    assert 'id' not in identity(e['text']), (e['name'],identity(e['text']))
assert identity(examples[0]['text'])['name']=='周○○'
assert [m['name'] for m in medications(examples[0]['text'])]==['AUGMENTIN TAB','NAPROXEN','EXFORGE','LORAZEPAM','Valsartan','SILYMARIN','ALINAMIN F','NATRILIX SR']
assert len(medications(examples[1]['text']))==5
assert not medications('過敏史：Penicillin (皮疹), Sulfa drugs (Stevens-Johnson syndrome)')
assert not medications('可以停用 Warfarin 嗎？')
assert not medications('可以吃 Ibuprofen 嗎？')
assert medications('目前服用阿斯匹靈')[0]['name']=='阿斯匹靈'
assert medications('已停用 Warfarin')[0]['status']=='stopped'
assert identity('病人王小明，68歲男性')['name']=='王小明'
assert len(medications('目前吃 Clopidogrel 75mg、Aspirin 100mg，都是一天一次。'))==2
assert len(medications('自己買了 Ibuprofen 來吃，一天兩三次。'))==1
with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as temp:
    store=PatientStore(Path(temp)/'test.sqlite')
    r=store.message('one','病人王小明，68歲男性')
    assert r['action']=='created' and not r['patient']['medications']
    pid=r['patient']['id']
    r=store.message('one','目前吃 Clopidogrel 75mg、Aspirin 100mg，都是一天一次。')
    assert r['action']=='updated' and len(r['patient']['medications'])==2 and r['review_needed']
    r=store.message('two','病人王小明，68歲男性')
    assert r['action']=='found' and r['patient']['id']==pid
    assert len(store.list())==1
    r=store.message('one','今天腸胃科開了 Omeprazole 20mg QD')
    assert len(r['patient']['medications'])==3
    r=store.message('one','自己買了 Ibuprofen 來吃，一天兩三次。')
    assert len(r['patient']['medications'])==4
    r=store.message('one','今天腸胃科開了 Omeprazole 20mg QD')
    assert len(r['patient']['medications'])==4
    r=store.message('three','Amlodipine 5mg QD\nWarfarin 5mg QD')
    assert r['action']=='need_identity'
    r=store.message('three','姓名：黃○雄，男，45歲')
    assert r['action']=='created' and len(r['patient']['medications'])==2
    r=store.message('one','病人王小明，70歲男性')
    assert r['action']=='ambiguous' and len(store.list())==2
    store.select('one',pid)
    original=store.get(pid)
    store.save_review('stale-check',original,{'test':'record-version'})
    store.message('one','已停用 Omeprazole')
    assert any(m['name']=='Omeprazole' and m['status']=='stopped' for m in store.get(pid)['medications'])
    try:
        store.disposition('one','stale-check','reviewed','此為舊版本檢查的測試')
        raise AssertionError('Stale review accepted')
    except ValueError as exc:
        assert '變更' in str(exc)
    store.reset('one')
    assert store.active('one') is None
pages=json.loads((ROOT/'data/pharma_pages.json').read_text(encoding='utf-8'))
ex=next(e for e in examples if e['name']=='藥物交互作用案例')
patient={'id':'unit-test','version':1,'medications':[{**m,'name_key':m['name'].lower()} for m in medications(ex['text'])]}
review=pair_evidence(patient,pages)
assert len(review['pairs'])==10
assert not any(p['status'] in {'interaction','avoid'} for p in review['pairs'])
assert all(not p['source_ids'] or p['status'] in {'review','no_effect_reported'} for p in review['pairs'])
assert sum(p['status']=='no_effect_reported' for p in review['pairs'])==1
lookup={s['id']:s for s in review['sources']}
for pair in review['pairs']:
    if pair['quote']:assert pair['quote'] in lookup[pair['source_ids'][0]]['text']
actual_pair={'id':'source-check','version':1,'medications':[{'name':n,'name_key':n.lower(),'status':'active','dose':'','frequency':'','body':n} for n in ['Amlodipine','Tacrolimus']]}
positive=pair_evidence(actual_pair,pages)
assert positive['pairs'][0]['status']=='interaction',positive['pairs']
positive_sources={s['id']:s for s in positive['sources']}
assert positive['pairs'][0]['quote'] in positive_sources[positive['pairs'][0]['source_ids'][0]]['text']
actual_page=next(p for p in pages if p['file']=='AC59887100.pdf' and p['page']==8)
assert not directly_paired(canonical(actual_page['text']),['Cimetidine','Warfarin'])
print(json.dumps({'parser':'passed','create_lookup_incremental_meds':'passed','cross_session_lookup':'passed','id_QID_regression':'passed','allergy_and_alternatives_excluded':'passed','pending_identity':'passed','ambiguous_patient':'passed','original_case_pairs':len(review['pairs']),'original_case_sources':len(review['sources']),'source_bound_pairs':sum(bool(p['source_ids']) for p in review['pairs'])},ensure_ascii=False),flush=True)
