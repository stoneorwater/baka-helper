  function optionsFor(root,popup=false){
    let nodes=popup?$$('.ans-videoquiz-opt',root):$$('li[role="radio"],li[role="checkbox"],.Zy_ulTop>li,.Zy_ulBottom>li',root);
    nodes=nodes.filter(visible);
    if(!nodes.length)nodes=$$('input[type="radio"],input[type="checkbox"]',root).map(e=>e.closest('label')||e.parentElement);
    return [...new Set(nodes)].map((el,i)=>{
      const input=$('input[type="radio"],input[type="checkbox"]',el);
      const marker=$('.num_option,.num_option_dx',el),display=text(marker),stored=marker?.getAttribute('data');
      const label=/^[A-Z]$/.test(display)?display:String.fromCharCode(65+i);
      return {el,input,label,value:stored||input?.value||label,text:text(el)};
    });
  }
  function parseQuestion(root,popup=false){
    const titleEl=popup?$('.tkTopic_title',root):$('.Zy_TItle .fontLabel,.Zy_TItle,.question-title,.stem',root);
    const title=text(titleEl)||text(root).slice(0,12000);
    const options=optionsFor(root,popup);
    let fields=$$('textarea,input[type="text"],[contenteditable="true"]',root).filter(e=>visible(e)&&!e.disabled&&!e.readOnly);
    for(const f of $$('iframe',root))try{if(f.contentDocument?.body.isContentEditable)fields.push(f.contentDocument.body);}catch{}
    fields=fields.filter((e,i,a)=>!a.some((p,j)=>i!==j&&p.contains(e)));
    const multi=/多选/.test(title)||options.some(o=>o.input?.type==='checkbox'||o.el.getAttribute('role')==='checkbox'||o.el.getAttribute('qtype')==='1'||!!$('.num_option_dx',o.el)||/addMultipleChoice\s*\(/.test(o.el.getAttribute('onclick')||''));
    const type=multi?'multi':options.length?'single':/填空/.test(title)?'blanks':'text';
    const visual=!!$('.font-cxsecret,img,svg,canvas',root)||!text(titleEl)||/[\uE000-\uF8FF\uFFFD]/.test(title);
    const id=$('[qid]',root)?.getAttribute('qid')||root.closest('[id^="question"]')?.id.replace(/^question/,'')||root.id.replace(/^question/,'')||'';
    return {root,title,options,fields,type,visual,id,popup,judge:/判断题/.test(title)||options.some(o=>o.el.getAttribute('qtype')==='3'),
      fingerprint:JSON.stringify([id,type,title,options.map(o=>[o.label,o.value,o.text]),$$('img',root).map(e=>e.currentSrc||e.src)])};
  }
  function questionRoots(d){
    return $$('.TiMu,.questionLi,.question-item',d).filter(visible)
      .filter(e=>!$('.TiMu,.questionLi,.question-item',e));
  }
  function checked(q,o){
    if(o.input)return o.input.checked;
    const saved=q.id?$(`input[id="answer${q.id}"]`,q.root):null;
    if(saved?.value){const value=saved.value.trim(),stored=o.value||o.label;return value.split(/[\s,;|]+/).includes(stored)||(/^[A-Z]+$/.test(value)&&stored.length===1&&value.includes(stored));}
    if(o.el.hasAttribute('aria-checked'))return o.el.getAttribute('aria-checked')==='true';
    if($('.check_answer,.check_answer_dx,.checked,.selected',o.el)||o.el.classList.contains('check_answer'))return true;
    if(q.id){const value=$(`input[id="answer${q.id}"]`,q.root)?.value||'',stored=o.value||o.label;return value.split(/[\s,;|]+/).includes(stored)||(/^[A-Z]+$/.test(value)&&value.includes(stored));}
    return false;
  }
  function fieldValue(e){return e.isContentEditable?text(e):e.value.trim();}
  function filled(q){return q.options.length?q.options.some(o=>checked(q,o)):q.fields.length>0&&q.fields.every(e=>!!fieldValue(e));}
  function validateAnswer(q,a){
    if(q.judge){
      const raw=a.choices.length===1?a.choices[0]:!a.choices.length?a.answer:'';
      const truth=/^(true|正确|对|√|✓)$/i.test(raw)?'true':/^(false|错误|错|×|✗)$/i.test(raw)?'false':null;
      if(truth!==null){const option=q.options.find(o=>o.value===truth||text($('a',o.el))===(truth==='true'?'对':'错'));if(option)a.choices=[option.label];}
    }
    if(q.options.length){
      if(!a.choices.length||new Set(a.choices).size!==a.choices.length||(q.type==='single'&&a.choices.length!==1)||a.choices.some(l=>!q.options.some(o=>o.label===l)))throw Error('答案与选项不匹配');
    }else if(q.type==='blanks'||q.fields.length>1){if(a.blanks.length!==q.fields.length||a.blanks.some(v=>!v.trim()))throw Error('填空数量不匹配');}
    else if(q.fields.length!==1||!a.answer.trim())throw Error('题型暂不支持自动填写');
  }
  async function fill(q,a,ctx){
    validateAnswer(q,a);if(!valid(ctx)||!q.root.isConnected)throw Error('页面已切换');
    if(q.options.length){
      for(const o of q.options){const want=a.choices.includes(o.label),has=checked(q,o);
        if(want!==has&&(q.type==='multi'||want))(o.input||o.el).click();}
      const until=Date.now()+1500;
      while(Date.now()<until&&q.options.some(o=>checked(q,o)!==a.choices.includes(o.label))){await sleep(100);if(!valid(ctx)||!q.root.isConnected)throw Error('页面已切换');}
      if(q.options.some(o=>checked(q,o)!==a.choices.includes(o.label))){
        log(`题目 ${q.id} 填写核验失败\n期望：${a.choices.join(',')}\n实际：${q.options.filter(o=>checked(q,o)).map(o=>o.label).join(',')||'未选中'}\n映射：${q.options.map(o=>`${o.label}→${o.value}`).join('，')}`);
        throw Error('页面未接受选项，题号和选项映射已记录');
      }
    }else{
      const values=q.type==='blanks'||q.fields.length>1?a.blanks:[a.answer];
      q.fields.forEach((e,i)=>{
        if(e.isContentEditable)e.textContent=values[i];
        else {const W=e.ownerDocument.defaultView,proto=e.tagName==='TEXTAREA'?W.HTMLTextAreaElement.prototype:W.HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto,'value').set.call(e,values[i]);}
        const W=e.ownerDocument.defaultView;e.dispatchEvent(new W.Event('input',{bubbles:true}));e.dispatchEvent(new W.Event('change',{bubbles:true}));e.dispatchEvent(new W.Event('blur',{bubbles:true}));
      });
      if(q.fields.some((e,i)=>fieldValue(e)!==values[i].trim()))throw Error('页面未接受文字答案');
    }
  }
  function popup(d){
    const submit=$('#videoquiz-submit',d),title=$('.tkTopic_title',d);
    if(!visible(submit)||!visible(title))return null;
    let root=title.parentElement;
    while(root&&root!==d.body&&(!root.contains(submit)||!$('.ans-videoquiz-opt',root)))root=root.parentElement;
    const q=parseQuestion(root||d.body,true);q.submit=submit;return q;
  }
  function combinations(q){
    const labels=q.options.map(o=>o.label);if(q.type!=='multi')return labels.map(l=>[l]);
    if(labels.length>8)return [];
    return Array.from({length:(1<<labels.length)-1},(_,i)=>labels.filter((_,j)=>(i+1)&(1<<j)))
      .sort((a,b)=>(a.length===1)-(b.length===1)||a.length-b.length).slice(0,32);
  }
  async function solvePopup(q,ctx){
    S.videoWatch=null;
    const d=q.root.ownerDocument,id=ctx.key+q.fingerprint;
    if(visible($('#spanHas',d))){status('弹题已通过');return;}
    if(cfg.popup==='off'){status('等待回答视频弹题');return;}
    if(S.failed.has(id)){status('本题需要手动处理');return;}
    const record=S.quiz.get(id)||{index:0,choices:combinations(q)};S.quiz.set(id,record);
    try{
      let a;
      if(cfg.popup==='ai'){
        if(record.index)throw Error('AI 答案未通过');status('AI 正在回答弹题');a=await answer(q,ctx);
      }else{
        const choices=record.choices[record.index];if(!choices)throw Error('试答次数已用完');
        a={choices,blanks:[],answer:'',uncertain:false};status(`弹题试答 ${record.index+1}`);
      }
      if(!valid(ctx))return;await fill(q,a,ctx);
      if(!cfg.popupSubmit){pause('弹题已填写，等待提交');return;}
      const feedback=$$('#spanHas,#spanNot,#spanNotBack',d);let changed=false;
      const observer=new MutationObserver(()=>{changed=true;});feedback.forEach(e=>observer.observe(e,{attributes:true,childList:true,subtree:true}));
      let hidden=!$$('#spanNot,#spanNotBack',d).some(visible);
      try{
        if(!valid(ctx))return;q.submit.click();record.index++;
        const end=Date.now()+18000;
        while(Date.now()<end){await sleep(600);if(!valid(ctx)||!q.submit.isConnected||popup(d)?.fingerprint!==q.fingerprint)return;
          if(visible($('#spanHas',d)))return;
          const wrong=$$('#spanNot,#spanNotBack',d).some(visible);if(!wrong)hidden=true;
          if(wrong&&(changed||hidden)){if(cfg.popup==='ai')throw Error('AI 答案未通过');return;}}
        throw Error('没有收到答题反馈');
      }finally{observer.disconnect();}
    }catch(e){if(valid(ctx)){S.failed.add(id);if(cfg.fullAuto){fault('视频弹题需要处理：'+e.message);}else status(e.message);}}
  }
  function submitButton(d){return $$('.btnSubmit,button,[role="button"]',d).find(e=>visible(e)&&/^提交(?:作业|答案)?$/.test(text(e)));}
  function pendingIdentity(q){return [courseId(),chapterId(),$('[id^="dct"].active')?.getAttribute('cardid')||'',q.id||q.fingerprint].join('|');}
  function resolveQuestion(q){if(S.deferred.delete(pendingIdentity(q))){GM_setValue('cirno.pending.v5',[...S.deferred.values()]);ui.updatePending?.();}}
  function deferQuestion(q,reason){
    const item={key:pendingIdentity(q),course:courseId(),chapter:chapterId(),card:$('[id^="dct"].active')?.getAttribute('cardid')||'',id:q.id,title:q.visual?'截图题 '+(q.id||''):q.title.slice(0,120),reason:redact(reason)};
    S.deferred.set(item.key,item);
    GM_setValue('cirno.pending.v5',[...S.deferred.values()]);log(`待处理：${item.title}\n章节 ${item.chapter}\n${item.reason}`);ui.updatePending?.();
  }
  async function leaveIncompleteWork(d,ctx){
    const saveButton=$$('.btnSave,button,[role="button"]',d).find(e=>visible(e)&&/^暂时保存$|^保存(?:作业|答案)?$/.test(text(e)));
    if(saveButton){saveButton.click();await sleep(800);}
    if(valid(ctx)){log('本页有待处理题目，未提交；继续下一项');advance();}
  }
  async function doHomework(d,ctx){
    if(!cfg.homework&&!S.single){advance();return;}
    if($('.newAnswerBx',d)&&!submitButton(d)){questionRoots(d).map(r=>parseQuestion(r)).forEach(resolveQuestion);advance();return;}
    if(/\/exam\//i.test(d.location.pathname)){pause('考试页面不在当前任务范围');return;}
    const roots=questionRoots(d);if(!roots.length){waitContent('等待题目加载');return;}
    const qs=roots.map(r=>parseQuestion(r));
    if(qs.some(q=>!q.options.length&&!q.fields.length)&&!cfg.fullAuto){
      if(!submitButton(d)){advance();return;}
      pause('遇到暂不支持的题型');return;
    }
    let unresolved=false;
    for(let i=0;i<qs.length;i++){
      const q=qs[i];if(filled(q)&&!S.replaceAnswers){resolveQuestion(q);continue;}
      if(!q.options.length&&!q.fields.length){if(cfg.fullAuto&&!S.single){deferQuestion(q,'题型暂不支持自动填写');unresolved=true;continue;}pause('遇到暂不支持的题型');return;}
      status(`AI 答题 ${i+1} / ${qs.length}`);
      try{
        const a=await answer(q,ctx);if(!valid(ctx))return;
        await fill(q,a,ctx);progress();resolveQuestion(q);log(`${i+1}. ${a.choices.join('')||a.blanks.join('；')||a.answer}\n${a.explanation||''}`);
      }catch(e){if(!valid(ctx))return;if(cfg.fullAuto&&!S.single&&e.code==='UNCERTAIN'){deferQuestion(q,e.message);unresolved=true;continue;}fault(e.message);return;}
    }
    if(!valid(ctx))return;
    if(unresolved){await leaveIncompleteWork(d,ctx);return;}
    if(!qs.every(filled)){fault('尚有未填写的题目');return;}
    if(S.replaceAnswers){pause('已重新填写本页，请核对后手动提交');return;}
    if(!cfg.autoSubmit){pause('已填写，等待你提交');return;}
    const button=submitButton(d);if(!button){fault('未识别到提交按钮');return;}
    if(S.submit){status('等待提交结果');return;}
    S.submit={d,key:ctx.key,at:Date.now(),confirmed:false};button.click();status('正在提交');
  }
  function handleSubmission(){
    const p=S.submit;if(!p)return false;
    if(p.key!==pageKey()){S.submit=null;return false;}
    const d=p.d;
    const confirm=documents().flatMap(doc=>$$('a[onclick*="submitCheckTimes"],#popok',doc)).find(visible);
    if(!p.confirmed&&confirm){
      const dialog=confirm.closest('.AlertCon02,.popSetDiv,.popDiv,[role="dialog"]')||confirm.parentElement.parentElement;
    const wording=text(dialog);
      if(/提交/.test(wording)&&!/未作答|未完成|验证码|重做|考试|剩余.*0次/.test(wording)){
        if(cfg.autoSubmit){p.confirmed=true;confirm.click();}
      }else{fault('提交需要手动确认');return true;}
    }
    if(visible($('#submitBack',d))){fault('答案未达到通过标准');return true;}
    const card=cardDoc(),markers=$$('.ans-job-icon',card);
    if(markers.length&&markers.every(taskDone)){if(bankBeforeAdvance())return true;S.submit=null;advance();return true;}
    if(!d.documentElement?.isConnected||!submitButton(d)){
      const result=text(d.body);
      if(/已提交|待批阅|提交成功|成绩|得分/.test(result)){if(bankBeforeAdvance())return true;S.submit=null;advance();return true;}
    }
    if(Date.now()-p.at>30000){fault('未确认提交成功，请检查页面');if(S.autoHold)S.autoHold.submission=true;}
    return true;
  }
  function catalogue(){
    return $$('#content1 .posCatalog_name[onclick]').map(el=>{
      const holder=el.closest('[id^="cur"]');
      const match=(el.getAttribute('onclick')||'').match(/getTeacherAjax\([^,]+,[^,]+,\s*['"]([^'"]+)/);
      return {el,id:holder?.id.replace(/^cur/,'')||match?.[1]||'',complete:!!$('.icon_Completed',holder),
        remaining:Number(text($('.orangeNew',holder)))||null,reading:/阅读/.test(el.title||text(el))};
    }).filter(x=>x.id);
  }
  function navigate(el,label){
    if(S.pending)return;progress();S.epoch++;S.pending={key:pageKey(),at:Date.now()};status(label);el.click();
  }
  function cardIdentity(el){return [courseId(),chapterId(),el?.getAttribute('cardid')||el?.id||''].join('/');}
  function cardRank(el){const label=el.title||text(el);return /视频/.test(label)?0:/测验|习题|作业|练习/.test(label)?1:/阅读/.test(label)?2:3;}
  function orderedCards(){return $$('[id^="dct"][cardid]').sort((a,b)=>cardRank(a)-cardRank(b));}
  function prioritizeVideo(){
    if(!cfg.fullAuto||S.single)return false;
    const active=$('[id^="dct"].active');
    if(active&&cardRank(active)===0)return false;
    const next=orderedCards().find(el=>cardRank(el)===0&&!S.cardDone.has(cardIdentity(el)));
    if(!next)return false;navigate(next,'先检查本节视频');return true;
  }
  function advance(){
    if(!S.started||S.pending)return;
    if(bankBeforeAdvance())return;
    if(S.single){pause('本页处理完成');return;}
    const active=$('[id^="dct"].active'),tabs=$$('[id^="dct"][cardid]');
    S.pageDone.add(pageKey());
    if(active)S.cardDone.add(cardIdentity(active));
    const index=tabs.indexOf(active);
    const next=cfg.fullAuto?orderedCards().find(el=>el!==active&&!S.cardDone.has(cardIdentity(el))):(index>=0?tabs.slice(index+1).find(el=>cfg.homework||!/测验|习题|作业|练习/.test(el.title||text(el))):null);
    if(next){navigate(next,'切换学习内容');return;}
    const items=catalogue(),pos=items.findIndex(x=>x.id===chapterId());
    const visitedKey=`${courseId()}/${chapterId()}`;S.visit.add(visitedKey);
    const ordered=[...items.slice(Math.max(0,pos+1)),...items.slice(0,Math.max(0,pos))];
    const skipped=new Set(readFlow()?.skipped||[]);
    const candidate=ordered.find(x=>!skipped.has(x.id)&&!S.visit.has(`${courseId()}/${x.id}`)&&(!x.complete||(cfg.reading&&x.reading)));
    if(candidate){navigate(candidate.el,'前往未完成任务');return;}
    if(!items.length){const button=$('#prevNextFocusNext');if(visible(button)){navigate(button,'前往下一节');return;}}
    const unresolved=[...S.deferred.values()].filter(x=>x.course===courseId()).length;
    pause(unresolved?`本轮结束 · ${unresolved} 题待处理`:'本轮任务已处理完毕');
  }
  function firstUnfinished(){
    const item=catalogue().find(x=>!x.complete&&x.remaining!==null);
    if(!item){status('没有找到明确未完成的章节');return;}
    S.visit.clear();navigate(item.el,'定位未完成任务');
  }
  function videoWatchdog(v=null,reason='视频加载中'){
    const now=Date.now(),key=pageKey(),time=Number(v?.currentTime)||0;
    let w=S.videoWatch;
    if(!w||w.key!==key||w.video!==v)w=S.videoWatch={key,video:v,time,at:now,lastPlay:0};
    if(v&&!v.error&&time>w.time+0.2){w.time=time;w.at=now;S.lastVideoProgress=now;progress();}
    if(v&&(S.manual.has(v)||S.playBlocked?.has(v))){w.at=now;return false;}
    const seconds=Math.floor((now-w.at)/1000);
    if(seconds>=300){recoverPage(`${reason}持续 5 分钟，返回课程重试`);return true;}
    if(seconds>=5||v?.error||!v)status(`${reason} · ${seconds}/300 秒后恢复`);
    return false;
  }
  async function playVideo(v){
    if(!S.bound.has(v)){
      S.bound.add(v);const box=v.closest('.video-js')||v.parentElement;
      for(const type of ['pointerdown','keydown'])box.addEventListener(type,e=>{if(e.isTrusted)S.gesture.set(v,Date.now());},true);
      v.addEventListener('pause',()=>{if(Date.now()-(S.gesture.get(v)||0)<1000&&!v.ended)S.manual.add(v);});
      v.addEventListener('playing',()=>{S.manual.delete(v);S.playBlocked?.delete(v);});
    }
    if(S.manual.has(v)){S.videoWatch=null;status('视频已手动暂停');return;}
    if(S.playBlocked?.has(v)){S.videoWatch=null;status('请点击一次视频播放');return;}
    if(videoWatchdog(v,v.error?'视频加载失败':v.ended?'等待视频任务完成标记':'视频等待加载或播放进度'))return;
    if(v.error||v.ended)return;
    v.muted=cfg.muted;
    if(v.paused&&Date.now()-S.videoWatch.lastPlay>5000){
      S.videoWatch.lastPlay=Date.now();const ctx=currentEpoch();
      Promise.resolve().then(()=>v.play()).catch(e=>{if(valid(ctx)&&e.name==='NotAllowedError'){S.playBlocked||=new WeakSet();S.playBlocked.add(v);status('请点击一次视频播放');}});
    }
    if(Date.now()-S.videoWatch.at<5000)status('视频播放中');
  }
  async function openReader(root){
    if(!cfg.reading){advance();return;}
    const d=documents(root).find(d=>$('.readInfo',d));
    if(!d){status('等待阅读入口');return;}
    const ticket={id:crypto.randomUUID(),parent:owner,course:courseId(),key:pageKey(),at:Date.now(),state:'pending'};
    GM_setValue(TICKET,ticket);S.waitReader=ticket;release();
    const original=unsafeWindow.open;
    try{
      unsafeWindow.open=function(url,...args){
        const u=new URL(url,location.href);
        if(u.protocol==='https:'&&/(^|\.)chaoxing\.com$/.test(u.hostname)&&/\/zt\/|\/course\//.test(u.pathname)){
          u.searchParams.set('cirnoReader',ticket.id);GM_openInTab(u.href,{active:true,setParent:true});return null;
        }
        return original.call(unsafeWindow,url,...args);
      };
      $('.readInfo',d).click();status('正在打开阅读页');
    }finally{unsafeWindow.open=original;}
  }
  async function waitReader(){
    const t=GM_getValue(TICKET,null);
    if(!t||t.id!==S.waitReader.id){pause('阅读会话已失效');S.waitReader=null;return;}
    if(t.state==='done'||t.state==='skipped'){
      if(t.state==='skipped')markSkipped(t.reason||'阅读未完成');
      S.waitReader=null;GM_setValue(TICKET,null);
      if(await acquire()){S.epoch++;advance();}return;
    }
    if(t.state==='stopped'){S.waitReader=null;pause('阅读已暂停');return;}
    if(t.state==='pending'&&Date.now()-t.at>60000){S.waitReader=null;if(await acquire())fault('阅读新窗口未连接');return;}
    if(t.state==='active'&&Date.now()-(t.lastSeen||t.at)>180000){S.waitReader=null;if(await acquire())fault('阅读页连接中断');return;}
    status(t.state==='active'?'阅读页正在处理':'等待阅读页打开');
  }
  function readerLinks(){return $$('a[href*="/ztnodedetailcontroller/visitnodedetail"]');}
  function readIdentity(){const u=new URL(location.href);return `${u.searchParams.get('courseId')||''}/${u.searchParams.get('knowledgeId')||''}`;}
  function readerNext(){return $$('a[href]',document).find(a=>/^下一页\s*[›»>]?/.test(text(a))&&visible(a)&&!a.classList.contains('disabled')&&a.getAttribute('aria-disabled')!=='true'&&!/^javascript:|^#$/.test(a.getAttribute('href'))&&a.href!==location.href&&flowURL(a.href));}
  function readerScroller(){
    const body=$('#ztMainBoxFocus,#courseMainBox')||document.body;
    return [body,...$$('*',body)].find(e=>visible(e)&&e.clientHeight>80&&e.scrollHeight>e.clientHeight+8&&/auto|scroll/.test(getComputedStyle(e).overflowY))||document.scrollingElement;
  }
  async function readTick(){
    const now=Date.now();
    if(S.reading){const t=GM_getValue(TICKET,null);if(t?.id!==S.reading.id||t.state!=='active'){pause('阅读已暂停');return;}GM_setValue(TICKET,{...t,lastSeen:now});}
    if(!$('#ztMainBoxFocus')&&readerLinks().length){
      const seen=new Set(GM_getValue(`cirno.read.${new URL(readerLinks()[0].href).searchParams.get('courseId')}`,[]));
      const first=readerLinks().find(a=>!seen.has(new URL(a.href).searchParams.get('knowledgeId')));
      if(first){location.assign(first.href);return;}
      finishReading();return;
    }
    const signature=readIdentity();
    if(signature!==S.readerSignature){S.readerSignature=signature;S.readerSince=now;S.readerBottom=0;S.readerPending=null;S.readerLast=now;progress();}
    if(S.readerPending){if(now-S.readerPending>25000)fault('阅读翻页未响应');return;}
    const u=new URL(location.href),book=u.searchParams.get('courseId'),chapter=u.searchParams.get('knowledgeId');
    const next=readerNext();
    if(book&&chapter&&GM_getValue(`cirno.read.${book}`,[]).includes(chapter)){
      if(next){S.readerPending=now;next.click();status('跳过已阅读页');}else finishReading();return;
    }
    const scroller=readerScroller();
    if(!scroller)return;
    const height=scroller===document.scrollingElement?innerHeight:scroller.clientHeight;
    const seconds=Math.min(2,Math.max(.1,(now-(S.readerLast||now-1500))/1000));S.readerLast=now;
    const step=Math.max(1,Math.min(1200,Math.max(10,Number(cfg.readSpeed)||80))*seconds);
    if(scroller.scrollTop+height<scroller.scrollHeight-8){
      if(S.readerTop!==scroller.scrollTop){S.readerTop=scroller.scrollTop;progress();}
      if(scroller===document.scrollingElement)window.scrollBy({top:step,behavior:'smooth'});else scroller.scrollBy({top:step,behavior:'smooth'});
      status(`缓慢阅读 · ${cfg.readSpeed} 像素/秒`);return;
    }
    if(!S.readerBottom){S.readerBottom=now;return;}
    if(now-S.readerSince<cfg.readSeconds*1000||now-S.readerBottom<1500){status('已到页尾');return;}
    if(book&&chapter){const k=`cirno.read.${book}`,seen=new Set(GM_getValue(k,[]));seen.add(chapter);GM_setValue(k,[...seen]);}
    if(next){S.readerPending=now;next.click();status('阅读下一页');return;}
    const more=$('#loadbutton');if(visible(more)){
      const before=more.getAttribute('onclick');more.click();S.readerSince=now;S.readerBottom=0;
      await sleep(1500);if(more.isConnected&&more.getAttribute('onclick')===before){fault('阅读内容未加载');}return;
    }
    if($('#ztMainBoxFocus')||$('#courseMainBox'))finishReading();else fault('未识别阅读正文');
  }
  function finishReading(){
    const t=GM_getValue(TICKET,null);if(S.reading&&t?.id===S.reading.id)GM_setValue(TICKET,{...t,state:'done'});
    sessionStorage.removeItem('cirno.readSession');pause('阅读完成');
  }
  function waitContent(message){if(/视频/.test($('[id^="dct"].active')?.title||'')){videoWatchdog(null,message);return;}if(Date.now()-S.changed>45000)recoverPage(message+'超时');else status(message);}
  async function tick(){
    if(S.busy||!S.started)return;
    if(S.waitReader){await waitReader();return;}
    if(!ownsLease()){pause('运行已转交其他页面');return;}
    renewLease();
    S.busy=true;
    try{
      if(readerPage){await readTick();return;}
      const key=pageKey();
      if(key!==S.key){S.key=key;S.changed=Date.now();S.epoch++;S.pending=null;S.submit=null;S.videoWatch=null;S.lastVideoProgress=0;S.failed.clear();S.quiz.clear();}
      if(S.pending){if(Date.now()-S.pending.at>25000)recoverPage('页面未跳转，请检查前置条件');return;}
      if(Date.now()-S.changed<4500){status('加载中');return;}
      if(prioritizeVideo())return;
      if(!$('#iframe')&&$('#mainid')&&Date.now()-S.changed>=10000){advance();return;}
      const card=cardDoc();
      if(!card?.body||card.readyState==='loading'){waitContent('等待内容加载');return;}
      if(handleSubmission())return;
      const ctx=currentEpoch(),docs=documents(card),wrappers=$$('.ans-attach-ct',card);
      if(cfg.fullAuto)wrappers.sort((a,b)=>Number(!/\/video\//.test($('iframe',a)?.getAttribute('src')||''))-Number(!/\/video\//.test($('iframe',b)?.getAttribute('src')||'')));
      for(const d of docs){const q=popup(d);if(q){await solvePopup(q,ctx);return;}}
      const activeTitle=$('[id^="dct"].active')?.title||'';
      if(/问卷|调查/.test(activeTitle+text($('#mainid>h1,#mainid>h2')))){advance();return;}
      for(const wrapper of wrappers){
        const f=$('iframe',wrapper),src=f?.getAttribute('src')||'';
        const marker=$('.ans-job-icon',wrapper),done=taskDone(marker)||wrapper.classList.contains('ans-job-finished');
        if(/\/read\//.test(src)){
          if(cfg.reading){await openReader(f.contentDocument);return;}continue;
        }
        if(done)continue;
        if(/\/video\//.test(src)){
          if(!cfg.video)continue;
          const v=documents(f.contentDocument).flatMap(d=>$$('video',d))[0];
          if(v)await playVideo(v);else videoWatchdog(null,'等待视频加载');return;
        }
        if(/\/work\//.test(src)){
          if(!cfg.homework&&!S.single)continue;
          const d=documents(f.contentDocument).find(d=>questionRoots(d).length||submitButton(d));
          if(d)await doHomework(d,ctx);else waitContent('等待习题加载');return;
        }
        if(marker&&!done){fault('遇到尚未适配的任务类型');return;}
      }
      const videos=docs.flatMap(d=>$$('video',d));
      if(videos.length&&!wrappers.length&&cfg.video){const v=videos.find(v=>!v.ended);if(v){await playVideo(v);return;}}
      const work=!wrappers.some(w=>/\/work\//.test($('iframe',w)?.getAttribute('src')||''))&&docs.find(d=>questionRoots(d).length);
      if(work){await doHomework(work,ctx);return;}
      const unloaded=$$('iframe',card).filter(visible).some(f=>{try{return !f.contentDocument?.body||f.contentDocument.readyState==='loading';}catch{return true;}});
      if(unloaded){waitContent('等待嵌入内容');return;}
      if(!wrappers.length&&$$('iframe',card).some(f=>/\/modules\/(video|work|read)\//.test(f.getAttribute('src')||''))){waitContent('等待任务控件');return;}
      if(!wrappers.length&&/视频/.test(activeTitle)&&Date.now()-S.changed<20000){status('检查视频页面');return;}
      if(Date.now()-S.changed>=( $('#pageDiv',card)?7000:12000))advance();else status('检查无视频内容');
    }catch(e){status(e.message||'页面处理失败');}
    finally{S.busy=false;}
  }
