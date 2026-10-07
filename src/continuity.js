  const FLOW=`cirno.flow.v5.${owner}`;
  cfg={stallSeconds:300,readSpeed:80,...cfg};
  const readFlow=()=>GM_getValue(FLOW,null);
  function clearFlow(){GM_setValue(FLOW,null);S.flowLeaving=false;S.autoHold=null;S.progress=null;}
  function progress(){S.progress={key:pageKey(),at:Date.now()};}
  function continuous(){return (cfg.fullAuto||readerPage)&&!S.single&&cfg.recover;}
  function fault(message){
    if(!continuous()){pause(message);return;}
    S.autoHold={key:pageKey(),at:Date.now(),reason:message,submission:!!S.submit,popup:/视频弹题/.test(message)};progress();
    log(`等待恢复：${message}`);status(`${message} · 等待手动处理，60 秒后重试`);
  }
  function flowURL(value){
    try{const u=new URL(value);return u.protocol==='https:'&&/(^|\.)chaoxing\.com$/.test(u.hostname)&&!u.username&&!u.password&&(/\/(?:mooc-ans\/)?mycourse\/studentstudy/.test(u.pathname)||/\/(?:mooc-ans\/)?(?:zt|ztnodedetailcontroller)\//.test(u.pathname))?u.href:null;}catch{return null;}
  }
  function nextSectionURL(){
    const items=catalogue(),index=items.findIndex(x=>x.id===chapterId());
    if(index<0)return null;
    const skipped=new Set(readFlow()?.skipped||[]);
    const next=items.slice(index+1).find(x=>!skipped.has(x.id)&&(!x.complete||(cfg.reading&&x.reading)));
    if(!next)return null;
    const u=new URL(location.href);u.searchParams.set('chapterId',next.id);return flowURL(u.href);
  }
  function markSkipped(reason){
    const key=`skip/${courseId()}/${chapterId()||readIdentity()}`;
    S.deferred.set(key,{key,course:courseId(),chapter:chapterId()||readIdentity(),title:'跳过的未完成内容',reason:redact(reason)});
    GM_setValue('cirno.pending.v5',[...S.deferred.values()]);ui.updatePending?.();
  }
  function flowNavigate(record,url){
    S.epoch++;requestHandle?.abort?.();requestHandle=null;S.apiUntil=0;S.autoHold=null;
    GM_setValue(FLOW,{...record,at:Date.now()});S.flowLeaving=true;sessionStorage.setItem(RUN,'1');
    status(record.phase==='refresh'?'卡住保底：重新加载当前内容':record.phase==='return'?'重试仍失败：返回课程后跳过当前节':'前往下一节');
    recoveryIO.go(url);
  }
  function recoverContinuous(reason){
    if(!S.started||S.flowLeaving)return;
    if(pageError()?.kind==='manual'){pause('需要手动完成登录或验证');return;}
    const old=readFlow(),key=readerPage?readIdentity():`${courseId()}/${chapterId()}`;
    const same=old?.key===key;
    if(!same||old.phase!=='monitor'){
      const current=new URL(location.href);if(!readerPage&&chapterId())current.searchParams.set('chapterId',chapterId());
      const url=readerPage?flowURL(location.href):recoveryContext()?.studyUrl||flowURL(current.href);
      if(!url){pause('当前页面地址不支持恢复');return;}
      const context=recoveryContext();
      flowNavigate({phase:'refresh',key,url,courseUrl:context?.courseUrl,nextUrl:readerPage?null:nextSectionURL(),skipped:old?.skipped||[],reason,reader:readerPage,reading:S.reading||null,visits:[...S.visit],cards:[...S.cardDone],pendingSubmit:!!S.submit},url);return;
    }
    markSkipped(reason);log(`已跳过未完成内容：${reason}`);
    if(readerPage){
      const t=GM_getValue(TICKET,null);
      if(S.reading&&t?.id===S.reading.id){GM_setValue(TICKET,{...t,state:'skipped',reason});S.reading=null;sessionStorage.removeItem('cirno.readSession');pause('阅读卡住，已通知课程页继续');return;}
      const next=readerNext();if(next){flowNavigate({...old,key:'',phase:'reader-next',nextUrl:next.href,pendingSubmit:false,reason},next.href);return;}
      pause('阅读无法恢复且未找到下一页');return;
    }
    const next=old.nextUrl||nextSectionURL();
    if(!next){pause('已到课程末尾，未完成内容已记录');return;}
    const record={...old,phase:'return',nextUrl:next,pendingSubmit:false,skipped:[...new Set([...(old.skipped||[]),chapterId()])],reason};
    if(safeCourseURL(old.courseUrl,true))flowNavigate(record,old.courseUrl);else flowNavigate({...record,phase:'next'},next);
  }
  async function flowBoot(){
    const r=readFlow();if(!r)return false;
    if(!cfg.recover||Date.now()-r.at>86400000||!flowURL(r.url)){clearFlow();return false;}
    if(overviewPage&&r.phase==='return'){
      if(!flowURL(r.nextUrl)){pause('下一节地址不可用');return true;}
      flowNavigate({...r,phase:'next'},r.nextUrl);return true;
    }
    if(overviewPage)return false;
    if(!['refresh','monitor','fresh','next','reader-next'].includes(r.phase)){clearFlow();return false;}
    const expected=r.phase==='next'?r.nextUrl:r.phase==='reader-next'?r.nextUrl||location.href:r.url;
    const actualKey=readerPage?readIdentity():`${courseId()}/${chapterId()}`;
    if(['refresh','monitor','fresh'].includes(r.phase)&&r.key!==actualKey){clearFlow();return false;}
    if(r.phase==='next'&&new URL(expected).searchParams.get('chapterId')!==chapterId()){clearFlow();return false;}
    S.visit=new Set(r.visits||[]);S.cardDone=new Set(r.cards||[]);S.flowLeaving=false;
    if(r.reader&&r.reading){S.reading=r.reading;GM_setValue(TICKET,{...r.reading,reader:owner,state:'active',at:Date.now()});}
    if(r.phase==='next'||r.phase==='reader-next'||r.phase==='fresh')GM_setValue(FLOW,{...r,key:actualKey,phase:'fresh',url:location.href,at:Date.now()});
    else GM_setValue(FLOW,{...r,phase:'monitor',at:Date.now()});
    await start(false,false,true);
    if(r.pendingSubmit)S.autoHold={key:pageKey(),at:Date.now(),reason:'刷新后核对上次提交结果',submission:true};
    return true;
  }
  async function continuityTick(){
    const r=readFlow();
    if(S.flowLeaving){
      if(r&&Date.now()-r.at>30000){
        S.flowLeaving=false;
        if(r.phase==='return'&&flowURL(r.nextUrl))flowNavigate({...r,phase:'next'},r.nextUrl);
        else if(r.phase==='refresh'){GM_setValue(FLOW,{...r,phase:'monitor'});recoverContinuous('重新加载未响应');}
        else pause('页面跳转失败，请检查浏览器连接');
      }return true;
    }
    if(!S.started||!continuous()||overviewPage||S.waitReader)return false;
    const key=pageKey();if(!S.progress||S.progress.key!==key)progress();
    if(S.autoHold){
      const h=S.autoHold,card=cardDoc(),docs=documents(card||document),markers=$$('.ans-job-icon',card);
      const completed=markers.length>0&&markers.every(taskDone)||docs.some(d=>$('.newAnswerBx',d)&&!submitButton(d));
      if(key!==h.key||completed){if(completed&&bankBeforeAdvance())return true;S.autoHold=null;S.submit=null;S.busy=false;S.epoch++;progress();if(completed)advance();return true;}
      if(h.popup&&!docs.some(d=>popup(d))){S.autoHold=null;S.failed.clear();progress();return false;}
      if(!h.submission&&docs.some(d=>{const qs=questionRoots(d).map(r=>parseQuestion(r));return qs.length&&qs.every(filled);})){S.autoHold=null;progress();return false;}
      const seconds=Math.max(0,60-Math.floor((Date.now()-h.at)/1000));
      if(!seconds){S.autoHold=null;recoverContinuous(h.reason);return true;}
      status(`${h.reason} · ${seconds} 秒后恢复，可手动完成`);return true;
    }
    if(Date.now()<(S.apiUntil||0))return false;
    const videos=documents(cardDoc()||document).flatMap(d=>$$('video',d));
    if(videos.some(v=>S.manual.has(v)||S.playBlocked?.has(v))){progress();return false;}
    const limit=Math.max(Number(cfg.stallSeconds)||300,readerPage?(Number(cfg.readSeconds)||15)+30:0)*1000;
    if(Date.now()-S.progress.at>=limit){recoverContinuous('页面长时间没有进展');return true;}
    return false;
  }
