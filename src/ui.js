  const artwork='__BAKA_ARTWORK__';
  const icon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" aria-hidden="true"><defs><clipPath id="baka-round"><circle cx="64" cy="64" r="57"/></clipPath><linearGradient id="baka-rim" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".5" stop-color="#a5daf2"/><stop offset="1" stop-color="#668ec8"/></linearGradient></defs><circle cx="64" cy="64" r="63" fill="url(#baka-rim)"/><g clip-path="url(#baka-round)"><image href="${artwork}" x="-18" y="-13" width="160" height="240"/></g><circle cx="64" cy="64" r="57" fill="none" stroke="#ffffffc9" stroke-width="2"/><path d="m104 90 7 8-6 11-10-7Z" fill="#dff7ff" stroke="#fff"/><path d="m104 90 1 19m-10-7 16-4" stroke="#84b8dd" stroke-width="1"/><circle cx="27" cy="15" r="3" fill="#fff"/></svg>`;
  function mount(){
    if(ui.host||!document.body)return;
    const host=document.createElement('div');host.id='cirno-helper-root';
    host.style.cssText='position:fixed;inset:0;z-index:2147483647;pointer-events:none;color-scheme:light;';
    const root=host.attachShadow({mode:'closed'});ui.host=host;ui.root=root;
    root.innerHTML=`<style>
      :host{all:initial}*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{opacity:.5;cursor:wait}
      .ball{position:absolute;width:66px;height:66px;padding:0;border:0;border-radius:50%;background:transparent;filter:drop-shadow(0 4px 9px #1d6d9e44);pointer-events:auto;touch-action:none;user-select:none;transition:filter .2s;cursor:grab}
      .ball:hover{filter:drop-shadow(0 5px 13px #1d6d9e88)}.ball:active{cursor:grabbing}.ball svg{width:100%;height:100%;pointer-events:none}
      .panel{position:absolute;width:min(350px,calc(100vw - 24px));max-height:min(640px,calc(100vh - 95px));overflow:auto;pointer-events:auto;background:#f8fcff;border:1px solid #bfdfef;border-radius:20px;box-shadow:0 12px 40px #234a7033;color:#24465f;font:13px/1.5 "Segoe UI","Microsoft YaHei",sans-serif;padding:17px;scrollbar-width:thin}
      .panel{height:min(680px,calc(100vh - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden}.panel>[data-pane]{min-height:0;overflow:auto;flex:1;padding-right:4px;scrollbar-width:thin}.panel>header,.panel>.status,.panel>.row,.panel>nav,.panel>.foot{flex-shrink:0}.status{overflow-wrap:anywhere;max-height:90px;overflow:auto}.capturePreview{width:100%;height:auto;border:1px solid #d7e7f0;border-radius:8px;margin-bottom:10px}.visionHint{color:#477894;font-size:12px;margin:6px 0}.ball:focus-visible{outline:3px solid #328dca;outline-offset:4px}button:focus-visible{outline:2px solid #328dca;outline-offset:2px}
      .pendingItems,.report{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.6 inherit}.panel>.btn{flex-shrink:0}
      [hidden]{display:none!important}.header{display:flex;justify-content:space-between;align-items:center}.title{font-size:18px;font-weight:700;letter-spacing:.5px}.tag{font-size:10px;background:#dcf2ff;color:#2e83b7;padding:3px 7px;border-radius:20px;margin-left:7px}.close{border:0;background:transparent;color:#6a8496;font-size:22px;padding:0 4px}
      .status{margin:12px 0;padding:10px 12px;background:#eaf5fc;border-radius:11px;min-height:41px;color:#306b8d}.row{display:flex;gap:8px;margin:8px 0}.row>*{flex:1}.btn{border:1px solid #c5deec;background:white;color:#326788;padding:8px 10px;border-radius:10px}.primary{background:#338fc8;color:white;border-color:#338fc8}.tabs{display:flex;border-bottom:1px solid #d7e7f0;margin:14px 0 12px;gap:16px}.tabs button{border:0;border-bottom:2px solid transparent;background:none;color:#7b8f9f;padding:6px 0;font-size:13px}.tabs button.active{color:#2678ad;border-color:#3897cf}.field{display:block;margin:10px 0}.field>span{display:block;color:#6a8091;font-size:12px;margin-bottom:4px}.field input,.field select{width:100%;background:#fff;border:1px solid #c7dfea;border-radius:9px;padding:8px;color:#24465f;outline:none;min-width:0}.field input:focus,.field select:focus{border-color:#56a8d6}.switch{display:flex;justify-content:space-between;align-items:center;padding:7px 1px;gap:12px}.switch input{accent-color:#3996ca;width:16px;height:16px}.sub{color:#778d9f;font-size:11px}.report{white-space:pre-wrap;font:12px/1.6 inherit;max-height:260px;overflow:auto}.divider{border:0;border-top:1px solid #dfebf2;margin:12px 0}.foot{font-size:10px;letter-spacing:.5px;color:#9baeb9;margin-top:12px}.endpoint{font-size:11px;overflow-wrap:anywhere;color:#7b94a4}.advanced{margin:10px 0}summary{cursor:pointer;color:#4b809e}

      .ball{z-index:3;width:66px;height:66px;transition:filter .22s ease,transform .22s cubic-bezier(.2,.8,.2,1);-webkit-tap-highlight-color:transparent}
      .ball:hover{transform:translateY(-2px) scale(1.035)}.ball:active,.ball.dragging{transform:scale(.97)}.ball[aria-expanded="true"]{filter:drop-shadow(0 5px 12px #26548966)}
      .panel{z-index:2;width:360px;height:700px;padding:16px;border:1px solid #ffffffe6;border-radius:24px;background:linear-gradient(180deg,#eef8ff55,#eff8ffc9 45%,#f6fbffe6),url('${artwork}') center/cover;box-shadow:0 18px 60px #16365438,0 2px 8px #16365418;backdrop-filter:blur(18px) saturate(120%);-webkit-backdrop-filter:blur(18px) saturate(120%);transition:left .2s ease,top .2s ease;isolation:isolate;color:#23445e}
      .panel.dragging{transition:none}.panel.compact{overflow:auto}.panel.compact>[data-pane]{flex:none;overflow:visible}.panel.compact .header{min-height:84px}
      .header{min-height:154px;align-items:flex-start;padding:14px;margin:-16px -16px 0;border-radius:23px 23px 14px 14px;background:linear-gradient(90deg,#e9f5ffb0,transparent 60%),url('${artwork}') center 28%/100% auto;position:relative;flex-shrink:0}
      .header>div{background:#f8fcffc7;backdrop-filter:blur(12px);border:1px solid #ffffffc9;border-radius:12px;padding:7px 10px}.title{font-size:17px;letter-spacing:0}.tag{background:#ffffffb8;color:#4277a0;font-weight:600}.close{width:30px;height:30px;border-radius:50%;background:#f8fcffcc;color:#355a75;display:grid;place-items:center;transition:background .18s,transform .18s}.close:hover{background:white;transform:rotate(90deg)}
      .status{background:#f4faffc9;border:1px solid #ffffffbd;backdrop-filter:blur(14px);font-size:12px;min-height:38px;margin:10px 0}.btn{border-color:#b8d2e5a6;background:#f8fcffbd;backdrop-filter:blur(10px);color:#295470;transition:background .18s,border-color .18s,transform .18s,box-shadow .18s}.btn:hover{background:#fff;border-color:#8bb8d7;box-shadow:0 3px 12px #22558112}.btn:active{transform:scale(.98)}.primary{background:#357faf;color:white;border-color:#357faf}.primary:hover{background:#2b709d;border-color:#2b709d}.row{margin:7px 0;gap:8px}.tabs{margin:10px 0 8px;border-color:#abcadd7d}.tabs button{color:#52738d;transition:color .18s,border-color .18s}.tabs button.active{color:#21638f}
      .panel>[data-pane]{border-radius:14px;padding:10px 12px;background:#f7fcffbd;border:1px solid #ffffffad;backdrop-filter:blur(16px);overscroll-behavior:contain;scrollbar-color:#8fafc4 transparent}.field input,.field select{background:#ffffffbf;border-color:#bed6e5;color:#23445e}.field>span,.sub,.visionHint{color:#536f86}.foot{color:#41637e;margin-top:9px;font-size:10px;letter-spacing:1px}.switch{padding:8px 0}.switch input{accent-color:#3980b0}.report{max-height:none}.ball:focus-visible{outline:3px solid #5f9ecb;outline-offset:4px}
      @media(prefers-reduced-motion:reduce){.ball,.panel,.btn,.close,.tabs button{transition:none!important;animation:none!important}}
    </style><button class="ball" aria-label="打开Baka助手" aria-expanded="false">${icon}</button>
    <section class="panel" hidden><header class="header"><div><span class="title">Baka助手</span><span class="tag">0.9</span></div><button class="close" aria-label="收起">×</button></header>
    <div class="status" role="status">准备就绪</div><div class="row"><button class="btn primary start">开始</button><button class="btn locate">定位未完成</button></div><button class="btn autoStart">全自动开始</button>
    <nav class="tabs"><button data-tab="tasks" class="active">学习</button><button data-tab="ai">AI 设置</button><button data-tab="answers">答案</button></nav>
    <div data-pane="tasks"><label class="switch">全自动模式<input type="checkbox" data-setting="fullAuto"></label><div class="sub">视频 → 习题 → 提交 → 下一节</div><label class="switch">视频续播<input type="checkbox" data-setting="video"></label><label class="switch">自动阅读<input type="checkbox" data-setting="reading"></label><label class="switch">AI 填写习题<input type="checkbox" data-setting="homework"></label><label class="switch">自动提交习题<input type="checkbox" data-setting="autoSubmit"></label><label class="switch">静音<input type="checkbox" data-setting="muted"></label>
    <label class="field"><span>视频弹题</span><select data-setting="popup"><option value="trial">有限次试答</option><option value="ai">AI 回答</option><option value="off">手动回答</option></select></label><label class="switch">自动提交视频弹题<input type="checkbox" data-setting="popupSubmit"></label>
    <label class="field"><span>每页阅读停留（秒）</span><input type="number" min="3" max="3600" data-setting="readSeconds"></label><label class="field"><span>阅读滚动速度（像素/秒）</span><input type="number" min="10" max="1200" data-setting="readSpeed"></label><label class="field"><span>无进展保底等待（秒）</span><input type="number" min="60" max="1800" data-setting="stallSeconds"></label>
    <details class="advanced"><summary>异常恢复</summary><label class="switch">返回课程并刷新重试<input type="checkbox" data-setting="recover"></label><label class="field"><span>再次失败后等待（分钟）</span><input type="number" min="1" max="120" data-setting="recoveryMinutes"></label><label class="field"><span>连续恢复次数上限</span><input type="number" min="1" max="10" data-setting="recoveryLimit"></label></details>
    <div class="row"><button class="btn solve">填写当前页</button><button class="btn read">阅读当前页</button></div><div class="row"><button class="btn redo">重新填写本页</button></div><div class="row"><button class="btn skip">跳过本页</button><button class="btn preview">预览题目截图</button></div></div>
    <div data-pane="ai" hidden><label class="field"><span>服务商</span><select class="provider"></select></label><label class="field"><span>API Key</span><input type="password" class="apikey" placeholder="输入密钥" autocomplete="off" spellcheck="false"></label><button class="btn check">检测连接 / 读取模型</button>
    <label class="field"><span>选择模型</span><select class="modelSelect"></select></label><label class="field"><span>模型 ID（可手动填写）</span><input class="model" spellcheck="false"></label><div class="visionHint"></div>
    <label class="field"><span>题目读取方式</span><select data-setting="capture"><option value="auto">自动：乱码或图片题使用截图</option><option value="image">始终截图</option></select></label>
    <div class="thinkingRow"><label class="switch">启用 DeepSeek 思考<input type="checkbox" class="thinking"></label><label class="field"><span>思考强度</span><select class="effort"><option value="low">低</option><option value="high">高</option><option value="max">最高</option></select></label></div>
    <label class="field"><span>回答等待上限（秒）</span><input type="number" class="timeout" min="30" max="900" step="30"></label><div class="sub">实际思考时长由模型决定</div>
    <label class="field"><span>不确定答案复核次数</span><select data-setting="uncertainRetries"><option value="0">不复核</option><option value="1">复核 1 次</option><option value="2">复核 2 次</option></select></label>
    <details class="advanced"><summary>高级设置</summary><label class="field"><span>API 基础地址</span><input class="base" type="url" spellcheck="false"></label><label class="field"><span>接口格式</span><select class="kind"><option value="chat">OpenAI Chat Completions</option><option value="responses">OpenAI Responses</option><option value="gemini">Gemini</option><option value="claude">Claude Messages</option></select></label><label class="field"><span>识图能力</span><select class="vision"><option value="auto">按模型识别</option><option value="yes">确认此模型支持识图</option><option value="no">仅支持文字</option></select></label></details>
    <div class="row"><button class="btn primary save">保存设置</button><button class="btn testModel">测试回答（计费）</button></div><div class="endpoint"></div><div class="row"><button class="btn clearKey">清除密钥</button></div></div>
    <div data-pane="answers" hidden><div class="pendingCount"></div><pre class="pendingItems"></pre><img class="capturePreview" alt="本次识别的题目截图" hidden><pre class="report">暂无答案</pre></div><div class="foot">BAKA · 0.9</div></section>`;
    ui.ball=$('.ball',root);ui.panel=$('.panel',root);ui.status=$('.status',root);ui.start=$('.start',root);ui.report=$('.report',root);
    const position=GM_getValue('cirno.position.v5',{x:innerWidth-88,y:innerHeight-88});
    let point={x:Number(position?.x)||innerWidth-88,y:Number(position?.y)||innerHeight-88},drag=null,suppressClick=false,opened=false,animation=null;
    const reduceMotion=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    function place(){
      const gap=14,size=66,margin=10,vw=innerWidth,vh=innerHeight;
      point.x=Math.min(Math.max(margin,point.x),Math.max(margin,vw-size-margin));point.y=Math.min(Math.max(margin,point.y),Math.max(margin,vh-size-margin));
      ui.ball.style.left=point.x+'px';ui.ball.style.top=point.y+'px';
      let width=Math.min(360,vw-24),height=Math.min(700,vh-24),left,top;
      if(point.x>=width+gap+12){left=point.x-width-gap;top=Math.max(12,Math.min(vh-height-12,point.y+size-height));}
      else if(vw-point.x-size>=width+gap+12){left=point.x+size+gap;top=Math.max(12,Math.min(vh-height-12,point.y+size-height));}
      else{
        const above=point.y-gap-12,below=vh-point.y-size-gap-12;
        const upward=above>=below;height=Math.max(40,Math.min(height,upward?above:below));
        top=upward?point.y-gap-height:point.y+size+gap;left=Math.max(12,Math.min(vw-width-12,point.x+size-width));
      }
      Object.assign(ui.panel.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px',transformOrigin:(point.x+size/2-left)+'px '+(point.y+size/2-top)+'px'});
      ui.panel.classList.toggle('compact',height<480);
    }
    function show(open=!opened){
      if(open===opened)return;opened=open;ui.ball.setAttribute('aria-expanded',String(open));ui.ball.setAttribute('aria-label',open?'收起Baka助手':'打开Baka助手');
      const wasHidden=ui.panel.hidden,style=wasHidden?null:getComputedStyle(ui.panel),opacity=style?.opacity||'1',transform=style?.transform||'none';
      if(animation){animation.onfinish=null;animation.cancel();animation=null;}
      if(open){ui.panel.hidden=false;ui.panel.inert=false;place();}else ui.panel.inert=true;
      if(reduceMotion()||!ui.panel.animate){ui.panel.hidden=!open;return;}
      animation=ui.panel.animate(open?[{opacity:wasHidden?0:opacity,transform:wasHidden?'translateY(8px) scale(.95)':transform},{opacity:1,transform:'none'}]:[{opacity,transform},{opacity:0,transform:'translateY(6px) scale(.96)'}],{duration:open?260:170,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
      const current=animation;current.onfinish=()=>{if(animation!==current)return;if(!opened)ui.panel.hidden=true;current.cancel();animation=null;};
    }
    function move(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;if(drag.moved){ui.ball.classList.add('dragging');ui.panel.classList.add('dragging');point={x:drag.start.x+dx,y:drag.start.y+dy};place();}}
    function finishDrag(e,cancelled=false){if(!drag||e.pointerId!==drag.id)return;if(!cancelled)move(e);suppressClick=drag.moved;const id=drag.id;drag=null;ui.ball.classList.remove('dragging');ui.panel.classList.remove('dragging');try{ui.ball.releasePointerCapture?.(id);}catch{}GM_setValue('cirno.position.v5',{...point});}
    ui.ball.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();suppressClick=false;drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...point},moved:false};try{ui.ball.setPointerCapture?.(e.pointerId);}catch{}});
    ui.ball.addEventListener('dragstart',e=>e.preventDefault());
    document.addEventListener('pointermove',move,true);document.addEventListener('pointerup',e=>finishDrag(e),true);document.addEventListener('pointercancel',e=>finishDrag(e,true),true);
    window.addEventListener('blur',()=>{if(drag)finishDrag({pointerId:drag.id},true);});
    ui.ball.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){suppressClick=false;return;}suppressClick=false;show();});
    $('.close',root).onclick=()=>{show(false);ui.ball.focus();};window.addEventListener('resize',place);
    document.addEventListener('pointerdown',e=>{if(opened&&!drag&&!e.composedPath().includes(host))show(false);},true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){show(false);ui.ball.focus();}},true);
    ui.cancelRecovery=document.createElement('button');ui.cancelRecovery.className='btn';ui.cancelRecovery.textContent='取消等待重试';ui.cancelRecovery.hidden=true;ui.cancelRecovery.onclick=()=>pause('已取消异常恢复');ui.status.after(ui.cancelRecovery);
    ui.start.onclick=()=>S.started?pause():void start();
    ui.takeover=document.createElement('button');ui.takeover.className='btn';ui.takeover.textContent='在本页继续（停止其他页）';ui.takeover.hidden=true;ui.takeover.onclick=async()=>{if(await acquire(true))await start();};ui.status.after(ui.takeover);
    $('.autoStart',root).onclick=()=>void startAuto();
    ui.updatePending=()=>{const items=GM_getValue('cirno.pending.v5',[]);$('.pendingCount',root).textContent=items.length?`待处理 ${items.length} 题`:'';$('.pendingItems',root).textContent=items.map(x=>`${x.title}\n章节 ${x.chapter} · ${x.reason}`).join('\n\n');};ui.updatePending();
    $('.locate',root).onclick=async()=>{if(readerPage){status('当前为专题阅读页');return;}if(!S.started)await start();if(S.started)firstUnfinished();};
    $('.solve',root).onclick=()=>void start(true);
    $('.redo',root).onclick=()=>{pause();S.answers.clear();void start(true,true);};
    $('.skip',root).onclick=async()=>{pause();if(await acquire()){S.started=true;sessionStorage.setItem(RUN,'1');S.pending=null;S.single=false;advance();}};
    ui.previewImage=(image,open=true)=>{const img=$('.capturePreview',root);img.src=image;img.hidden=false;if(open)ui.showTab('answers');};
    $('.preview',root).onclick=async()=>{try{const qs=documents(cardDoc()||document).flatMap(d=>questionRoots(d)).map(r=>parseQuestion(r));const q=qs.find(q=>!filled(q))||qs[0];if(!q)throw Error('当前页未识别到题目');const key=pageKey();status('正在生成题目截图');const image=await captureQuestion(q);if(key!==pageKey())throw Error('页面已切换');ui.previewImage(image);status('截图已生成，尚未发送');}catch(e){status(e.message);}};
    $('.read',root).onclick=async()=>{cfg.reading=true;save();const check=$('[data-setting="reading"]',root);check.checked=true;await start();};
    mountBank(root);
    ui.showTab=name=>{$$('.tabs button',root).forEach(b=>b.classList.toggle('active',b.dataset.tab===name));$$('[data-pane]',root).forEach(p=>{p.hidden=p.dataset.pane!==name;if(!p.hidden&&!reduceMotion())p.animate?.([{opacity:.3,transform:"translateY(4px)"},{opacity:1,transform:"none"}],{duration:180,easing:"ease-out"});});show(true);};
    for(const button of $$('.tabs button',root))button.onclick=()=>ui.showTab(button.dataset.tab);
    ui.syncSettings=()=>{for(const field of $$('[data-setting]',root)){const value=cfg[field.dataset.setting];if(field.type==='checkbox')field.checked=value;else field.value=value;}};
    for(const field of $$('[data-setting]',root)){
      const name=field.dataset.setting;if(field.type==='checkbox')field.checked=cfg[name];else field.value=cfg[name];
      field.onchange=()=>{
        if(name==='fullAuto'){if(S.started)pause();setFullAuto(field.checked);return;}
        if(field.type==='checkbox')cfg[name]=field.checked;
        else if(name==='readSeconds'){cfg[name]=Math.min(3600,Math.max(3,Number(field.value)||15));field.value=cfg[name];}
        else if(name==='readSpeed'){cfg[name]=Math.min(1200,Math.max(10,Number(field.value)||80));field.value=cfg[name];}
        else if(name==='stallSeconds'){cfg[name]=Math.min(1800,Math.max(60,Number(field.value)||300));field.value=cfg[name];}
        else if(name==='recoveryMinutes'){cfg[name]=Math.min(120,Math.max(1,Number(field.value)||10));field.value=cfg[name];}
        else if(name==='recoveryLimit'){cfg[name]=Math.min(10,Math.max(1,Number(field.value)||3));field.value=cfg[name];}
        else cfg[name]=field.value;
        if(name==='recover'&&!cfg.recover&&(readRecovery()||readFlow()||S.autoHold))pause('异常恢复已关闭');
        if(cfg.fullAuto&&((['video','homework','autoSubmit','popupSubmit'].includes(name)&&!cfg[name])||(name==='popup'&&cfg[name]!=='ai')))setFullAuto(false);
        save();S.epoch++;if(name==='autoSubmit'&&!cfg[name]&&S.submit)pause('自动提交已关闭');
      };
    }
    const provider=$('.provider',root),apiKey=$('.apikey',root),model=$('.model',root),modelSelect=$('.modelSelect',root),base=$('.base',root),kind=$('.kind',root),vision=$('.vision',root),thinking=$('.thinking',root),effort=$('.effort',root),timeout=$('.timeout',root);
    for(const [id,p] of Object.entries(providers)){const o=document.createElement('option');o.value=id;o.textContent=p.name;provider.append(o);}
    function hint(){try{const p={...profile(),base:base.value,model:model.value,visionMode:vision.value};$('.visionHint',root).textContent=supportsVision(p)?'可用于截图识题':'截图题请选支持识图的模型；DeepSeek 请选择 deepseek-flash';}catch{$('.visionHint',root).textContent='请填写模型和接口地址';}}
    function populateModels(ids=cfg.modelLists?.[cfg.provider]||[providers[cfg.provider].model]){modelSelect.replaceChildren();for(const id of [...new Set([model.value,...ids].filter(Boolean))]){const o=document.createElement('option');o.value=id;o.textContent=id;modelSelect.append(o);}const manual=document.createElement('option');manual.value='__manual__';manual.textContent='手动输入模型 ID';modelSelect.append(manual);modelSelect.value=model.value||'__manual__';}
    function showProfile(){const p=profile();provider.value=cfg.provider;apiKey.value=p.key||'';model.value=p.model;base.value=p.base;kind.value=p.kind;vision.value=p.visionMode;thinking.checked=p.thinking;effort.value=p.effort;effort.disabled=!p.thinking;timeout.value=p.timeoutSeconds;$('.thinkingRow',root).hidden=cfg.provider!=='deepseek';$('.endpoint',root).textContent=p.base;populateModels();hint();}
    function storeProfile(quiet=false){const p={...profile(),key:apiKey.value.trim(),base:base.value.trim().replace(/\/+$/,''),model:model.value.trim(),kind:kind.value,visionMode:vision.value,thinking:thinking.checked,effort:effort.value,timeoutSeconds:Math.min(900,Math.max(30,Number(timeout.value)||180))};timeout.value=p.timeoutSeconds;
      endpoint(p,'/');if(S.started)pause('设置已更新，请重新开始');cfg.profiles[cfg.provider]=p;save();S.epoch++;$('.endpoint',root).textContent=p.base;hint();if(!quiet)status('AI 设置已保存');return p;}
    provider.onchange=()=>{const next=provider.value;try{storeProfile(true);}catch{}cfg.provider=next;save();showProfile();};
    modelSelect.onchange=()=>{if(modelSelect.value==='__manual__'){model.focus();model.select();return;}model.value=modelSelect.value;vision.value='auto';storeProfile();};
    model.onchange=()=>{vision.value='auto';try{storeProfile();populateModels();}catch(e){status(e.message);}};
    vision.onchange=()=>{try{storeProfile();}catch(e){status(e.message);}};
    for(const control of [thinking,effort,timeout])control.onchange=()=>{effort.disabled=!thinking.checked;try{storeProfile();}catch(e){status(e.message);}};
    base.onchange=()=>{if(base.value.trim().replace(/\/+$/,'')!==profile().base){apiKey.value='';status('地址已更改，请重新填写对应密钥');}};
    $('.save',root).onclick=()=>{try{storeProfile();}catch(e){status(e.message);}};
    async function refresh(button){button.disabled=true;try{storeProfile();const providerId=cfg.provider,ids=await models();if(providerId!==cfg.provider)return;cfg.modelLists||={};cfg.modelLists[providerId]=ids;save();populateModels(ids);status(`密钥有效 · 读取 ${ids.length} 个模型，尚未测试回答`);}catch(e){status(e.message);}finally{button.disabled=false;}}
    $('.check',root).onclick=e=>void refresh(e.currentTarget);
    $('.testModel',root).onclick=async e=>{const button=e.currentTarget;button.disabled=true;try{const p=storeProfile();if(!p.key)throw Error('请填写 API Key');status('正在测试文字回答');const req=makeRequest(p,{question:'1+1等于几？',type:'single',options:[{label:'A',text:'1'},{label:'B',text:'2'}],blankCount:0});const response=await request(req.url,{method:'POST',...req,timeout:responseTimeout(p)}),a=decode(p,response);if(a.uncertain||!(a.choices.includes('B')||/^B$|^2$/.test(a.answer)))throw Error('模型返回了内容，但答案格式未通过测试');status('文字回答测试通过');log(`文字测试通过\n请求模型：${p.model}\n返回模型：${redact(response.model||response.modelVersion||p.model)}`);}catch(e){status(e.message);}finally{button.disabled=false;}};
    $('.clearKey',root).onclick=()=>{apiKey.value='';cfg.profiles[cfg.provider]={...profile(),key:''};save();S.epoch++;status('密钥已清除');};
    document.body.append(host);showProfile();place();status(S.status);
  }
  if(document.readyState==='loading')await new Promise(r=>document.addEventListener('DOMContentLoaded',r,{once:true}));
  window.addEventListener('pagehide',leavePage);window.addEventListener('pageshow',e=>void restorePage(e));
  if(loginOrigin()||landingPage){
    makeAuthRequest();if(loginOrigin())mountLogin();await authTick();setInterval(()=>void authTick(),1500);return;
  }
  if(overviewPage&&!readRecovery()&&!readFlow())return;
  mount();
  if(await authTick()){}
  else if(await flowBoot()){}
  else if(await recoveryBoot()){}
  else if(readerPage){
    const t=GM_getValue(TICKET,null),from=new URL(location.href).searchParams.get('_from_')?.split('_')[0];
    const saved=sessionStorage.getItem('cirno.readSession');
    if(t&&((t.state==='pending'&&(t.course===from||new URL(location.href).searchParams.get('cirnoReader')===t.id)&&Date.now()-t.at<120000)||(t.state==='active'&&t.reader===owner&&saved===t.id))){
      S.reading=t;sessionStorage.setItem('cirno.readSession',t.id);GM_setValue(TICKET,{...t,state:'active',reader:owner});await start();
    }else if(S.started)await start();
  }else if(S.started)await start();
  setInterval(()=>void recoveryTick(),1500);
})();
