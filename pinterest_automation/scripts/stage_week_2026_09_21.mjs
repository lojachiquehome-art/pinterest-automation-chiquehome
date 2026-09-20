import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(here,'..');
const sourceArg=process.argv.indexOf('--preview');
if(sourceArg<0||!process.argv[sourceArg+1])throw Error('Use --preview <approved preview directory>');
const PREVIEW=path.resolve(process.argv[sourceArg+1]);
const preview=JSON.parse(readFileSync(path.join(PREVIEW,'review.json'),'utf8'));
const approval=JSON.parse(readFileSync(path.join(PREVIEW,'publication-approval.json'),'utf8'));
if(approval.status!=='approved')throw Error('Campaign approval missing');
const batchPath=path.join(ROOT,'output','pins_batch.json');
const batch=JSON.parse(readFileSync(batchPath,'utf8'));
const boardMap=JSON.parse(readFileSync(path.join(ROOT,'data','board_ids.json'),'utf8'));
const base='https://raw.githubusercontent.com/lojachiquehome-art/pinterest-automation-chiquehome/main/pinterest_automation/public/pinterest';
const strategy={product:'product_full_bleed',environment:'product_in_environment',title:'environment_title_overlay',split:'split_two_products'};
if(preview.length!==35)throw Error('Expected 35 approved pins');
const ids=new Set(preview.map(p=>String(p.id)));
const products=new Set();
for(let day=21;day<=27;day++){
 const date=`2026-09-${day}`;
 const rows=preview.filter(p=>p.date===date);
 if(rows.length!==5||rows.map(p=>p.time).join(',')!=='09:30,09:31,09:32,09:33,09:34')throw Error('Invalid daily slots '+date);
 if(rows.map(p=>p.style).join(',')!=='product,environment,title,product,split')throw Error('Invalid styles '+date);
 if(batch.some(p=>p.status==='ready'&&p.scheduled_at?.startsWith(date)&&!ids.has(String(p.id))))throw Error('Existing other pins for '+date);
}
const rows=preview.map(p=>{
 if(!boardMap[p.board])throw Error('Unknown board '+p.board);
 if(p.title.length>100||p.description.length>500)throw Error('Text limit '+p.id);
 for(const product of p.products){if(products.has(product.handle))throw Error('Duplicate '+product.handle);products.add(product.handle);}
 const image=`public/pinterest/final/pin-${p.id}.jpg`;
 const url=`${base}/final/pin-${p.id}.jpg`;
 const file=path.join(PREVIEW,p.image);
 if(!existsSync(file))throw Error('Missing approved image '+file);
 const old=batch.find(row=>String(row.id)===String(p.id));
 if(old&&(!old.scheduled_at?.startsWith(p.date)||old.product_handle!==p.products[0].handle))throw Error('ID collision '+p.id);
 const row={id:p.id,scheduled_at:new Date(`${p.date}T${p.time}:00-03:00`).toISOString(),board_name:p.board,keyword:p.keywords[0],keywords:p.keywords,intent:p.theme,content_angle:p.style==='title'?'ambiente':'produto',trend_monthly_change:'',visual_strategy:strategy[p.style],landing_type:p.style==='split'?'collection':'product',title:p.title,description:p.description,link:p.link,image_url:p.products[0].sourceUrl,product_2_title:p.products[1]?.title??'',product_2_handle:p.products[1]?.handle??'',product_2_image_url:p.products[1]?.sourceUrl??'',generated_image_prompt:'',generated_image_path:image,generated_image_url:url,media_source:{source_type:'image_url',url},requires_ai_image:p.style==='product'?'no':'yes',alt_text:p.altText,product_title:p.products[0].title,product_handle:p.products[0].handle,status:'ready'};
 return{row,file};
});
if(products.size!==42)throw Error('Expected 42 products');
mkdirSync(path.join(ROOT,'public/pinterest/final'),{recursive:true});
for(const{row,file}of rows)copyFileSync(file,path.join(ROOT,row.generated_image_path));
const next=batch.filter(p=>!ids.has(String(p.id))).concat(rows.map(p=>p.row)).sort((a,b)=>Number(a.id)-Number(b.id));
writeFileSync(batchPath,JSON.stringify(next,null,2)+'\n');
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const fields=['id','date','board_name','keyword','product_handle','visual_strategy','product_2_handle','generated_image_path','title','description','keywords','link','scheduled_at'];
const csv=[fields.join(','),...rows.map(({row:r})=>[r.id,r.scheduled_at.slice(0,10),r.board_name,r.keyword,r.product_handle,r.visual_strategy,r.product_2_handle,r.generated_image_path,r.title,r.description,r.keywords.join('; '),r.link,r.scheduled_at].map(quote).join(','))].join('\n')+'\n';
writeFileSync(path.join(ROOT,'data/weekly_campaign_2026-09-21.csv'),csv);
const archive=path.join(ROOT,'output/campaign_2026-09-21');mkdirSync(archive,{recursive:true});
writeFileSync(path.join(archive,'approval.json'),JSON.stringify(approval,null,2)+'\n');
copyFileSync(path.join(PREVIEW,'validation.json'),path.join(archive,'validation.json'));
copyFileSync(path.join(PREVIEW,'legendas.md'),path.join(archive,'legendas.md'));
copyFileSync(path.join(PREVIEW,'previa-semana-21-a-27-setembro.jpg'),path.join(ROOT,'output/preview_week_5_styles_2026-09-21_to_2026-09-27.jpg'));
console.log('Staged 35 approved pins with exact SEO metadata, 42 products, 2026-09-21 through 2026-09-27.');

