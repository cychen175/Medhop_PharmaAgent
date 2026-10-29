'use strict';
// Plain browser JavaScript; source-based drafts and explicit pharmacist gate.
const baseDisposition=renderDisposition;
const baseAssessment=renderAssessment;
renderAssessment=function(target,result,sources){baseAssessment(target,result,sources);if(result.medication_checks?.length){const section=el('details','all-evidence');section.append(el('summary','','逐項比對藥品資訊、劑量與用法（待藥師確認）'));for(const check of result.medication_checks){const row=el('section','pair-card');row.append(el('b','',check.name),el('p','',`輸入規格／用量：${check.recorded_dose||'未提供'} · 頻次：${check.recorded_frequency||'未提供'}`),el('p','',check.message));if(check.product){row.append(el('p','',check.product['中文品名']+' · '+check.product['許可證字號']),el('blockquote','',check.product['用法用量']||'官方未提供用法用量'));}section.append(row);}target.append(section);}};
renderDisposition=function(target,job){baseDisposition(target,job);const host=el('section','reports-host');target.append(host);renderDualReports(host,job.id);};
async function renderDualReports(host,id){
  host.replaceChildren(el('p','muted','正在讀取用藥說明…'));
  try{
    const report=await api('/api/reports/'+id);host.replaceChildren();
    const heading=el('div','report-heading');heading.append(el('h3','','用藥說明'),el('span','pending-pill',report.approval?'已確認':'草稿 · 尚未交付'));host.append(heading);
    host.append(el('p','muted',report.approval?'此版本已由覆核藥師確認。':'以下可先閱讀；只有要交付或列印給病人時，才需要完成核對。'));
    const preview=el('div','patient-guide-preview');preview.append(el('h4','','給病人與照顧者'));for(const line of report.patient.split(/\n+/).filter(Boolean))preview.append(el('p','',line));host.append(preview);
    const professional=el('details','optional-action');professional.append(el('summary','','藥師摘要與來源'));const clean=report.pharmacist.replace(/\[PENDING [^\]]+\]\s*/g,'待核對：').replace(/^仿單檢索：.*$/gm,'').trim();for(const line of clean.split(/\n+/).filter(Boolean))professional.append(el('p','summary-line',line));host.append(professional);
    if(report.approval){const link=el('a','btn btn-primary','開啟已確認說明／列印');link.href='/api/reports/'+id+'/delivery';link.target='_blank';link.rel='noopener';host.append(link);return;}
    const edit=el('details','optional-action');edit.append(el('summary','','編輯說明（選用）'));const pharmacy=el('textarea'),guide=el('textarea');pharmacy.value=clean;guide.value=report.patient;
    for(const [title,field,label] of [['藥師摘要',pharmacy,'藥師摘要草稿'],['給病人與照顧者',guide,'白話用藥說明草稿']]){const card=el('label','compact-report-editor');card.append(el('span','',title));field.rows=6;field.maxLength=16000;field.setAttribute('aria-label',label);card.append(field);edit.append(card);}
    const save=button('儲存草稿',async()=>{save.disabled=true;try{await api('/api/reports/draft',{review:id,pharmacist:pharmacy.value,patient:guide.value});preview.replaceChildren(el('h4','','給病人與照顧者'));for(const line of guide.value.split(/\n+/).filter(Boolean))preview.append(el('p','',line));professional.querySelectorAll('.summary-line').forEach(line=>line.remove());for(const line of pharmacy.value.split(/\n+/).filter(Boolean))professional.append(el('p','summary-line',line));toast('已儲存草稿，尚未交付');}catch(err){toast(err.message);}finally{save.disabled=false;}},'btn btn-quiet');edit.append(save);host.append(edit);
    const delivery=el('details','optional-action delivery-confirmation');delivery.append(el('summary','','交付／列印前確認'));
    delivery.append(el('p','muted','只有需要交付時才填寫。請先記錄實際處置，並在「編輯說明」修訂、儲存核對後的草稿。'));
    const form=el('form','approval-form');
    const issues=el('details','review-scope');issues.append(el('summary','',`查看 ${report.reasons.length} 項待核對清單（不用逐項填表）`));const issueList=el('ul');for(const reason of report.reasons)issueList.append(el('li','',reason.text));issues.append(issueList);form.append(issues);
    const resolutionLabel=el('label','control-label');resolutionLabel.append(document.createTextNode('整體核對與處理紀錄'));const overall=el('textarea');overall.rows=4;overall.minLength=20;overall.maxLength=8000;overall.required=true;overall.placeholder='統一說明實際核對依據、發現的問題與已完成的處理。尚未確認時，先保留草稿。';overall.setAttribute('aria-label','整體核對與處理紀錄');resolutionLabel.append(overall);form.append(resolutionLabel);
    const actor=el('input');actor.required=true;actor.minLength=2;actor.maxLength=80;actor.placeholder='覆核藥師代碼';actor.setAttribute('aria-label','覆核藥師代碼');const actorLabel=el('label','control-label');actorLabel.append(document.createTextNode('覆核藥師代碼'),actor);form.append(actorLabel);
    const ack=el('input');ack.type='checkbox';ack.required=true;const ackLabel=el('label','approval-check');ackLabel.append(ack,document.createTextNode(`已核對清單中的 ${report.reasons.length} 項事項，以上紀錄如實涵蓋處理結果，確認此版本可交付。`));form.append(ackLabel);
    const submit=el('button','btn btn-primary','確認並開放交付');submit.type='submit';const error=el('p','form-error');error.setAttribute('role','alert');form.append(submit,error);form.addEventListener('submit',async event=>{event.preventDefault();submit.disabled=true;try{await api('/api/reports/approve',{review:id,actor:actor.value,overall_resolution:overall.value,reviewed_reason_ids:report.reasons.map(reason=>reason.id),acknowledged:ack.checked});await renderDualReports(host,id);toast('已記錄藥師確認，可開啟交付說明');}catch(err){error.textContent=err.message;submit.disabled=false;}});delivery.append(form);host.append(delivery);
  }catch(err){host.replaceChildren(el('div','notice warn',err.message));}
}
const baseRecord=renderPatientRecord;
renderPatientRecord=function(){baseRecord();if(!currentPatient)return;const section=el('section','record-section');section.append(el('h3','','藥品取得方式與分類'));
  for(const med of currentPatient.medications.filter(m=>m.status==='active')){const row=el('div','classification-row');row.append(el('b','',med.name),el('small','',({prescribed:'處方取得',self_purchased:'自行購買',unknown:'取得方式待確認'})[med.acquisition||'unknown']+' · '+({rx:'處方藥',otc:'非處方藥',unknown:'法律分類待確認'})[med.class||'unknown']));row.append(button('核對分類／官方產品',()=>openMedicationClassification(med),'text-btn'));section.append(row);}section.append(el('p','muted','自行購買不等於非處方藥；原文藥名與官方產品須另行核對。'));$('#recScroll').append(section,button('查看操作與覆核紀錄',showAudit,'btn btn-quiet'));if(currentPatient.queries?.length){const history=el('section','record-section');history.append(el('h3','','研究查詢歷程 · 待藥師確認'));for(const q of currentPatient.queries)history.append(button(formatTime(q.created)+' · 查看研究查詢',()=>showQueryHistory(q.id),'text-btn'));$('#recScroll').append(history);}
};
async function openMedicationClassification(med){const box=$('#evidenceContent');box.replaceChildren();$('#evidenceTitle').textContent='藥品分類核對 · '+med.name;const form=el('form');
  function selectField(title,entries,value){const l=el('label','control-label');l.append(document.createTextNode(title));const select=el('select');for(const [v,text] of entries){const option=el('option','',text);option.value=v;option.selected=v===value;select.append(option);}l.append(select);form.append(l);return select;}
  const acquisition=selectField('取得方式',[['unknown','待確認'],['prescribed','醫師處方取得'],['self_purchased','自行購買']],med.acquisition||'unknown');const classification=selectField('處方／非處方法律分類',[['unknown','待確認'],['rx','處方藥（藥師已核對）'],['otc','非處方藥（藥師已核對）']],med.class||'unknown');
  const search=el('input');search.value=med.name;search.setAttribute('aria-label','官方藥品搜尋');const candidates=el('div','catalog-results');const license=el('input');license.placeholder='已核對的實際產品許可證字號；未確定請留空';license.value=med.license||'';license.setAttribute('aria-label','已核對許可證字號');const note=el('textarea');note.rows=3;note.required=true;note.minLength=4;note.maxLength=1000;note.placeholder='實際包裝、處方或官方產品核對依據';note.value=med.note||'';note.setAttribute('aria-label','藥品分類依據');form.append(el('p','notice','待藥師確認。成分相符僅是候選，不代表病人實際產品；系統不會自行改寫用法用量。'),search,button('查官方未註銷產品',loadCatalog,'btn btn-quiet'),candidates,license,note);
  async function loadCatalog(){candidates.replaceChildren(el('p','muted','查詢中…'));try{const r=await api('/api/catalog?q='+encodeURIComponent(search.value));candidates.replaceChildren(el('p','muted',`官方快照 ${r.meta.filter_date}；共 ${r.products.length} 筆候選（上限 30）`));for(const product of r.products){const d=el('details');d.append(el('summary','',product['中文品名']+' · '+product['許可證字號']),el('p','',product['英文品名']||''),el('p','','藥品類別（原始欄位）：'+(product['藥品類別']||'官方許可證快照為空值')),el('p','','主成分：'+(product['主成分略述']||'未提供')),catalogDoseParagraphs(product['用法用量']),catalogSourceAvailability(product),button('已核對為實際產品，帶入許可證',()=>{license.value=product['許可證字號'];toast('仍須藥師核對分類與實際用法');},'text-btn'));candidates.append(d);}if(!r.products.length)candidates.append(el('p','','現有快照沒有匹配產品，請核對實際藥袋或許可證。'));}catch(err){candidates.replaceChildren(el('p','form-error',err.message));}}
  const save=el('button','btn btn-primary','儲存藥師核對分類');save.type='submit';const error=el('p','form-error');form.append(save,error);form.addEventListener('submit',async e=>{e.preventDefault();save.disabled=true;try{const r=await api('/api/medications/classify',{id:med.id,acquisition:acquisition.value,classification:classification.value,license:license.value,note:note.value});currentPatient=r.patient;renderRecord();$('#evidenceDialog').close();toast(r.message);}catch(err){error.textContent=err.message;save.disabled=false;}});box.append(form);$('#evidenceDialog').showModal();await loadCatalog();
}
async function showAudit(){try{const r=await api('/api/audit');$('#evidenceTitle').textContent='操作與覆核紀錄';const box=$('#evidenceContent');box.replaceChildren();for(const event of r.events){const d=el('details');d.append(el('summary','',formatTime(event.created)+' · '+event.event),el('p','','操作者：'+event.actor),el('pre','',event.detail));box.append(d);}if(!r.events.length)box.append(el('p','','此病歷尚無新版稽核紀錄。'));$('#evidenceDialog').showModal();}catch(err){toast(err.message);}}
const baseEvidence=renderEvidence;
renderEvidence=function(target,job){baseEvidence(target,job);if(job.research){const d=el('details');d.append(el('summary','','GraphRAG 執行狀態與原生來源'),el('p','',job.research.status==='completed'?'完整 GraphRAG 研究推理已執行；待藥師確認，非臨床證據。':job.research.reason||job.research.status),el('pre','',job.research.answer?'待藥師確認｜研究機轉推理，非臨床證據\n'+job.research.answer:''),el('pre','',JSON.stringify(job.research.sources||[],null,2)));target.prepend(d);}};
async function renderSavedPatientReview(body,review){
  const assessment=review.result?.assessment;
  body.dataset.reviewId=review.id;
  const current=review.version===currentPatient.version;
  body.append(el('p','saved-result-label',`已保存的檢索結果 · ${formatTime(review.created)} · 用藥版本 ${review.version}${current?'（目前版本）':'（舊版本）'}`));
  if(!current)body.append(el('p','notice warn','目前用藥已變更，下方僅供查看歷史來源；需重新檢索後才能記錄處置或交付。'),button('依目前用藥重新檢索',()=>beginPatientReview(newTurn()),'btn btn-primary'));
  body.append(el('div','say',review.result?.answer||''));
  if(!assessment){body.append(el('p','notice warn','此舊結果沒有完整評估資料，請重新檢索。'));return;}
  const sources=assessment.sources||review.result.sources||[],box=el('div');renderAssessment(box,assessment,sources);body.append(box);
  const evidence=el('details','all-evidence');evidence.append(el('summary','','檢索原文與資料來源'));const sourceHost=el('div');renderEvidence(sourceHost,{sources,paths:[],mode:'pharmacy',research:assessment.medhop_research});evidence.append(sourceHost);body.append(evidence);
  if(current){const actions=el('div','run-actions');body.append(actions);renderDisposition(actions,{id:review.id});}
}
function renderSavedPatientQuery(body,query){
  const section=el('details','all-evidence');section.open=true;section.append(el('summary','',`研究檢索 · ${formatTime(query.created)} · 用藥版本 ${query.version}`));
  if(query.version!==currentPatient.version)section.append(el('p','notice warn','這筆研究查詢屬於舊用藥版本，僅供回顧來源。'));
  section.append(el('p','',query.result.question||''),el('div','say',query.result.answer||''));const sourceHost=el('div');renderEvidence(sourceHost,{sources:query.result.sources||[],paths:query.result.paths||[],mode:'medhop',research:query.result.research});section.append(sourceHost);body.append(section);
}
loadPastReview=async function(id){try{const patientId=currentPatient?.id,review=await api('/api/reviews/'+id);if(currentPatient?.id!==patientId)return;const body=newTurn();await renderSavedPatientReview(body,review);scrollEnd();}catch(error){toast(error.message);}};


