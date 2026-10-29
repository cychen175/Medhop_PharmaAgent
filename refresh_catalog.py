"""Fetch only the official TFDA public dataset; no patient data is transmitted."""
from pathlib import Path
import collections, datetime, hashlib, io, json, os, urllib.request, zipfile
ROOT=Path(__file__).resolve().parent
URL='https://data.fda.gov.tw/data/opendata/export/37/json'

def main():
    folder=ROOT/'data'/'government';folder.mkdir(parents=True,exist_ok=True)
    with urllib.request.urlopen(URL,timeout=120) as response:payload=response.read(50000000)
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        files=[n for n in archive.namelist() if n.endswith('.json')]
        if len(files)!=1:raise ValueError('官方檔案格式變更，停止匯入')
        rows=json.loads(archive.read(files[0]).decode('utf-8-sig'))
    accepted=[];excluded=collections.Counter();today=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date()
    if not isinstance(rows,list) or not rows:raise ValueError('官方資料為空，保留既有快照')
    for row in rows:
        if '許可證字號' not in row or '註銷狀態' not in row:raise ValueError('官方欄位變更，停止匯入')
        if str(row.get('註銷狀態') or '').strip() or row.get('註銷日期'):
            excluded['revoked_or_status_not_blank']+=1;continue
        try:expiry=datetime.date.fromisoformat(str(row.get('有效日期') or '').replace('/','-'))
        except ValueError:excluded['missing_expiry']+=1;continue
        if expiry<today:excluded['expired']+=1;continue
        accepted.append({k:row.get(k) for k in ['許可證字號','有效日期','中文品名','英文品名','藥品類別','主成分略述','用法用量','適應症','劑型','許可證種類']})
    if not accepted:raise ValueError('未取得可用產品，保留既有快照')
    meta={'dataset':'未註銷藥品許可證資料集','url':'https://data.gov.tw/dataset/9123','download_url':URL,'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source_zip_sha256':hashlib.sha256(payload).hexdigest(),'source_rows':len(rows),'accepted_rows':len(accepted),'excluded':dict(excluded),'filter_date':today.isoformat(),'license':'政府資料開放授權條款第1版','policy':'註銷狀態空白、無註銷日期且許可證未逾有效日期才納入；成分候選不等於病人實際產品。未以此建立交互作用規則。'}
    # Run while the API is stopped; preserve the prior public snapshot.
    for name,data in [('tfda-products.json',accepted),('provenance.json',meta)]:
        dest=folder/name
        if dest.exists():dest.with_suffix(dest.suffix+'.previous').write_bytes(dest.read_bytes())
        temp=dest.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8');os.replace(temp,dest)
    print(json.dumps(meta,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
