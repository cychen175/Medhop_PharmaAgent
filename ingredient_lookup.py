"""Ingredient lookup from the bundled official product snapshot. No generated values."""
import re
from workflow import key

def normalized(value):return re.sub(r'[\s「」【】"“”\-·，,（）()]','',key(value))
def ingredient_values(value):return list(dict.fromkeys(x.strip() for x in re.split(r';;|[;\n]',value or '') if x.strip()))

class IngredientLookup:
    def __init__(self,catalog):
        self.catalog=catalog;self.cache={};self.names={}
        for row in catalog.rows:
            for field in ['中文品名','英文品名']:
                name=row.get(field) or ''
                if name:self.names.setdefault(normalized(name),set()).add(row['許可證字號'])
    def resolve(self,name,license=''):
        token=(name,license)
        if token in self.cache:return self.cache[token]
        q=normalized(name);licenses=set()
        if license:
            licenses={license};method='confirmed_license'
        else:
            licenses=self.names.get(q,set()).copy();method='exact_product_name'
            if not licenses and len(q)>=3:
                # Only a product-name stem followed by a dosage form or strength.
                for full,ids in self.names.items():
                    if full.startswith(q) and re.match(r'^(?:tablets?|capsules?|filmcoated|f\.c\.|錠|膜衣錠|膠囊|\d)',full[len(q):]):licenses.update(ids)
                method='product_name_stem'
        products=[p for lic in sorted(licenses) if (p:=self.catalog.current_product(lic))]
        candidates=[{'license':p['許可證字號'],'name':p['中文品名'],'english_name':p['英文品名'],'ingredients':ingredient_values(p.get('主成分略述')),'raw_ingredients':p.get('主成分略述') or ''} for p in products]
        sets={tuple(sorted(normalized(x) for x in c['ingredients'])) for c in candidates}
        agreed=bool(candidates) and len(sets)==1 and all(c['ingredients'] for c in candidates)
        status='resolved' if agreed else 'ambiguous' if candidates else 'not_found'
        result={'status':status,'method':method,'ingredients':candidates[0]['ingredients'] if agreed else [],'candidates':candidates,'source_file':'data/government/tfda-products.json','source_field':'主成分略述','source_url':self.catalog.meta['url'],'snapshot_date':self.catalog.meta['filter_date'],'product_confirmed':bool(license and products),'message':'成分依現有官方資料庫原始欄位取得；仍需核對實際產品。' if agreed else '同名產品的成分不一致，請核對實際產品或許可證。' if candidates else '現有資料庫未能精確對應產品名稱；請補充完整藥名或許可證，不自行補寫成分。'}
        self.cache[token]=result;return result
    def enrich(self,med):
        result=self.resolve(med['name'],med.get('license',''))
        med['ingredient_lookup']=result;med['components']=result['ingredients']
    def chinese_medications(self,text,existing):
        if re.search(r'是否|可以|建議|考慮|替代|停用|停止',text):return []
        if not re.search(r'服用|用藥|目前吃|正在吃|新增|處方|醫師開',text):return []
        from workflow import FREQ
        found=[]
        for full in sorted(self.names,key=len,reverse=True):
            if not re.match(r'^[\u4e00-\u9fff]',full) or full not in normalized(text):continue
            if any(normalized(m['name'])==full for m in existing+found):continue
            match=self.resolve(full)
            if match['status']=='not_found':continue
            if any(set(c['license'] for c in self.resolve(m['name'])['candidates']) & set(c['license'] for c in match['candidates']) for m in existing+found):continue
            tail=normalized(text).split(full,1)[-1]
            freq=FREQ.search(tail) if len(existing+found)==0 else None
            found.append({'name':match['candidates'][0]['name'],'dose':'','frequency':freq[0] if freq else '','kind':'new_order' if re.search(r'新增|今日|今天|醫師開',text) else 'current','text':text,'status':'active'})
        return found
