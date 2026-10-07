  const AUTH_ACCOUNTS='baka.login.accounts.v1',AUTH_REQUEST='baka.login.resume.v1',CHECKPOINT=`baka.session.${owner}`;
  const loginOrigin=()=>location.protocol==='https:'&&['v8.chaoxing.com','passport2.chaoxing.com'].includes(location.hostname);
  const landingPage=location.hostname==='i.chaoxing.com'&&location.pathname==='/base';
  function loginForm(){
    if(!loginOrigin())return null;
    const password=$$('input[type="password"]').find(visible);if(!password)return null;
    const form=password.closest('form')||document.body;
    const account=$$('input[type="text"],input[type="tel"],input[type="email"],input:not([type])',form).find(e=>visible(e)&&!/captcha|valid|验证码/i.test(e.id+' '+e.name+' '+e.placeholder));
    const button=$$('#login,#loginBtn,button,input[type="button"],input[type="submit"],a[role="button"]',form).find(e=>visible(e)&&/^登\s*录$/.test(text(e)||e.value||''));
    if(!account||!button)return null;
    const action=new URL(form.getAttribute('action')||location.href,location.href);
    if(action.protocol!=='https:'||action.origin!==location.origin)return null;
    return {form,password,account,button};
  }
  function verificationPresent(){
    return documents().some(d=>$$('#captcha,#eject,.geetest_panel,.nc-container,[role="dialog"],.layui-layer-content',d).some(e=>visible(e)&&/请完成安全验证|向右拖动|拖动滑块|人机验证|请输入验证码|完成验证|安全验证/.test(text(e))));
  }
  function readAuth(){const r=GM_getValue(AUTH_REQUEST,null);return r&&Date.now()-r.at<86400000&&flowURL(r.url)?r:null;}
  function cancelAuthResume(all=false){
    GM_setValue(CHECKPOINT,null);const r=readAuth();if(r&&(all||r.owner===owner||r.targetOwner===owner))GM_setValue(AUTH_REQUEST,null);S.authHold=false;
  }
  function rememberSession(force=false){
    if(!S.started||S.single||(!force&&Date.now()-(S.checkpointAt||0)<5000))return;
    const u=new URL(location.href);if(!readerPage&&chapterId())u.searchParams.set('chapterId',chapterId());
    const url=flowURL(u.href);if(!url)return;
    S.checkpointAt=Date.now();GM_setValue(CHECKPOINT,{owner,url,course:courseId(),chapter:chapterId(),at:Date.now(),active:true,visits:[...S.visit],cards:[...S.cardDone],reading:S.reading||null,pendingSubmit:!!S.submit});
  }
  function makeAuthRequest(kind='login'){
    let r=readAuth();if(r&&(r.owner===owner||r.targetOwner===owner))return r;
    const c=GM_getValue(CHECKPOINT,null);if(!c?.active||Date.now()-c.at>86400000||!flowURL(c.url))return null;
    r={...c,id:crypto.randomUUID(),kind,state:'waiting',at:Date.now()};GM_setValue(AUTH_REQUEST,r);return r;
  }
  function authStatus(message){status(message);if(ui.authStatus)ui.authStatus.textContent=message;}
  function safeLoginURL(value){try{const u=new URL(value,location.href);return u.protocol==='https:'&&['v8.chaoxing.com','passport2.chaoxing.com'].includes(u.hostname)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
  function suspendForAuth(kind){
    rememberSession(true);const r=makeAuthRequest(kind);pause(kind==='verify'?'请手动完成验证，完成后继续':'登录已失效，等待重新登录',true);S.authHold=true;
    if(kind==='login'){
      const link=documents().flatMap(d=>$$('a[href],iframe[src]',d)).map(e=>e.href||e.src).find(safeLoginURL);
      if(link&&r){const url=safeLoginURL(link);GM_setValue(AUTH_REQUEST,{...r,loginOrigin:new URL(url).origin});recoveryIO.go(url);}
    }
  }
  function saveLoginAccount(){
    const f=loginForm();if(!f){authStatus('未识别到可保存的登录表单');return false;}
    const account=f.account.value.trim(),password=f.password.value;if(!account||!password){authStatus('先在网页登录框填写账号和密码');return false;}
    const all=GM_getValue(AUTH_ACCOUNTS,{});all[location.origin]={account,password,enabled:!!ui.autoLogin?.checked};GM_setValue(AUTH_ACCOUNTS,all);authStatus('已保存到本机，绑定当前登录站点');return true;
  }
  function clearLoginAccount(){const all=GM_getValue(AUTH_ACCOUNTS,{});delete all[location.origin];GM_setValue(AUTH_ACCOUNTS,all);if(ui.autoLogin)ui.autoLogin.checked=false;authStatus('已删除当前站点的登录信息');}
  function loginField(el,value){const setter=Object.getOwnPropertyDescriptor(el.ownerDocument.defaultView.HTMLInputElement.prototype,'value')?.set;if(setter)setter.call(el,value);else el.value=value;for(const type of ['input','change'])el.dispatchEvent(new Event(type,{bubbles:true}));}
  async function loginTick(manual=false){
    const f=loginForm();if(!f)return false;
    if(verificationPresent()){authStatus('等待你手动拖动滑块，验证完成后继续');return true;}
    const r=readAuth()||makeAuthRequest(),all=GM_getValue(AUTH_ACCOUNTS,{}),saved=all[location.origin];
    if(!saved?.enabled&&!manual){authStatus('可保存本页账号密码，并开启自动尝试登录');return true;}
    if(!saved?.account||!saved?.password){authStatus('先填写网页登录框，再保存账号密码');return true;}
    const attemptKey=`baka.login.attempt.${location.origin}.${owner}`,last=GM_getValue(attemptKey,null),id=r?.id||'manual-session';
    if(manual&&last&&Date.now()-last.at<3000){authStatus('刚刚已尝试，请稍候查看结果');return true;}
    if(!manual&&last&&(last.id===id||Date.now()-last.at<120000)){authStatus('已尝试登录，请检查结果；不会重复点击');return true;}
    if($$('.error,.error-message,.tips,.tips_error,[role="alert"]').some(e=>visible(e)&&/密码.{0,8}(错误|不正确)|账号.{0,8}(错误|不存在|锁定)|频繁|次数过多/.test(text(e)))){authStatus('登录信息或频率异常，请手动检查');return true;}
    if($$('input[type="checkbox"]',f.form).some(e=>visible(e)&&!e.checked&&(e.required||/协议|条款/.test(text(e.parentElement))))){authStatus('请先自行确认登录条款');return true;}
    if(f.account.value.trim()&&f.account.value.trim()!==saved.account){authStatus('当前账号与保存账号不同，请重新保存或手动登录');return true;}
    if(f.password.value&&f.password.value!==saved.password){authStatus('当前密码已修改，请重新保存或手动登录');return true;}
    if(f.button.disabled){authStatus('登录按钮暂不可用');return true;}
    loginField(f.account,saved.account);loginField(f.password,saved.password);
    GM_setValue(attemptKey,{id,at:Date.now()});if(r)GM_setValue(AUTH_REQUEST,{...r,loginOrigin:location.origin});
    f.button.click();authStatus('已尝试登录，遇到验证请手动完成');return true;
  }
  async function resumeAuthenticated(r){
    if(r.targetOwner&&r.targetOwner!==owner)return false;
    const target=new URL(r.url),here=new URL(location.href);
    const same=readerPage?here.pathname===target.pathname&&readIdentity()===`${target.searchParams.get('courseId')||''}/${target.searchParams.get('knowledgeId')||''}`:courseId()===r.course&&chapterId()===r.chapter;
    if(!same||(!readerPage&&!$('#mainid'))||verificationPresent()||pageError())return false;
    GM_setValue(AUTH_REQUEST,null);S.authHold=false;S.visit=new Set(r.visits||[]);S.cardDone=new Set(r.cards||[]);
    if(r.reading){S.reading=r.reading;GM_setValue(TICKET,{...r.reading,state:'active',reader:owner,at:Date.now()});}
    await start(false,false,true);
    if(r.pendingSubmit)S.autoHold={key:pageKey(),at:Date.now(),reason:'重新登录后核对提交结果',submission:true};
    return true;
  }
  async function authTick(){
    if(loginForm())return loginTick();
    const r=readAuth();
    if(loginOrigin()||landingPage){
      if(r&&(!r.loginOrigin||r.loginOrigin===location.origin||landingPage)&&!verificationPresent()&&/退出登录|退出|个人中心|个人空间|我的课程/.test(text(document.body))&&!$('input[type="password"]')){
        if(r.state!=='entering'||r.targetOwner!==owner){GM_setValue(AUTH_REQUEST,{...r,state:'entering',targetOwner:owner});authStatus('登录成功，返回原章节');recoveryIO.go(r.url);}
      }return true;
    }
    if(S.started&&verificationPresent()){suspendForAuth('verify');return true;}
    const error=pageError();
    if(S.started&&error?.kind==='manual'&&/登录|登陆/.test(error.message)){suspendForAuth('login');return true;}
    if(r&&(r.owner===owner||r.targetOwner===owner)){
      if(await resumeAuthenticated(r))return true;
      if(S.authHold||r.state==='waiting'){authStatus('等待登录或验证完成');return true;}
    }
    return false;
  }
  function mountLogin(){
    const host=document.createElement('div');host.id='baka-login-helper';host.style.cssText='position:fixed;right:18px;bottom:18px;z-index:2147483000;color-scheme:light';
    const root=host.attachShadow({mode:'closed'});root.innerHTML=`<style>:host{all:initial}section{font:13px/1.6 "Microsoft YaHei",sans-serif;color:#24465f;background:#f7fcfff2;border:1px solid #c5dfef;border-radius:16px;padding:18px;width:280px;box-shadow:0 10px 36px #16365433}header{font-size:17px;font-weight:bold}small{font-size:11px;color:#627f94}p{margin:10px 0}button{font:inherit;border:1px solid #bcd5e5;border-radius:8px;background:white;color:#326788;padding:8px;cursor:pointer;margin:4px 0;width:100%}label{display:flex;justify-content:space-between;margin:12px 0}.status{background:#eaf5fc;border-radius:8px;padding:8px}</style><section><header>Baka助手 <small>0.9</small></header><p class="status">登录辅助</p><label>自动尝试登录<input class="auto" type="checkbox"></label><button class="saveLogin">保存本页账号密码</button><button class="retryLogin">尝试登录一次</button><button class="clearLogin">删除保存的账号密码</button><button class="cancelLogin">取消章节恢复</button><small>先在网页填写账号密码。保存在本机油猴存储（未加密），仅用于当前登录站点。</small></section>`;
    ui.authStatus=$('.status',root);ui.autoLogin=$('.auto',root);ui.autoLogin.checked=!!GM_getValue(AUTH_ACCOUNTS,{})[location.origin]?.enabled;
    ui.autoLogin.onchange=()=>{const all=GM_getValue(AUTH_ACCOUNTS,{}),p=all[location.origin];if(p){p.enabled=ui.autoLogin.checked;GM_setValue(AUTH_ACCOUNTS,all);}authStatus(ui.autoLogin.checked?'已开启，请先保存登录信息':'自动登录已关闭');};
    $('.saveLogin',root).onclick=saveLoginAccount;$('.clearLogin',root).onclick=clearLoginAccount;$('.retryLogin',root).onclick=()=>void loginTick(true);$('.cancelLogin',root).onclick=()=>{cancelAuthResume(true);authStatus('已取消章节恢复');};
    document.body.append(host);
  }
  function leavePage(){rememberSession(true);S.epoch++;S.started=false;S.busy=false;requestHandle?.abort?.();requestHandle=null;release();}
  async function restorePage(e){if(e.persisted&&activeHere()&&!overviewPage&&!loginOrigin()&&!landingPage){S.started=false;await start(false,false,true);}}
