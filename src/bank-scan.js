  const SCAN=`baka.bankScan.v1.${owner}`;
  let scanEpoch=0;
  function saveBankScan(){const s=S.bankScan;if(!s)return;const {course,ids,index,doneCards,pages,added,skipped,active}=s;GM_setValue(SCAN,{course,ids,index,doneCards,pages,added,skipped,active,at:Date.now()});ui.updateScan?.();}
  function stopBankScan(message='顺序收集已停止'){
    scanEpoch++;if(!S.bankScan?.active)return;S.bankScan.active=false;saveBankScan();release();status(message);
  }
  function restoreBankScan(){
    const saved=GM_getValue(SCAN,null);if(saved&&saved.course===courseId()&&Array.isArray(saved.ids)&&saved.index<saved.ids.length){S.bankScan={...saved,active:false,phase:'chapter',at:Date.now()};saveBankScan();}
  }
  async function startBankScan(resume=false){
    if(readerPage||overviewPage||!catalogue().length){status('请在课程章节页启动顺序收集');return;}
    pause('准备顺序收集');const token=++scanEpoch;
    if(!await acquire())return;if(token!==scanEpoch){release();return;}
    const saved=resume?GM_getValue(SCAN,null):null;
    const reuse=saved&&saved.course===courseId()&&Array.isArray(saved.ids)&&saved.index<saved.ids.length;
    S.bankScan=reuse?{...saved}:{course:courseId(),ids:[...new Set(catalogue().map(x=>x.id))],index:0,doneCards:[],pages:0,added:0,skipped:0};
    Object.assign(S.bankScan,{active:true,phase:'chapter',at:Date.now(),waitDoc:null,signature:null});
    saveBankScan();status('顺序收集已开始');await bankScanTick();
  }
  function scanMove(el,phase){const s=S.bankScan;s.waitDoc=cardDoc();s.phase=phase;s.at=Date.now();s.signature=null;saveBankScan();el.click();}
  function scanNextChapter(skipped=false){const s=S.bankScan;if(skipped)s.skipped++;s.index++;s.doneCards=[];s.target=null;s.waitDoc=null;s.phase='chapter';s.at=Date.now();saveBankScan();}
  function scanDoneCard(skipped=false){const s=S.bankScan;if(skipped)s.skipped++;s.pages++;s.doneCards.push(s.target);s.target=null;s.waitDoc=null;s.phase='cards';s.at=Date.now();saveBankScan();}
  async function bankScanTick(){
    const s=S.bankScan;if(!s?.active)return false;
    if(courseId()!==s.course){stopBankScan('课程已切换，顺序收集已停止');return true;}
    if(!ownsLease()){stopBankScan('其他页面取得运行权，顺序收集已停止');return true;}
    renewLease();
    if(verificationPresent()||pageError()){stopBankScan('遇到登录、验证或页面异常；处理后可继续收集');return true;}
    if(s.index>=s.ids.length){stopBankScan(`顺序收集完成 · 检查 ${s.pages} 页 · 新增 ${s.added} 条 · 跳过 ${s.skipped} 项`);return true;}
    status(`顺序收集 ${s.index+1}/${s.ids.length} 节 · 新增 ${s.added} 条`);
    const target=s.ids[s.index],age=Date.now()-s.at;
    if(s.phase==='chapter'){
      if(chapterId()!==target){const item=catalogue().find(x=>x.id===target);if(!item){scanNextChapter(true);return true;}scanMove(item.el,'chapterWait');return true;}
      s.phase='cards';s.at=Date.now();return true;
    }
    if(s.phase==='chapterWait'){
      if(chapterId()===target&&cardDoc()&&cardDoc()!==s.waitDoc&&cardDoc().readyState==='complete'&&age>=1500){s.phase='cards';s.at=Date.now();s.waitDoc=null;}
      else if(age>30000)scanNextChapter(true);return true;
    }
    if(chapterId()!==target){stopBankScan('章节被手动切换；可点击继续收集');return true;}
    if(s.phase==='cards'){
      if(age<2000)return true;
      const cards=$$('[id^="dct"][cardid]').filter(el=>cardRank(el)===1),next=cards.find(el=>!s.doneCards.includes(el.id));
      if(!next){scanNextChapter();return true;}
      s.target=next.id;
      if(!next.classList.contains('active'))scanMove(next,'cardWait');else{s.phase='result';s.at=Date.now();s.signature=null;}
      return true;
    }
    if(s.phase==='cardWait'){
      if($('#'+s.target)?.classList.contains('active')&&cardDoc()&&cardDoc()!==s.waitDoc&&cardDoc().readyState==='complete'&&age>=1500){s.phase='result';s.at=Date.now();s.waitDoc=null;}
      else if(age>30000)scanDoneCard(true);return true;
    }
    if(s.phase==='result'){
      if(!$('#'+s.target)?.classList.contains('active')){stopBankScan('学习内容被切换；可点击继续收集');return true;}
      const docs=documents(cardDoc()),roots=docs.flatMap(d=>questionRoots(d));
      const signature=roots.map(r=>r.id+' '+text(r)).join('|');
      if(signature!==s.signature){s.signature=signature;s.stableAt=Date.now();}
      if(roots.length&&age>=3000&&Date.now()-s.stableAt>=1500){
        const added=collectBank(true);s.added+=added;
        const available=roots.some(r=>explicitCorrect(bankParseQuestion(r)));
        scanDoneCard(!available);return true;
      }
      if(age>20000)scanDoneCard(true);return true;
    }
    return true;
  }
  function mountBankScan(pane){
    const box=document.createElement('div');box.innerHTML='<hr class="divider"><div class="sub">独立收集：按目录顺序浏览章节测验，不做题、不提交</div><div class="row"><button class="btn scanStart">从第一节收集</button><button class="btn scanResume">继续收集</button></div><button class="btn scanStop">停止收集</button><div class="sub scanProgress"></div>';
    pane.prepend(box);
    $('.scanStart',box).onclick=()=>void startBankScan(false);$('.scanResume',box).onclick=()=>void startBankScan(true);$('.scanStop',box).onclick=()=>stopBankScan();
    ui.updateScan=()=>{const s=S.bankScan;$('.scanStart',box).disabled=!!s?.active;$('.scanResume',box).disabled=!!s?.active||!s||s.index>=s.ids.length;$('.scanStop',box).disabled=!s?.active;$('.scanProgress',box).textContent=s?`${s.active?'收集中':'已停止'} · ${Math.min(s.index+1,s.ids.length)}/${s.ids.length} 节 · ${s.pages} 页 · 新增 ${s.added} 条 · 跳过 ${s.skipped} 项`:'';};restoreBankScan();ui.updateScan();
  }
