(function(){
 const DATA_PATH=window.CONTINUITY_JOURNEY_DATA||'/data/continuity-journey.json';
 function track(n,l){if(typeof window.gtag==='function'){window.gtag('event',n,{event_category:'Continuity Journey',event_label:l,value:1});}}
 function currentPath(){return window.location.pathname.split('/').pop()||'index.html';}
 function el(tag,cls){const e=document.createElement(tag); if(cls)e.className=cls; return e;}
 async function init(){
  try{
   const res=await fetch(DATA_PATH); if(!res.ok)throw new Error('data');
   const data=await res.json();
   const launcher=el('button','cj-launcher'); launcher.type='button'; launcher.setAttribute('aria-haspopup','dialog'); launcher.setAttribute('aria-expanded','false'); launcher.innerHTML='<span class="cj-launcher-icon" aria-hidden="true"></span><span>'+data.label+'</span>';
   const backdrop=el('div','cj-backdrop');
   const panel=el('aside','cj-panel'); panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label',data.title);
   panel.innerHTML='<div class="cj-header"><div class="cj-title-row"><div><h2 class="cj-title">'+data.title+'</h2><p class="cj-intro">'+data.intro+'</p><p class="cj-hint"> <i class="bi bi-arrow-right-circle me-2"></i>Select a step to explore the journey and discover the next step.</p></div><button class="cj-close" type="button" aria-label="Close continuity journey">&times;</button></div></div><div class="cj-body"></div>';
   document.body.appendChild(launcher); document.body.appendChild(backdrop); document.body.appendChild(panel);
   const body=panel.querySelector('.cj-body'); const page=currentPath();
   data.steps.forEach(step=>{
    const cur=Array.isArray(step.matches)&&step.matches.includes(page);
    const item=el('section','cj-step'+(cur?' current open':'')); item.dataset.step=step.id;
    item.innerHTML='<button class="cj-step-toggle" type="button" aria-expanded="'+(cur?'true':'false')+'"><span class="cj-step-number">'+step.id+'</span><span><span class="cj-step-heading">'+step.title+'</span><span class="cj-step-microcopy">'+step.microcopy+'</span></span></button><div class="cj-step-detail"><p>'+step.overlay+'</p><a class="cj-step-link" href="'+step.url+'">'+step.cta+'</a></div>';
    const toggle=item.querySelector('.cj-step-toggle'); const link=item.querySelector('.cj-step-link');
    toggle.addEventListener('click',()=>{const open=item.classList.toggle('open'); toggle.setAttribute('aria-expanded',String(open)); track('continuity_journey_step_open',step.title);});
    link.addEventListener('click',()=>track('continuity_journey_cta_click',step.title+' → '+step.cta));
    body.appendChild(item);
   });
   function open(){launcher.setAttribute('aria-expanded','true');backdrop.classList.add('open');panel.classList.add('open');track('continuity_journey_open',page);}
   function close(){launcher.setAttribute('aria-expanded','false');backdrop.classList.remove('open');panel.classList.remove('open');track('continuity_journey_close',page);}
   launcher.addEventListener('click',open); backdrop.addEventListener('click',close); panel.querySelector('.cj-close').addEventListener('click',close);
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&panel.classList.contains('open'))close();});
  }catch(e){console.error('Continuity journey failed to initialise:',e);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();