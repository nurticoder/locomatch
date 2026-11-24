export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function addDays(date,n) {const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export const daysBetween=(a,b)=>Math.floor((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
export const isDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'') && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10)===s;
export function seedState() {
 const d=today();
 const base={category:'Preserves',unit:'jars',storage:'Ambient',districts:['Hong Kong Island','Kowloon','New Territories'],delivery:'Delivery included for orders of 24 jars or more; 3 working days notice.',deliveryZh:'訂購24罐或以上包送貨；請提前3個工作天。',leadDays:3,source:'Demo production sheet FS-1124',status:'verified',reviewer:'Demo reviewer',verifiedAt:new Date().toISOString(),available:d,confirmed:true,allergens:'Check product label before purchase.',notes:''};
 return {version:1,products:[
 {...base,id:'p1',name:'Orange marmalade',nameZh:'本地香橙果醬',quantity:120,price:38,expiry:addDays(d,150),accent:'orange',notes:'200 g per jar. Locally made in small batches.'},
 {...base,id:'p2',name:'Roselle jam',nameZh:'洛神花果醬',quantity:64,price:'',expiry:addDays(d,90),accent:'roselle',status:'pending',reviewer:'',verifiedAt:null,source:'Demo kitchen note KN-07',notes:'180 g per jar. Price needs confirmation.'},
 {...base,id:'p3',name:'Green chilli sauce',nameZh:'青辣椒醬',category:'Sauces',quantity:48,price:42,expiry:addDays(d,45),storage:'Chilled',accent:'chilli',notes:'150 g per jar. Keep refrigerated at 0–4°C.'},
 {...base,id:'p4',name:'Seasonal citrus preserve',nameZh:'時令柑橘果醬',quantity:180,price:36,expiry:addDays(d,120),accent:'citrus',status:'pending',confirmed:false,reviewer:'',verifiedAt:null,source:'Demo harvest estimate',notes:'Estimated production. Finished stock not yet confirmed.'}
 ],buyers:seedBuyers(),drafts:[],audit:[],runs:[],baseline:15};
}
export function seedBuyers(){
 const base={categories:['Preserves'],district:'Hong Kong Island',quantity:24,maxPrice:45,minShelfDays:60,storage:['Ambient'],leadDays:5,authorised:true,suppressed:false,language:'en',contact:'',purpose:'Retail shelves',purposeZh:'零售上架'};
 return [
 {...base,id:'b1',name:'Harbour Pantry',nameZh:'海港食品店',type:'Independent retailer',typeZh:'獨立零售店',initials:'HP',quantity:36,notes:'Small-batch preserves for its local produce shelf.',notesZh:'為本地食品專區採購小批量果醬。'},
 {...base,id:'b2',name:'Good Company Gifts',nameZh:'好伙伴禮品',type:'Corporate gifting',typeZh:'企業禮品',initials:'GC',quantity:60,maxPrice:40,minShelfDays:90,district:'Kowloon',purpose:'Staff appreciation gifts',purposeZh:'員工感謝禮品',notes:'Individual jars for staff gift boxes.',notesZh:'採購獨立包裝果醬作員工禮盒。'},
 {...base,id:'b3',name:'Neighbourhood Café',nameZh:'街坊咖啡店',type:'Café',typeZh:'咖啡店',initials:'NC',quantity:24,minShelfDays:30,purpose:'Breakfast menu',purposeZh:'早餐餐單',notes:'Preserves to serve with toast and pastries.',notesZh:'果醬配搭多士及糕點。'},
 {...base,id:'b4',name:'Common Ground Market',nameZh:'共地市集',type:'Independent retailer',typeZh:'獨立零售店',initials:'CM',quantity:48,district:'New Territories',notes:'Monthly replenishment of local preserves.',notesZh:'每月補充本地果醬。'},
 {...base,id:'b5',name:'Island Grocer',nameZh:'小島雜貨店',type:'Independent retailer',typeZh:'獨立零售店',initials:'IG',quantity:24,maxPrice:32,notes:'Budget capped at HK$32 per jar.',notesZh:'每罐預算上限為HK$32。'},
 {...base,id:'b6',name:'Civic Gift Studio',nameZh:'城市禮品工作室',type:'Corporate gifting',typeZh:'企業禮品',initials:'CS',quantity:240,maxPrice:50,notes:'Needs 240 identical jars for one event.',notesZh:'活動需要240罐相同產品。'},
 {...base,id:'b7',name:'Fresh Table Kitchen',nameZh:'鮮味廚房',type:'Restaurant',typeZh:'餐廳',initials:'FT',categories:['Sauces'],quantity:24,minShelfDays:14,storage:['Ambient','Chilled'],notes:'Sauces for a seasonal menu; accepts chilled delivery.',notesZh:'為時令餐單採購醬料，可收取冷藏貨品。'},
 {...base,id:'b8',name:'Morning Loaf',nameZh:'晨光麵包店',type:'Bakery',typeZh:'麵包店',initials:'ML',quantity:24,minShelfDays:180,notes:'Requires at least 180 days remaining shelf life.',notesZh:'要求剩餘保質期最少180天。'},
 {...base,id:'b9',name:'Urban Harvest',nameZh:'都市豐收',type:'Independent retailer',typeZh:'獨立零售店',initials:'UH',quantity:24,authorised:false,notes:'Outreach authorisation has not been recorded.',notesZh:'尚未記錄聯絡授權。'},
 {...base,id:'b10',name:'Kowloon Deli',nameZh:'九龍熟食店',type:'Deli',typeZh:'熟食店',initials:'KD',quantity:24,district:'Kowloon',suppressed:true,notes:'Opted out of outreach.',notesZh:'已選擇不接收推廣訊息。'}
 ];
}
export function productIssues(p, date=today()){
 const a=[];
 if(!p.name?.trim()) a.push('Product name is missing');
 if(!Number.isInteger(Number(p.quantity)) || Number(p.quantity)<=0) a.push('Confirm a positive whole-number quantity');
 if(p.price===''||p.price==null||!Number.isFinite(Number(p.price))||Number(p.price)<=0) a.push('Approved price is missing');
 if(!isDate(p.available)) a.push('Availability date is missing');
 if(!isDate(p.expiry)||p.expiry<date) a.push('A valid future expiry date is needed');
 if(isDate(p.expiry)&&isDate(p.available)&&p.expiry<p.available) a.push('Expiry is before availability');
 if(!['Ambient','Chilled'].includes(p.storage)) a.push('Storage requirements are missing');
 if(!p.districts?.length||!p.delivery?.trim()||!Number.isInteger(Number(p.leadDays))||Number(p.leadDays)<0) a.push('Delivery conditions are incomplete');
 if(!p.source?.trim()) a.push('Source record is missing');
 if(!p.confirmed) a.push('Finished stock has not been confirmed');
 return a;
}
export function matchBuyer(p,b,date=today()){
 const arrival=addDays(date,Number(b.leadDays)||0);
 const checks=[
 {key:'verification',label:'Verified product record',zh:'已核實產品記錄',ok:p.status==='verified'&&!!p.reviewer&&productIssues(p,date).length===0,detail:productIssues(p,date).join('; ')|| (p.status==='verified'?'Approved by '+p.reviewer:'Staff verification required')},
 {key:'authorisation',label:'Outreach permission',zh:'聯絡授權',ok:b.authorised&&!b.suppressed,detail:b.suppressed?'Buyer has opted out':b.authorised?'Authorisation recorded':'Authorisation not recorded'},
 {key:'category',label:'Product interest',zh:'產品類別',ok:b.categories.includes(p.category),detail:b.categories.join(', ')},
 {key:'quantity',label:'Available quantity',zh:'可供應數量',ok:Number(p.quantity)>=b.quantity,detail:`${p.quantity} available / ${b.quantity} requested`},
 {key:'price',label:'Buyer budget',zh:'買家預算',ok:Number(p.price)>0&&Number(p.price)<=b.maxPrice,detail:`HK$${p.price||'—'} / max HK$${b.maxPrice} per jar`},
 {key:'shelf',label:'Remaining shelf life',zh:'剩餘保質期',ok:isDate(p.expiry)&&daysBetween(arrival,p.expiry)>=b.minShelfDays,detail:`${isDate(p.expiry)?daysBetween(arrival,p.expiry):0} days on arrival / ${b.minShelfDays} required`},
 {key:'delivery',label:'Delivery compatibility',zh:'配送安排',ok:p.districts.includes(b.district)&&isDate(p.available)&&p.available<=arrival&&Number(p.leadDays)<=b.leadDays,detail:`${b.district}; within ${b.leadDays} days`},
 {key:'storage',label:'Storage compatibility',zh:'儲存條件',ok:b.storage.includes(p.storage),detail:p.storage}
 ];
 return {buyer:b,eligible:checks.every(c=>c.ok),checks,failed:checks.filter(c=>!c.ok)};
}
export function createMessage(p,b,{language='en',channel='email',quantity=b.quantity,date=today()}={}){
 if(!matchBuyer(p,b,date).eligible) throw Error('This buyer does not meet the matching rules.');
 if(!Number.isInteger(Number(quantity))||quantity<1||quantity>p.quantity||quantity>b.quantity) throw Error('Offer quantity must fit available stock and the buyer request.');
 const total=(Number(p.price)*quantity).toFixed(0);
 if(language==='zh') return `${channel==='email'?`主旨：${b.nameZh||b.name}的${p.nameZh||p.name}供應建議\n\n`:''}${b.nameZh||b.name}團隊您好：\n\n得知貴公司有${b.purposeZh||b.purpose}的採購需要，現提供 FarmShare ${p.nameZh||p.name}供參考。\n\n數量：${quantity}罐\n單價：HK$${p.price}／罐\n產品金額：HK$${total}\n可供應日期：${p.available}\n最佳食用日期：${p.expiry}\n儲存方式：${p.storage==='Chilled'?'冷藏':'室溫'}\n配送：${p.deliveryZh||p.delivery}\n\n請問這項供應是否適合貴公司的需要？如有興趣，我們可再確認產品標籤、配送日期及最終訂單詳情。\n\n謝謝！\nFarmShare 團隊`;
 return `${channel==='email'?`Subject: ${p.name} for ${b.name}\n\n`:''}Hello ${b.name} team,\n\nYou have recorded an interest in ${b.purpose.toLowerCase()}. We have ${p.name.toLowerCase()} available at FarmShare that may suit your needs.\n\nQuantity: ${quantity} jars\nPrice: HK$${p.price} per jar\nProduct subtotal: HK$${total}\nAvailable from: ${p.available}\nBest before: ${p.expiry}\nStorage: ${p.storage}\nDelivery: ${p.delivery}\n\nWould this be useful for your next order? We can confirm the product label, delivery date and final order details with you.\n\nThank you,\nThe FarmShare team`;
}
export function parseCSV(text){
 const rows=[]; let row=[],value='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(value);value='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';}else value+=c;}
 if(quoted)throw Error('CSV has an unclosed quotation mark.');
 row.push(value);if(row.some(v=>v.trim()))rows.push(row);
 if(rows.length<2)throw Error('Add a header and at least one product row.');
 const headers=rows.shift().map(v=>v.trim());
 const needed=['name','quantity','price','available','expiry','storage','districts','delivery','source'];
 if(needed.some(h=>!headers.includes(h)))throw Error('CSV headers required: '+needed.join(', '));
 if(rows.length>100)throw Error('Import up to 100 products at a time.');
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`Row ${i+2} has ${r.length} columns; expected ${headers.length}.`);const p=Object.fromEntries(headers.map((h,j)=>[h,(r[j]||'').trim()]));return {id:crypto.randomUUID(),name:p.name,nameZh:p.nameZh||p.name,category:p.category==='Sauces'?'Sauces':'Preserves',quantity:Number(p.quantity),price:p.price===''?'':Number(p.price),available:p.available,expiry:p.expiry,storage:p.storage,districts:p.districts.split('|').map(v=>v.trim()).filter(v=>['Hong Kong Island','Kowloon','New Territories'].includes(v)),delivery:p.delivery,deliveryZh:'',source:p.source,leadDays:p.leadDays===''||p.leadDays===undefined?3:Number(p.leadDays),confirmed:false,status:'pending',reviewer:'',verifiedAt:null,unit:'jars',accent:'orange',notes:p.notes||''};});
}
export function csvCell(v){let s=String(v??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
