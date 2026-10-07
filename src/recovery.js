  const overviewPage=/\/(?:mooc2-ans|mooc-ans)\/mycourse\/stu\/?$/.test(location.pathname);
  const RECOVERY=`cirno.recovery.v5.${owner}`,RETURN_CONTEXT=`cirno.return.v5.${owner}`;
  cfg={recover:true,recoveryMinutes:10,recoveryLimit:3,...cfg};
  const recoveryIO={go:url=>location.assign(url),refresh:()=>location.reload()};
  const readRecovery=()=>GM_getValue(RECOVERY,null);
  function recoverySettings(){return {minutes:Math.min(120,Math.max(1,Number(cfg.recoveryMinutes)||10)),limit:Math.min(10,Math.max(1,Number(cfg.recoveryLimit)||3))};}
  function clearRecovery(){GM_setValue(RECOVERY,null);S.recoveryLeaving=false;if(ui.cancelRecovery)ui.cancelRecovery.hidden=true;}
  function safeCourseURL(value,overview=false){
    try{const u=new URL(value,location.href);return u.protocol==='https:'&&/(^|\.)chaoxing\.com$/.test(u.hostname)&&!u.username&&!u.password&&(overview?/\/(?:mooc2-ans|mooc-ans)\/mycourse\/stu\/?$/:/\/(?:mooc-ans\/)?mycourse\/studentstudy\/?$/).test(u.pathname)?u.href:null;}catch{return null;}
  }
  function recoveryContext(){
    const study=safeCourseURL(location.href);if(!study)return null;
    const u=new URL(study);if(chapterId())u.searchParams.set('chapterId',chapterId());
    const saved=GM_getValue(RETURN_CONTEXT,null);
    const link=$('a#contentFocus[href]')||$$('a[href]').find(a=>text(a)==='返回课程');
    const course=safeCourseURL(link?.href||'',true)||(saved?.courseId===courseId()?safeCourseURL(saved.courseUrl,true):null);
    return course?{studyUrl:u.href,courseUrl:course,courseId:courseId()}:null;
  }
  function rememberReturn(){const context=recoveryContext();if(context)GM_setValue(RETURN_CONTEXT,context);}
  function recoveryNavigate(record,refresh=false){
    GM_setValue(RECOVERY,{...record,at:Date.now()});S.recoveryLeaving=true;
    if(refresh)recoveryIO.refresh();else recoveryIO.go(overviewPage&&record.stage==='entering'?record.studyUrl:record.courseUrl);
  }
  function waitForRecovery(record,reason){
    const {minutes,limit}=recoverySettings();
    if(record.attempts>=limit){pause(`连续恢复 ${limit} 次仍异常，已停止：${reason}`);return;}
    pause('等待重试',true);
    GM_setValue(RECOVERY,{...record,stage:'waiting',reason,at:Date.now(),retryAt:Date.now()+minutes*60000});
    S.recoveryLeaving=false;showRecoveryWait();
  }
  function recoverPage(reason){
    if(!S.started)return;
    if(continuous()){recoverContinuous(reason);return;}
    if(S.submit){pause(`页面异常，提交结果尚未确认，请先检查提交记录：${reason}`);return;}
    if(!cfg.recover){pause(reason);return;}
    const old=readRecovery();
    const context=recoveryContext()||old;
    if(!context||!safeCourseURL(context.studyUrl)||!safeCourseURL(context.courseUrl,true)){pause(`${reason}；未找到返回课程入口，请手动返回`);return;}
    log(`页面异常：${reason}`);
    if(old){waitForRecovery({...old,...context},reason);return;}
    pause('正在返回课程并刷新',true);
    recoveryNavigate({...context,attempts:1,stage:'course',reason});
  }
  function showRecoveryWait(){
    const r=readRecovery();if(r?.stage!=='waiting')return;
    const seconds=Math.max(0,Math.ceil((r.retryAt-Date.now())/1000));
    status(`异常恢复：${Math.floor(seconds/60)}分${String(seconds%60).padStart(2,'0')}秒后重试（${r.attempts}/${recoverySettings().limit}） · ${r.reason}`);
    if(ui.cancelRecovery)ui.cancelRecovery.hidden=false;
  }
  function classifyPageError(value){
    if(/验证码|完成验证|安全验证|请.{0,5}(重新)?登[录陆]|登[录陆].{0,5}(过期|失效)/.test(value))return 'manual';
    return /(?:系统|网络|服务|请求|访问|操作|页面|加载).{0,6}(?:异常|错误|失败|繁忙|频繁|超时)|(?:异常|错误).{0,6}(?:系统|网络|服务|请求|访问|操作)|稍后.{0,3}再试|(?:502|503|504)\s*(?:Bad Gateway|Service Unavailable|Gateway Time.?out)|(?:多个|其他|其它).{0,8}(?:窗口|页面).{0,8}(?:学习|播放)|(?:出错了|发生异常)/i.test(value)?'retry':null;
  }
  function pageError(){
    for(const d of documents()){
      const boxes=$$('[role="dialog"],.layui-layer-dialog,.layui-layer-content,.AlertCon02,.alert-danger,.error-box,.error-message,#workpopFocus',d);
      if(!$('#mainid,#pageDiv,.TiMu,.newTiMu,video,iframe',d)&&text(d.body).length<700)boxes.push(d.body);
      for(const box of boxes){
        if(!visible(box)||box.closest('#cirno-helper-root,.TiMu,.newTiMu'))continue;
        const value=text(box);if(!value||value.length>700)continue;
        const kind=classifyPageError(value);if(kind)return {kind,message:value.slice(0,180)};
      }
    }
    return null;
  }
  async function recoveryBoot(){
    const r=readRecovery();if(!r)return false;
    if(!cfg.recover||Date.now()-r.at>24*3600000||!safeCourseURL(r.studyUrl)||!safeCourseURL(r.courseUrl,true)){clearRecovery();return false;}
    if(r.stage==='waiting'){S.started=false;sessionStorage.setItem(RUN,'0');showRecoveryWait();return true;}
    if(overviewPage){
      if(r.stage==='course')recoveryNavigate({...r,stage:'refreshed'},true);
      else if(r.stage==='refreshed')recoveryNavigate({...r,stage:'entering'});
      else waitForRecovery(r,'重新进入章节失败');
      return true;
    }
    if(r.stage==='entering'||r.stage==='monitoring'){
      if(courseId()!==r.courseId||chapterId()!==new URL(r.studyUrl).searchParams.get('chapterId')){clearRecovery();return false;}
      GM_setValue(RECOVERY,{...r,stage:'monitoring',at:Date.now(),healthySince:Date.now()});
      await start();return true;
    }
    waitForRecovery(r,'返回课程失败');return true;
  }
  async function recoveryTick(){
    try{if(await bankScanTick())return;}catch(e){stopBankScan('顺序收集已停止：'+redact(e.message));return;}
    if(await authTick())return;
    try{collectBank();}catch(e){log('正确答案收集失败：'+redact(e.message));}
    if(S.lockWait){const l=GM_getValue(LOCK,null);if(!l||l.owner===owner||Date.now()-l.at>=90000){const w=S.lockWait;await start(w.single,w.replaceAnswers,w.resuming);}return;}
    if(await continuityTick())return;
    let r=readRecovery();
    if(S.recoveryLeaving){if(r&&Date.now()-r.at>30000)waitForRecovery(r,'恢复页面未跳转');return;}
    if(r?.stage==='waiting'){
      if(!cfg.recover){pause('异常恢复已关闭');return;}
      showRecoveryWait();
      if(Date.now()>=r.retryAt){
        if(r.attempts>=recoverySettings().limit){pause('已达到异常恢复次数上限');return;}
        status('正在返回课程并刷新');
        const next={...r,attempts:r.attempts+1,stage:'course',at:Date.now()};
        if(overviewPage){GM_setValue(RECOVERY,next);await recoveryBoot();}else recoveryNavigate(next);
      }
      return;
    }
    if(!S.started||overviewPage)return;
    if(S.waitReader){await waitReader();return;}
    if(!ownsLease()){pause('控制权已转移到其他页面');return;}
    rememberSession();
    const error=pageError();
    if(error){if(error.kind==='manual')pause(`需要手动处理：${error.message}`);else recoverPage(error.message);return;}
    rememberReturn();
    if(r?.stage==='monitoring'&&Date.now()-r.healthySince>60000&&!S.pending&&$('#mainid')&&cardDoc()?.body&&(!S.videoWatch||Date.now()-(S.lastVideoProgress||0)<5000))clearRecovery();
    await tick();
  }
