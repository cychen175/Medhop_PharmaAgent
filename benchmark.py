"""Warm-up + >=30 measured runs; reports observed data, never estimated power.

source-check measures original-source retrieval only, not clinical accuracy or
LLM/GPU/NPU performance. medhop-e2e measures the original research worker.
Run separately on AMD, CPU-only and an explicitly authorised public research
endpoint; do not send patient records to remote benchmark services.
"""
from pathlib import Path
import argparse, csv, json, math, os, statistics, threading, time
import psutil
ROOT=Path(__file__).resolve().parent

def percentile(values,p):
    a=sorted(values);i=(len(a)-1)*p;lo=math.floor(i);hi=math.ceil(i)
    return a[lo]+(a[hi]-a[lo])*(i-lo)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--mode',choices=['source-check','medhop-e2e'],default='source-check')
    parser.add_argument('--runs',type=int,default=30)
    parser.add_argument('--warmup',type=int,default=2)
    parser.add_argument('--label',default='local-source-check')
    parser.add_argument('--power-csv',type=Path,help='Actual external-meter samples: unix_time_s,watts')
    parser.add_argument('--output',type=Path,default=ROOT/'runtime'/'benchmark.json')
    args=parser.parse_args()
    if args.runs<30 or args.warmup<1:parser.error('至少暖機 1 次，量測 30 次；不得以較少樣本宣稱完成附件效能驗證。')
    from server import Corpus
    from workflow import pair_evidence,medications
    from agent_service import graphrag
    corpus=Corpus()
    example=next(e for e in corpus.examples if e['name']=='藥物交互作用案例')
    patient={'id':'public-source-benchmark','version':1,'medications':[{**m,'id':i,'name_key':m['name'].casefold()} for i,m in enumerate(medications(example['text']))]}
    def source_check():
        result=pair_evidence(patient,corpus.pages)
        negative=[p for p in result['pairs'] if p['status']=='no_effect_reported']
        # Ground truth is this original case and exact label quotations,
        # not a clinical judgment that the patient's prescription is safe.
        ok=len(result['pairs'])==10 and len(negative)==1 and {'amlodipine','warfarin'}=={n.casefold() for n in negative[0]['drugs']} and bool(negative[0]['quote'])
        return {'correct_source_contract':ok,'pair_count':len(result['pairs']),'source_count':len(result['sources'])}
    def medhop_check():
        result=graphrag('Explain DB00887 and NKCC using supported molecular mechanisms.')
        supported=any(str(s.get('id'))=='4938' and s.get('kind')=='Relationships' for s in result.get('sources',[]))
        return {'correct_source_contract':result['status']=='completed' and supported and '4938' in result.get('answer',''),'worker_status':result['status']}
    run=source_check if args.mode=='source-check' else medhop_check
    for _ in range(args.warmup):run()
    process=psutil.Process();observations=[];samples=[];finished=threading.Event()
    def observe():
        while not finished.is_set():
            try:samples.append({'unix_time_s':time.time(),'rss_bytes':sum(p.memory_info().rss for p in [process]+process.children(recursive=True) if p.is_running())})
            except (psutil.NoSuchProcess,psutil.AccessDenied):pass
            finished.wait(.05)
    observer=threading.Thread(target=observe,daemon=True);observer.start()
    try:
        for index in range(args.runs):
            start=time.perf_counter();epoch=time.time();result=run()
            observations.append({'run':index+1,'start_unix_time_s':epoch,'end_unix_time_s':time.time(),'latency_s':time.perf_counter()-start,**result})
    finally:finished.set();observer.join()
    latencies=[r['latency_s'] for r in observations];power=None
    if args.power_csv:
        with args.power_csv.open(encoding='utf-8-sig') as file:meter=[{'unix_time_s':float(r['unix_time_s']),'watts':float(r['watts'])} for r in csv.DictReader(file)]
        meter=sorted((r for r in meter if observations[0]['start_unix_time_s']<=r['unix_time_s']<=observations[-1]['end_unix_time_s']),key=lambda r:r['unix_time_s'])
        if len(meter)>1:power={'meter_file':args.power_csv.name,'samples':len(meter),'mean_watts':statistics.mean(r['watts'] for r in meter),'peak_watts':max(r['watts'] for r in meter),'measured_window_joules':sum((a['watts']+b['watts'])/2*(b['unix_time_s']-a['unix_time_s']) for a,b in zip(meter,meter[1:]))}
    result={'label':args.label,'mode':args.mode,'warmup_runs':args.warmup,'measured_runs':args.runs,'latency_p50_s':percentile(latencies,.5),'latency_p95_s':percentile(latencies,.95),'source_contract_accuracy':sum(r['correct_source_contract'] for r in observations)/args.runs,'peak_process_tree_rss_bytes':max((s['rss_bytes'] for s in samples),default=process.memory_info().rss),'power':power,'hardware_execution_verified':False,'clinical_accuracy':None,'gpu_npu_utilization':None,'limits':['Source-contract accuracy is not clinical medication-safety accuracy.','Process RSS excludes the separately running Lemonade model server.','AMD/CPU-only/cloud comparisons require separate measured runs; no target is inferred from a label.','No power estimate is fabricated when meter data is absent.'],'observations':observations,'memory_samples':samples}
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k not in {'observations','memory_samples'}},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
