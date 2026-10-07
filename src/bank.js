  const BANK='baka.answerBank.v1';
  cfg={collectAnswers:false,useAnswerBank:false,...cfg};
  const bankText=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
  const bankTitle=v=>bankText(v).replace(/^\d+\s*[.、．]?\s*(?=[【\[])/,'').replace(/^[【\[][^】\]]*(?:选|判断|填空|简答)[^】\]]*[】\]]\s*/,'');
  function bankQuestion(q){return {title:bankTitle(q.title),type:q.type,judge:!!q.judge,visual:!!q.visual,course:String(courseId()||''),questionId:String(q.id||''),options:q.options.map(o=>({label:o.label,value:String(o.value||o.label),text:bankText(text($('a',o.el))||o.text.replace(new RegExp('^'+o.label+'[.、．]?\\s*'),''))}))};}
  function bankKey(e){return JSON.stringify([e.type,e.judge,e.visual?e.course:'',e.visual?e.questionId:'',e.title,e.options.map(o=>o.text).sort()]);}
  function bankAnswerKey(e){return JSON.stringify([e.answer.choices.map(l=>e.options.find(o=>o.label===l)?.text).sort(),e.answer.blanks,e.answer.answer]);}
  function bankEntries(){return GM_getValue(BANK,[]);}
  function bankParseQuestion(root){
    const q=parseQuestion(root);
    if(q.judge&&!q.options.length){q.type='single';q.options=[{label:'A',value:'true',text:'对',el:null},{label:'B',value:'false',text:'错',el:null}];}
    return q;
  }
  function cleanBankEntry(e,imported=false){
    const str=(v,max=16000)=>{if(typeof v!=='string'||v.length>max)throw Error('题库字段格式不正确');return v;};
    if(!e||!['single','multi','blanks','text'].includes(e.type)||typeof e.judge!=='boolean'||typeof e.visual!=='boolean'||!Array.isArray(e.options)||e.options.length>26||!e.answer)throw Error('题库题型或选项格式不正确');
    const result={title:str(e.title),type:e.type,judge:e.judge,visual:e.visual,course:str(e.course,200),questionId:str(e.questionId,200),options:e.options.map(o=>({label:str(o.label,1),value:str(o.value,200),text:str(o.text)}))};
    if(!result.title||result.options.some(o=>! /^[A-Z]$/.test(o.label)||!o.text)||new Set(result.options.map(o=>o.label)).size!==result.options.length)throw Error('题库题干或选项缺失');
    const a=e.answer;if(!Array.isArray(a.choices)||!Array.isArray(a.blanks)||a.choices.length>26||a.blanks.length>100)throw Error('题库答案格式不正确');
    result.answer={choices:a.choices.map(x=>str(x,1)).sort(),blanks:a.blanks.map(x=>str(x)),answer:str(a.answer)};
    if(result.options.length){if(!a.choices.length||new Set(a.choices).size!==a.choices.length||(e.type==='single'&&a.choices.length!==1)||a.choices.some(l=>!result.options.some(o=>o.label===l)))throw Error('题库答案与选项不匹配');result.answer.blanks=[];result.answer.answer='';}
    else if(e.type==='blanks'){if(!a.blanks.length||a.blanks.some(v=>!v.trim()))throw Error('填空答案缺失');result.answer.choices=[];result.answer.answer='';}
    else if(e.type==='text'){if(!a.answer.trim())throw Error('文字答案缺失');result.answer.choices=[];result.answer.blanks=[];}
    else throw Error('选择题选项缺失');
    result.source=imported?'imported':e.source==='imported'?'imported':'platform';
    result.key=bankKey(result);result.id=JSON.stringify([result.key,bankAnswerKey(result)]);return result;
  }
  function mergeBank(records,imported=false){
    const clean=records.map(e=>cleanBankEntry(e,imported)),all=bankEntries(),map=new Map(all.map(e=>[e.id,e]));let added=0;
    for(const e of clean){if(!map.has(e.id)){map.set(e.id,e);added++;}else if(!imported&&e.source==='platform')map.set(e.id,e);}
    GM_setValue(BANK,[...map.values()]);ui.updateBank?.();return added;
  }
  function explicitCorrect(q){
    const candidates=$$('div,p,span,li,dd',q.root).filter(visible).map(e=>text(e)).filter(s=>/^(?:正确答案|参考答案)\s*[:：]/.test(s)).sort((a,b)=>a.length-b.length);
    for(const box of $$('.newAnswerBx .myAnswerBx',q.root).filter(visible)){
      const marks=$$('.CorrectOrNot [class*="marking_"]',box).filter(visible);
      if(marks.length===1&&marks[0].classList.contains('marking_dui')){
        const own=$('.myAnswer .answerCon',box);if(visible(own)&&text(own))candidates.push('正确答案：'+text(own));
      }
    }
    for(const s of candidates){
      const raw=s.replace(/^(?:正确答案|参考答案)\s*[:：]\s*/,'').split(/(?:我的答案|学生答案|您的答案|答案解析|解析|得分)\s*[:：]/)[0].trim();if(!raw)continue;
      const a={choices:[],blanks:[],answer:''};
      if(q.options.length){
        if(q.judge&&/^(正确|错误|对|错|true|false|√|×|✓|✗)$/i.test(raw)){a.answer=raw;try{validateAnswer(q,a);}catch{continue;}}
        else if(/^[A-Z](?:\s*[,，、;；.．]?\s*[A-Z])*[.。]?$/.test(raw))a.choices=[...new Set(raw.match(/[A-Z]/g))];
        else continue;
        try{validateAnswer(q,a);}catch{continue;}
      }else if(q.type==='blanks'){a.blanks=raw.split(/[;；\n]+/).map(bankText).filter(Boolean);}
      else if(q.type==='text')a.answer=raw;else continue;
      return a;
    }return null;
  }
  function collectBank(manual=false){
    if(!manual&&!cfg.collectAnswers)return 0;
    const entries=[];
    for(const d of documents(cardDoc()||document)){
      if(/\/exam\//i.test(d.location.pathname))continue;
      for(const root of questionRoots(d)){
        const q=bankParseQuestion(root),a=explicitCorrect(q);if(!a)continue;
        try{entries.push(cleanBankEntry({...bankQuestion(q),answer:a,source:'platform'}));}catch{}
      }
    }
    if(!entries.length)return 0;
    // Repeated result polling must not rewrite storage or reset the selection list.
    const existing=new Map(bankEntries().map(e=>[e.id,e]));const fresh=entries.filter(e=>!existing.has(e.id)||existing.get(e.id).source!=='platform');
    return fresh.length?mergeBank(fresh):0;
  }
  function bankBeforeAdvance(){
    if(!cfg.collectAnswers)return false;
    collectBank();const key=pageKey();
    const results=documents(cardDoc()||document).some(d=>$('.newAnswerBx',d)||questionRoots(d).some(r=>!!explicitCorrect(parseQuestion(r))));
    if(!S.submit&&!results&&S.bankWait?.key!==key)return false;
    if(S.bankWait?.key!==key)S.bankWait={key,at:Date.now()};
    if(Date.now()-S.bankWait.at<3000){status('正在收集平台公布的正确答案');return true;}return false;
  }
  function bankLookup(q){
    if(!cfg.useAnswerBank)return null;
    if($('img,svg,canvas',q.root))return null;
    const probe=bankQuestion(q),key=bankKey(probe),matches=bankEntries().filter(e=>e.key===key);
    if(!matches.length)return null;
    if(new Set(matches.map(bankAnswerKey)).size!==1){log('题库存在冲突答案，交由 AI 重新判断');return null;}
    const e=matches[0],a={choices:[],blanks:[...e.answer.blanks],answer:e.answer.answer,uncertain:false,explanation:e.source==='imported'?'来自导入题库':'来自平台正确答案题库'};
    if(new Set(probe.options.map(o=>o.text)).size!==probe.options.length)return null;
    for(const l of e.answer.choices){const content=e.options.find(o=>o.label===l)?.text,option=probe.options.find(o=>o.text===content);if(!option)return null;a.choices.push(option.label);}
    try{validateAnswer(q,a);}catch{return null;}return a;
  }
  function bankExport(ids=null){
    const entries=bankEntries().filter(e=>!ids||ids.has(e.id)).map(e=>{const c=cleanBankEntry(e);const {title,type,judge,visual,course,questionId,options,answer}=c;return {title,type,judge,visual,course,questionId,options,answer};});
    return JSON.stringify({format:'baka-answer-bank',version:1,entries},null,2);
  }
  function bankImport(value){
    if(typeof value!=='string'||new Blob([value]).size>10*1024*1024)throw Error('题库文件不能超过 10 MB');
    let data;try{data=JSON.parse(value);}catch{throw Error('文件不是有效 JSON 题库');}
    if(data?.format!=='baka-answer-bank'||data.version!==1||!Array.isArray(data.entries)||data.entries.length>10000)throw Error('请选择 Baka 题库文件（最多 10000 条）');
    return {added:mergeBank(data.entries,true),read:data.entries.length};
  }
  function bankDownload(value){
    const blob=new Blob([value],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Baka题库-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }
  function mountBank(root){
    const nav=$('.tabs',root),tab=document.createElement('button');tab.dataset.tab='bank';tab.textContent='题库';nav.append(tab);
    const pane=document.createElement('div');pane.dataset.pane='bank';pane.hidden=true;
    pane.innerHTML='<label class="switch">自动收集正确答案<input type="checkbox" data-setting="collectAnswers"></label><label class="switch">优先使用题库答案<input type="checkbox" data-setting="useAnswerBank"></label><div class="sub bankStats"></div><div class="row"><button class="btn bankCollect">收集当前页</button><button class="btn bankImport">导入题库</button></div><div class="row"><button class="btn bankExport">导出全部</button><button class="btn bankSelected">导出所选</button></div><button class="btn bankShare">分享题库文件</button><input class="bankFile" type="file" accept=".json,application/json" hidden><label class="field"><span>搜索题目</span><input class="bankSearch" type="search"></label><label class="switch">选择本页<input class="bankAll" type="checkbox"></label><div class="bankList"></div><div class="row"><button class="btn bankPrev">上一页</button><span class="bankPage"></span><button class="btn bankNext">下一页</button></div><div class="sub">收集公布答案或逐题判对的答案。导入文件需确认来源；冲突答案不自动使用。</div>';
    $('.foot',root).before(pane);mountBankScan(pane);let page=0;const selected=new Set();
    const search=$('.bankSearch',pane),list=$('.bankList',pane),all=$('.bankAll',pane);
    ui.updateBank=()=>{
      const entries=bankEntries(),groups=new Map();for(const e of entries){if(!groups.has(e.key))groups.set(e.key,new Set());groups.get(e.key).add(bankAnswerKey(e));}
      const conflicts=[...groups.values()].filter(s=>s.size>1).length;
      $('.bankStats',pane).textContent=`${groups.size} 道题 · ${entries.length} 条答案 · ${entries.filter(e=>e.source==='imported').length} 条导入 · ${conflicts} 题冲突 · 已选 ${selected.size}`;
      const filtered=entries.filter(e=>(e.title+' '+e.questionId+' '+e.course).toLowerCase().includes(search.value.trim().toLowerCase()));
      const pages=Math.max(1,Math.ceil(filtered.length/30));page=Math.min(page,pages-1);const slice=filtered.slice(page*30,page*30+30);list.replaceChildren();
      for(const e of slice){const label=document.createElement('label');label.style.cssText='display:flex;gap:8px;padding:9px 0;border-bottom:1px solid #cde0ec;overflow-wrap:anywhere';const box=document.createElement('input');box.type='checkbox';box.checked=selected.has(e.id);box.onchange=()=>{box.checked?selected.add(e.id):selected.delete(e.id);ui.updateBank();};const span=document.createElement('span');span.textContent=e.title+'\n答案：'+(e.answer.choices.join('、')||e.answer.blanks.join('；')||e.answer.answer)+(e.visual?' · 字体/图片题':'')+(groups.get(e.key).size>1?' · 冲突':'');span.style.whiteSpace='pre-wrap';label.append(box,span);list.append(label);}
      all.checked=slice.length>0&&slice.every(e=>selected.has(e.id));all.indeterminate=slice.some(e=>selected.has(e.id))&&!all.checked;all.onchange=()=>{for(const e of slice)all.checked?selected.add(e.id):selected.delete(e.id);ui.updateBank();};
      $('.bankPage',pane).textContent=`${page+1} / ${pages}`;$('.bankPrev',pane).disabled=page===0;$('.bankNext',pane).disabled=page===pages-1;$('.bankSelected',pane).disabled=!selected.size;
    };
    search.oninput=()=>{page=0;ui.updateBank();};$('.bankPrev',pane).onclick=()=>{page--;ui.updateBank();};$('.bankNext',pane).onclick=()=>{page++;ui.updateBank();};
    $('.bankCollect',pane).onclick=()=>{try{const count=collectBank(true);ui.updateBank();status(`新增 ${count} 条正确答案；支持公布答案和逐题判对结果`);}catch(e){status(e.message);}};
    $('.bankExport',pane).onclick=()=>bankDownload(bankExport());$('.bankSelected',pane).onclick=()=>bankDownload(bankExport(selected));
    const input=$('.bankFile',pane);$('.bankImport',pane).onclick=()=>input.click();input.onchange=async()=>{try{const f=input.files?.[0];if(!f)return;if(f.size>10*1024*1024)throw Error('题库文件不能超过 10 MB');const r=bankImport(await f.text());status(`已导入 ${r.added} 条新答案，${r.read-r.added} 条重复`);}catch(e){status(e.message);}finally{input.value='';}};
    $('.bankShare',pane).onclick=async()=>{const data=bankExport(selected.size?selected:null);try{const file=new File([data],'Baka题库.json',{type:'application/json'});if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title:'Baka题库'});}else{bankDownload(data);status('已导出题库文件，可发送到其他电脑后导入');}}catch(e){if(e.name!=='AbortError'){bankDownload(data);status('系统分享不可用，已改为下载题库文件');}}};
    ui.updateBank();
  }
