export interface InputExample {
  exampleName: string;
  example: string;
}

// 處方審查與用藥調整(醫師)
export const INPUT_DOCTOR_EXAMPLES: InputExample[] = [
//   {
//     exampleName: '高血壓合併糖尿病患者',
//     example:
// `基本資料

// 患者：張○華，男，65歲
// 診斷：高血壓、第二型糖尿病、慢性腎病第3期
// 過敏史：Penicillin
// 實驗室數據：eGFR 45 mL/min/1.73m², HbA1c 8.2%
// 處方：

// Amlodipine 10mg QD
// Metformin 1000mg BID
// Glimepiride 4mg QD
// Aspirin 100mg QD`
//   },
//   {
//     exampleName: '老年多重用藥患者',
//     example:
// `基本資料

// 患者：陳○桂，女，82歲
// 診斷：高血壓、心房顫動、失眠、骨質疏鬆
// 過敏史：Sulfa drugs
// 實驗室數據：eGFR 35 mL/min/1.73m², Cr 1.8 mg/dL
// 處方：

// Digoxin 0.25mg QD
// Warfarin 5mg QD
// Zolpidem 10mg HS
// Diazepam 5mg TID
// Alendronate 70mg weekly`
//   },
//   {
//     exampleName: '肝功能不全患者',
//     example:
// `基本資料

// 患者：王○強，男，55歲
// 診斷：慢性C型肝炎、肝硬化Child-Pugh B級、疼痛
// 過敏史：無
// 實驗室數據：ALT 120 U/L, AST 180 U/L, Bilirubin 3.2 mg/dL
// 處方：

// Acetaminophen 1000mg QID
// Diclofenac 75mg BID
// Lorazepam 2mg TID`
//   },
  {
    exampleName: '兒童用藥案例',
    example:
`基本資料

患者：林○小，男，8歲，體重25kg
診斷：支氣管炎、發燒
過敏史：無
處方：

Aspirin 325mg TID
Codeine 30mg QID
Amoxicillin 250mg TID`
  },
  {
    exampleName: '重複用藥案例',
    example:
`基本資料

患者：劉○珍，女，68歲
診斷：高血壓、糖尿病、關節炎
過敏史：無
處方：

Lisinopril 10mg QD (心臟科)
Enalapril 5mg BID (腎臟科)
Metformin 500mg BID (內分泌科)
Metformin SR 1000mg QD (家醫科)
Ibuprofen 400mg TID (骨科)
Diclofenac gel (骨科)`
  },
//   {
//     exampleName: '劑量調整案例',
//     example:
// `基本資料

// 患者：吳○華，男，72歲
// 診斷：心房顫動、慢性腎病、巴金森氏症
// 過敏史：無
// 實驗室數據：eGFR 25 mL/min/1.73m²
// 處方：

// Digoxin 0.25mg QD
// Dabigatran 150mg BID
// Levodopa/Carbidopa 25/250mg QID
// Atenolol 50mg BID`
//   },
//   {
//     exampleName: '長期用藥與監測案例',
//     example:
// `基本資料

// 患者：許○雄，男，58歲
// 診斷：雙極性情感疾患、高尿酸血症、甲狀腺功能低下
// 過敏史：無
// 實驗室數據：Lithium level 1.8 mEq/L, TSH 15 mIU/L, 尿酸 9.5 mg/dL
// 處方：

// Lithium 300mg TID (已服用10年)
// Allopurinol 300mg QD (已服用8年)
// Levothyroxine 50mcg QD
// Colchicine 0.6mg BID (持續3個月)`
//   },
]

// 處方藥品替代與交互作用檢查(藥師)
export const INPUT_PHARMACIST_EXAMPLES: InputExample[] = [
  {
    exampleName: '懷孕婦女感冒',
    example:
`基本資料

患者：李○美，女，28歲，懷孕24週
診斷：上呼吸道感染
過敏史：無
處方：

Ibuprofen 400mg TID
Codeine 30mg QID
Dextromethorphan 15mg TID`
  },
  {
    exampleName: '藥物交互作用案例',
    example:
`基本資料

患者：黃○雄，男，45歲
診斷：高血壓、憂鬱症、胃食道逆流
過敏史：無
處方：

Amlodipine 5mg QD
Sertraline 100mg QD
Omeprazole 40mg QD
Warfarin 5mg QD
St. John's Wort (自行服用)`
  },
  {
    exampleName: '過敏與禁忌症案例',
    example:
`基本資料

患者：鄭○美，女，42歲
診斷：高血壓、尿道感染、焦慮症
過敏史：Penicillin (皮疹), Sulfa drugs (Stevens-Johnson syndrome)
處方：

Amoxicillin 500mg TID
Hydrochlorothiazide 25mg QD
Sulfamethoxazole/Trimethoprim 800/160mg BID
Alprazolam 0.5mg TID`
  },
  {
    exampleName: '抗凝血劑與抗生素交互作用',
    example:
`基本資料

患者：陳○文，男，62歲
診斷：心房顫動、肺炎
過敏史：無
處方：

Warfarin 5mg QD
Clarithromycin 500mg BID
Azithromycin 500mg QD x 3天
Rifampin 600mg QD`
  },
  {
    exampleName: '抗癲癇藥物與避孕藥交互作用',
    example:
`基本資料

患者：林○婷，女，25歲
診斷：癲癇、避孕需求
過敏史：無
處方：

Carbamazepine 200mg BID
Phenytoin 100mg TID
口服避孕藥 (Ethinyl estradiol/Levonorgestrel)
Lamotrigine 25mg BID`
  },
  {
    exampleName: '抗憂鬱劑與多種藥物交互作用',
    example:
`基本資料

患者：張○明，男，48歲
診斷：重度憂鬱症、高血壓、偏頭痛
過敏史：無
處方：

Fluoxetine 40mg QD
Tramadol 50mg QID PRN
Sumatriptan 50mg PRN
Propranolol 40mg BID
人參茶（患者自行服用）`
  },
  {
    exampleName: '質子幫浦抑制劑與多重交互作用',
    example:
`基本資料

患者：李○華，女，65歲
診斷：胃食道逆流、骨質疏鬆、心房顫動、C型肝炎
過敏史：無
處方：

Omeprazole 40mg QD
Clopidogrel 75mg QD
Warfarin 5mg QD
Ketoconazole 200mg BID
鈣片 500mg TID`
  },
//   {
//     exampleName: '心血管藥物複雜交互作用',
//     example:
// `基本資料

// 患者：王○強，男，58歲
// 診斷：高血壓、心絞痛、心律不整、腎功能不全
// 過敏史：無
// 實驗室數據：eGFR 40 mL/min/1.73m²
// 處方：

// Verapamil 120mg BID
// Atenolol 50mg BID
// Digoxin 0.25mg QD
// Simvastatin 80mg QD
// Diltiazem 90mg BID`
//   },
  {
    exampleName: '抗生素與口服藥物交互作用',
    example:
`基本資料

患者：劉○美，女，35歲
診斷：泌尿道感染、糖尿病、甲狀腺功能低下
過敏史：無
處方：

Ciprofloxacin 500mg BID
Metformin 1000mg BID
Levothyroxine 100mcg QD
Ferrous sulfate 325mg TID
制酸劑 Aluminum hydroxide TID PRN`
  },
]
