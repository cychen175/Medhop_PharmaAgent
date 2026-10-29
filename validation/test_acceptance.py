from pathlib import Path
import sys,tempfile,json,sqlite3
ROOT=Path(__file__).resolve().parents[1]
(ROOT/'runtime').mkdir(exist_ok=True)
sys.path.insert(0,str(ROOT))
from governance import PrivateStore,ReviewGate,Catalog,drafts
from workflow import pair_evidence
examples=json.loads((ROOT/'data/examples.json').read_text(encoding='utf-8'))
pages=json.loads((ROOT/'data/pharma_pages.json').read_text(encoding='utf-8'))
checks=[]
def blocked(call):
    try:call()
    except ValueError:return
    raise AssertionError('Gate must block')
with tempfile.TemporaryDirectory(dir=ROOT/'runtime') as folder:
    s=PrivateStore(Path(folder)/'test.sqlite');g=ReviewGate(s)
    p=s.message('one',examples[5]['text'])['patient'];rid='gate-test';a=pair_evidence(p,pages)
    s.save_review(rid,p,{'assessment':a,'answer':'待藥師確認'})
    r=g.report('one',rid);assert r['state']=='handoff' and r['reasons'];checks.append('dual_drafts_and_handoff')
    blocked(lambda:g.delivery('one',rid));blocked(lambda:g.report('two',rid));checks.append('unapproved_and_cross_session_delivery_blocked')
    blocked(lambda:g.approve('one',rid,'test-pharmacist',{},True));checks.append('unresolved_items_blocked')
    s.disposition('one',rid,'contact_prescriber','測試隔離資料：尚待聯繫')
    g.save_draft('one',rid,r['pharmacist'],r['patient']+'\n隔離測試：非臨床交付文件。')
    resolutions={reason['id']:'隔離測試處理紀錄，非臨床判斷' for reason in r['reasons']}
    blocked(lambda:g.approve('one',rid,'test-pharmacist',resolutions,True));checks.append('pending_prescriber_contact_blocks_delivery')
    s.disposition('one',rid,'reviewed','隔離測試：驗證覆核閘門')
    blocked(lambda:g.approve('one',rid,'test-pharmacist',resolutions,False))
    g.approve('one',rid,'test-pharmacist',resolutions,True)
    assert 'test-pharmacist' in g.delivery('one',rid);checks.append('explicit_pharmacist_approval_delivery')
    blocked(lambda:g.save_draft('one',rid,'other','other'));checks.append('approved_report_immutable')
    s.message('one','過敏史：待藥師補充確認')
    blocked(lambda:g.delivery('one',rid));checks.append('patient_version_change_blocks_old_delivery')
    r=s.message('privacy','姓名：王小明，68歲男性\n電話：0912345678\n目前服用 Amlodipine 5mg QD')
    assert r['patient']['name']=='王小明'
    assert '0912345678' not in json.dumps(r,ensure_ascii=False)
    again=s.message('privacy2','姓名：王小明，68歲男性')
    assert again['patient']['id']==r['patient']['id'];checks.append('full_display_name_with_hmac_lookup_and_encrypted_storage')
    raw=(Path(folder)/'test.sqlite').read_bytes()
    assert '王小明'.encode() not in raw and b'0912345678' not in raw;checks.append('identity_original_encrypted_at_rest')
c=Catalog(ROOT);assert len(c.rows)==24839
assert all(r['有效日期']>='2026/10/23' for r in c.rows)
assert c.lookup('Amlodipine');checks.append('official_nonrevoked_unexpired_catalog')
print(json.dumps(checks,ensure_ascii=False,indent=2))
(ROOT/'runtime/governance-validation.json').write_text(json.dumps({'checks':checks,'all_passed':True},ensure_ascii=False,indent=2),encoding='utf-8')