async function showQueryHistory(id){try{const r=await api('/api/history/'+id);$('#evidenceTitle').textContent='研究查詢歷程 · 待藥師確認';const box=$('#evidenceContent');box.replaceChildren(el('h3','',r.result.question),el('p','notice','MedHop 研究內容供藥師判讀；用藥版本 '+r.version+'，不能直接作為臨床配藥依據。'),el('pre','',r.result.answer));$('#evidenceDialog').showModal();}catch(err){toast(err.message);}}

// Pair-specific source join: labels and research evidence stay separately traceable.
const clinicalAssessmentRenderer=renderAssessment;
renderAssessment=function(target,result,sources){
  clinicalAssessmentRenderer(target,result,sources);
  if(!result.integration_summary)return;
  const sourceMap=new Map(sources.map(s=>[s.id,s]));
  const section=el('details','pair-integration');section.open=result.pairs.length<=6;
  section.append(el('summary','',`藥單 × 藥事仿單 × MedHop · ${result.pairs.length} 組逐對整合`));
  section.append(el('p','muted','待藥師確認。仿單用於核對已記載的併用影響，MedHop 用於研究機轉線索；研究連線不直接判定病人有交互作用。'));
  function refs(ids,parent){const list=el('div','pair-sources');for(const id of ids||[]){const source=sourceMap.get(id);if(source)list.append(button(`[${id}] ${source.title}`,()=>showSource(source),'text-btn'));}parent.append(list);}
  for(const pair of result.pairs){
    const research=pair.medhop;if(!research)continue;
    const card=el('section','pair-card joined-pair '+(pair.integration.status==='label_warning'?'interaction':''));
    card.append(el('b','',pair.drugs.join(' × ')),el('p','pair-integration-label',pair.integration.label),el('h4','','藥事仿單'),el('p','',PAIR_LABELS[pair.status]));
    if(pair.quote)card.append(el('blockquote','',pair.quote));refs(pair.source_ids,card);
    card.append(el('h4','','MedHop 研究資料'),el('p','',research.message));
    for(const item of research.identities){const label=item.method==='pharmacist_confirmed'?'藥師核對對照':item.method==='exact_name'?'精確名稱對應':'未對應';card.append(el('p','mapping-note',`${item.input} → ${item.entity||'未找到研究實體'} · ${label}`));if(item.method==='pharmacist_confirmed')card.append(el('p','muted','對照依據：'+item.identity_source));}
    for(const path of research.paths){const details=el('details','research-path');details.append(el('summary','',path.nodes.join(' ↔ ')));for(const edge of path.edges){details.append(el('p','',`圖譜抽取關係 #${edge.id}：${edge.source} → ${edge.target}`),el('p','',edge.description));if(edge.qualified_text)details.append(el('p','muted','原文含否定或限制語句，請核對完整研究條件。'));if(edge.traversed_reverse)details.append(el('p','muted','此步沿反向連線檢索；生物學關係的原始方向仍如上所示。'));refs(edge.source_ids,details);}card.append(details);}
    refs(research.source_ids,card);card.append(el('p','muted','是否需調整處方或重新配藥，由藥師核對病人條件與原文後確認。'));section.append(card);
  }
  target.prepend(section);
};
const integratedRecordRenderer=renderPatientRecord;
renderPatientRecord=function(){integratedRecordRenderer();if(!currentPatient)return;const section=el('section','record-section');section.append(el('h3','','MedHop 藥名與識別碼'));
  for(const med of currentPatient.medications.filter(m=>m.status==='active')){const row=el('div','classification-row');row.append(el('b','',med.name),el('small','',med.medhop_entity?'藥師核對：'+med.medhop_entity:'使用精確藥名比對；未對應時不猜測別名'),button('核對研究識別碼',()=>openResearchIdentity(med),'text-btn'));section.append(row);}$('#recScroll').append(section);
};
async function openResearchIdentity(med){
  const box=$('#evidenceContent');box.replaceChildren();$('#evidenceTitle').textContent='MedHop 研究身分核對 · '+med.name;
  const form=el('form');form.append(el('p','notice','待藥師確認。對照須依實際來源核對；系統只確認識別碼存在，不會自行證明它與藥單中的藥品相同。'));
  const search=el('input');search.value=med.medhop_entity||med.name;search.setAttribute('aria-label','搜尋 MedHop 藥物實體');const results=el('div','catalog-results');
  const entity=el('input');entity.value=med.medhop_entity||'';entity.placeholder='已核對的 MedHop 藥名或 DrugBank ID；清空可移除對照';entity.setAttribute('aria-label','已核對 MedHop 實體');
  const source=el('input');source.value=med.medhop_identity_source||'';source.placeholder='身分對照的實際來源（文件、識別碼資料或網址）';source.maxLength=1000;source.setAttribute('aria-label','研究身分核對來源');
  const note=el('textarea');note.value=med.medhop_identity_note||'';note.placeholder='記錄已核對的藥物身分與依據，避免填入病人個資';note.required=true;note.minLength=4;note.maxLength=1000;note.rows=3;note.setAttribute('aria-label','研究身分核對說明');
  async function lookup(){results.replaceChildren(el('p','muted','查詢中…'));try{const response=await api('/api/medhop/entities?q='+encodeURIComponent(search.value));results.replaceChildren();for(const item of response.entities)results.append(button(item.title+' · '+item.type,()=>{entity.value=item.title;},'text-btn'));if(!response.entities.length)results.append(el('p','muted','現有 MedHop 沒有匹配項目；請補充可核對的研究識別碼，勿任選其他藥物。'));}catch(error){results.replaceChildren(el('p','form-error',error.message));}}
  const save=el('button','btn btn-primary','儲存藥師核對結果');save.type='submit';const message=el('p','form-error');form.append(search,button('搜尋現有研究實體',lookup,'btn btn-quiet'),results,entity,source,note,save,message);
  form.addEventListener('submit',async event=>{event.preventDefault();save.disabled=true;try{const response=await api('/api/medications/identify',{id:med.id,entity:entity.value,source:source.value,note:note.value});currentPatient=response.patient;renderRecord();$('#evidenceDialog').close();toast(response.message);}catch(error){message.textContent=error.message;save.disabled=false;}});
  box.append(form);$('#evidenceDialog').showModal();await lookup();
}

function catalogDoseParagraphs(text){const box=el('div','catalog-dose');box.append(el('h4','','服用次數與劑量（官方原文）'));for(const part of (text||'原始快照未提供；請核對實際仿單').split(/(?<=[。；;])\s*|\n+/).filter(Boolean))box.append(el('p','dose-paragraph',part));return box;}

function catalogSourceAvailability(product){const box=el('section','catalog-source-status'),state=product.source_availability;if(!state)return box;box.append(el('b','','資料來源與缺口'),el('p','',state.classification.message),el('p','',state.dosage.message),el('p','',state.label_message));for(const label of state.labels){const link=el('a','catalog-label-link',`同許可證原始仿單：${label.file}${label.ocr?'（含 OCR，需核對 PDF）':''}`);link.href=label.url;link.target='_blank';link.rel='noopener';box.append(link);}return box;}
