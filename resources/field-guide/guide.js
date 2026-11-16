(() => {
  'use strict';
  const pages = window.LCGuideData || [];
  const chapters = window.LCGuideChapters || [];
  const byId = Object.fromEntries(pages.map(p => [p.id, p]));
  const main = document.getElementById('main-content');
  const menu = document.getElementById('site-drawer');
  const menuToggle = document.getElementById('menu-toggle');
  const dialog = document.getElementById('diagram-dialog');
  const live = document.getElementById('live-message');
  let lastDiagramTrigger = null;
  let zoom = 100;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arrow = '<svg class="link-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg>';
  const chapterLabel = page => page.chapter === null ? 'Applied example · Air-domain MRO' : page.chapter === 0 ? 'Prologue · Opening context' : `Chapter ${page.chapter} · Section ${page.section}`;
  const pageLink = page => `#/concept/${page.id}`;
  const groups = [
    {id:'understand',chapters:[1,2],title:'Understand',ref:'Chapters 1–2',text:'Recognise the conditions that make a lifecycle actionable.',href:'#/area/understand'},
    {id:'diagnose',chapters:[3],title:'Map gaps',ref:'Chapter 3',text:'Find where movement, evidence and responsibility separate.',href:'#/chapters/3'},
    {id:'value',chapters:[4],title:'Assess value',ref:'Chapter 4',text:'Distinguish useful protection from avoidable burden.',href:'#/chapters/4'},
    {id:'measure',chapters:[5],title:'Measure',ref:'Chapter 5',text:'Examine the gap, response and restoration of continuity.',href:'#/chapters/5'},
    {id:'embed',chapters:[10],title:'Embed',ref:'Chapter 10',text:'Make continuity part of ordinary management and learning.',href:'#/chapters/10'},
    {id:'prove',chapters:[8],title:'Prove',ref:'Chapter 8',text:'Establish what changed and whether the improvement holds.',href:'#/chapters/8'},
    {id:'respond',chapters:[7],title:'Redesign',ref:'Chapter 7',text:'Connect handoffs, authority and workable recovery.',href:'#/chapters/7'},
    {id:'plan',chapters:[6],title:'Test assumptions',ref:'Chapter 6',text:'Check that the conditions beneath the plan remain true.',href:'#/chapters/6'}
  ];
  const featuredIds = ['know-own-decide-recover','stock-present-unavailable','response-intervals','usable-recovery','evidence-before-scaling','mro-availability'];
  // The questions and map share labels and chapter membership. Keep existing filter URLs valid.
  const questionGroups = [
    ...groups.slice().sort((a,b)=>a.chapters[0]-b.chapters[0]),
    {id:'opening',title:'Opening context',chapters:[0]},
    {id:'sustain',title:'Net Zero',chapters:[9]},
    {id:'case',title:'MRO case',chapters:[null]}
  ];
  const filters = [['all','All questions'],...questionGroups.map(g=>[g.id,g.title])];
  function mapNode(g) {
    return `<a class="map-node" href="${g.href}"><span class="node-ref">${g.ref}<span class="node-open" aria-hidden="true">${arrow}</span></span><h3>${g.title}</h3><p>${g.text}</p></a>`;
  }
  function questionRow(p, i) {
    return `<a class="question-row" href="${pageLink(p)}"><span class="question-index">${String(i+1).padStart(2,'0')}</span><span><strong>${esc(p.question)}</strong><small>${esc(chapterLabel(p))}</small></span>${arrow}</a>`;
  }
  function breadcrumbs(items) {
    return `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/map">Guide map</a>${items.map(x => `<span aria-hidden="true">/</span>${x.href?`<a href="${x.href}">${esc(x.label)}</a>`:`<span aria-current="page">${esc(x.label)}</span>`}`).join('')}</nav>`;
  }
  function sidebar(currentPage, currentChapter) {
    const localPages = pages.filter(p=>p.chapter===currentChapter);
    return `<aside class="guide-sidebar" aria-label="Guide contents"><a class="sidebar-top-link" href="#/map"><span aria-hidden="true">←</span> Return to the map</a><div class="sidebar-label">Follow the book</div><nav class="chapter-nav" aria-label="Book chapters">${chapters.map(c => `<a href="#/chapters/${c.number}" class="${c.number===currentChapter?'active':''}"${c.number===currentChapter?' aria-current="page"':''}><span>${c.number===0?'P':String(c.number).padStart(2,'0')}</span>${esc(c.shortTitle || c.title)}</a>`).join('')}</nav>${localPages.length?`<div class="sidebar-label">${currentChapter===null?'Applied example':currentChapter===0?'In the Prologue':'In this chapter'}</div><nav class="sidebar-concepts" aria-label="Concepts in this chapter">${localPages.map(p=>`<a href="${pageLink(p)}" class="${p.id===currentPage?'active':''}"${p.id===currentPage?' aria-current="page"':''}>${esc(p.navTitle || p.title)}</a>`).join('')}</nav>`:''}<div class="sidebar-label">Explore the guide</div><nav class="sidebar-concepts" aria-label="Further navigation"><a href="#/questions">All operating questions</a><a href="#/concept/mro-availability">Air-domain MRO case</a><a href="#/search">Search concepts and evidence</a></nav></aside>`;
  }
  function shell(content, currentPage=null, currentChapter=null) {
    return `<div class="page-shell">${sidebar(currentPage,currentChapter)}<article class="reader">${content}</article></div>`;
  }
  function relatedLinks(ids) {
    return `<div class="related-grid">${ids.filter(id=>byId[id]).map(id=>{const p=byId[id];return `<a class="related-link" href="${pageLink(p)}"><small>${esc(chapterLabel(p))}</small><strong>${esc(p.question)} ${arrow}</strong></a>`}).join('')}</div>`;
  }
  function renderHome() {
    document.title='Lifecycle Continuity Field Guide | Levine Naidoo';
    return `<section class="home-hero"><div class="container hero-grid"><div><p class="eyebrow">A visual companion to the book</p><h1>Lifecycle Continuity<span>Field Guide</span></h1><p class="hero-intro">Explore the concepts and examine the connections that keep an operating lifecycle knowable, owned, actionable and recoverable.</p><p class="hero-byline">By <strong>Levine Naidoo</strong></p></div><div class="start-panel"><span class="eyebrow">Start with an operating question</span><h2>Why is stock present but still unavailable?</h2><p>Follow the physical work, evidence and responsibility through the release boundary.</p><a class="text-link" href="#/concept/stock-present-unavailable">Explore this example ${arrow}</a></div></div></section>
    <div class="guide-scope-note"><div class="container"><span class="guide-scope-label">Explore the guide</span><span>46 book diagrams across the Prologue and ten chapters, with an applied MRO case.</span></div></div>
    <section class="map-section" aria-labelledby="management-map-title"><div class="container"><div class="section-top"><div><span class="eyebrow">The management map</span><h2 id="management-map-title">One connected management logic</h2><p>Choose the area that matches your question, or follow the book from understanding to application.</p></div><a class="text-link" href="#/chapters">Browse all chapters ${arrow}</a></div>
    <div class="management-map"><div class="map-row top">${groups.slice(0,4).map(mapNode).join('')}</div><div class="map-centre"><p>Know the state. <span>Own the next step.</span> Decide. Recover.</p></div><div class="map-row bottom">${groups.slice(4).reverse().map(mapNode).join('')}</div></div>
    <div class="map-bottom-note"><p>Learning connects the whole map. The areas inform one another, and you can revisit them as the operating situation changes.</p></div><a class="sustainability-link" href="#/chapters/9"><div><strong>Chapter 9 · Net Zero as a Performance Strategy</strong><span>Apply the same continuity logic to sustainability and lifecycle value.</span></div>${arrow}</a><p class="map-reference">Adapted from Figure 10.4, “How the chapters form one management logic”. <a href="#/concept/management-map">Read the diagram</a> or <a href="#/chapters/0">explore the opening context</a>.</p></div></section>
    <section class="question-band" aria-labelledby="questions-title"><div class="container"><div class="section-top"><div><span class="eyebrow">From concepts to practice</span><h2 id="questions-title">What are you trying to understand?</h2><p>Each concept connects an original diagram to an explanation, a practical check and the evidence to examine.</p></div><a class="text-link" href="#/questions">View all questions ${arrow}</a></div><div class="question-list">${featuredIds.map(id=>byId[id]).filter(Boolean).map(questionRow).join('')}</div></div></section>
    <section class="guide-note"><div class="container"><h2>A companion you can return to</h2><p>Use the map to understand how the concepts fit together, or begin with a problem in your own operation. Each page keeps its reference to the book so you can return to the fuller argument in <em>Lifecycle Continuity: The Missing Link in Supply Chain Performance</em>.</p></div></section>`;
  }
  function renderConcept(id) {
    const p=byId[id];
    if(!p) return renderNotFound();
    document.title=`${p.question} | Lifecycle Continuity Field Guide`;
    const i=pages.indexOf(p),prev=pages[i-1],next=pages[i+1];
    const crumb=p.chapter===null?[{label:'Operating questions',href:'#/questions'},{label:'Air-domain MRO'}]:p.chapter===0?[{label:'Prologue',href:'#/chapters/0'},{label:p.navTitle||p.title}]:[{label:`Chapter ${p.chapter}`,href:`#/chapters/${p.chapter}`},{label:`Section ${p.section}`}];
    const figureLabel=p.figure?`Figure ${p.figure}${p.id==='global-production-continuity'?' · Overview':p.id==='global-production-time'?' · Timing':''}`:'Illustrative case';
    const scopeNote=p.chapter===null?'<p class="case-scope">This is an illustrative scenario, not a finding about a specific operator. Benefits depend on evidence quality and coordinated action.</p>':'';
    return shell(`${breadcrumbs(crumb)}<header class="reader-heading"><span class="eyebrow">${esc(chapterLabel(p))}</span><h1>${esc(p.question)}</h1><p class="concept-subtitle">${esc(p.title)}</p><p class="reader-lead">${esc(p.summary)}</p></header>
    <figure class="figure-wrap"><div class="figure-bar"><span><strong>${esc(figureLabel)}</strong> · ${p.chapter===null?'Application of the continuity concepts':esc(p.chapterTitle)}</span><button class="enlarge-button" data-enlarge="${p.id}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M3 3l7 7m11-7-7 7M3 21l7-7m11 7-7-7"/></svg>Enlarge diagram</button></div><div class="figure-image"><img src="assets/${p.id}.svg" alt="${esc(p.alt)}" style="aspect-ratio:${p.diagramWidth}/${p.diagramHeight}" decoding="async" fetchpriority="high"></div><figcaption>${esc(p.takeaway)}</figcaption></figure>
    <div class="concept-reading"><section class="narration" aria-labelledby="understanding-title"><h2 id="understanding-title">Understanding the diagram</h2>${p.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}${scopeNote}<details class="diagram-walkthrough"><summary>How to read the diagram</summary><ol>${p.readDiagram.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></details></section><aside class="practice-box" aria-label="Practical application"><span class="eyebrow">Take it into your operation</span><h2>A practical check</h2><p>${esc(p.practicalCheck)}</p><h3>Evidence to examine</h3><ul class="evidence-list">${p.evidence.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></aside></div>
    <div class="reference-line"><p>${p.chapter===null?'Source: Air-domain MRO illustrative diagram and accompanying notes.':p.chapter===0?`Book reference: Prologue, “${esc(p.sectionTitle||p.section)}”, Figure ${esc(p.figure)}. Original diagram from the book collection.`:`Book reference: Chapter ${p.chapter}, section ${esc(p.section)}, Figure ${esc(p.figure)}. Original diagram from the book collection.`}</p><button class="print-button" data-print>Print this page</button></div><section class="related-section" aria-labelledby="related-title"><h2 id="related-title">Connected concepts</h2>${relatedLinks(p.related.slice(0,2))}</section>
    <nav class="sequence-nav" aria-label="Concept sequence"><a href="${prev?pageLink(prev):'#/map'}"><small>← ${prev?'Previous concept':'Return'}</small><strong>${prev?esc(prev.navTitle||prev.title):'The management map'}</strong></a><a href="${next?pageLink(next):'#/questions'}"><small>${next?'Next concept':'Explore'} →</small><strong>${next?esc(next.navTitle||next.title):'All operating questions'}</strong></a></nav>`,p.id,p.chapter);
  }
  function resultItem(p) {
    return `<a class="result-item" href="${pageLink(p)}"><span class="eyebrow">${esc(chapterLabel(p))}</span><h2>${esc(p.question)} ${arrow}</h2><p>${esc(p.summary)}</p></a>`;
  }
  function renderQuestions(filter='all') {
    document.title='Operating questions | Lifecycle Continuity Field Guide';
    if(!filters.some(([id])=>id===filter))filter='all';
    const selectedGroup=questionGroups.find(g=>g.id===filter);
    const available=pages.filter(p=>filter==='all'||selectedGroup.chapters.includes(p.chapter));
    return `<section class="content-page">${breadcrumbs([{label:'Operating questions'}])}<header><span class="eyebrow">Find a starting point</span><h1>Explore an operating question</h1><p class="page-intro">Begin with a situation you recognise. Choose the same areas as the management map, or explore the opening context, Net Zero and the MRO case.</p></header><div class="filter-controls" role="group" aria-label="Filter operating questions">${filters.map(([v,label])=>`<button class="filter-button" data-filter="${v}" aria-pressed="${v===filter}">${label}</button>`).join('')}</div><p class="results-count">${available.length} ${available.length===1?'operating question':'operating questions'}</p><div class="result-list">${available.map(resultItem).join('')}</div></section>`;
  }
  function renderChapterIndex() {
    document.title='Browse chapters | Lifecycle Continuity Field Guide';
    return `<section class="content-page">${breadcrumbs([{label:'Chapters'}])}<header><span class="eyebrow">Follow the book</span><h1>Browse the chapters</h1><p class="page-intro">The guide follows the book’s management logic. Open a chapter to see its purpose and explore its diagrams, operating questions and practical checks.</p></header><div class="chapter-index">${chapters.map(c=>{const count=pages.filter(p=>p.chapter===c.number).length;return `<a href="#/chapters/${c.number}"><span class="chapter-no">${c.number===0?'P':String(c.number).padStart(2,'0')}</span><div><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p><small>${count} illustrated concept${count===1?'':'s'}</small></div></a>`}).join('')}</div></section>`;
  }
  function renderChapter(n) {
    const c=chapters.find(c=>c.number===n);if(!c)return renderNotFound();
    document.title=`${c.title} | Lifecycle Continuity Field Guide`;
    const available=pages.filter(p=>p.chapter===n);
    return shell(`${breadcrumbs([{label:'Chapters',href:'#/chapters'},{label:n===0?'Prologue':`Chapter ${n}`}])}<header class="reader-heading"><span class="eyebrow">${n===0?'Opening context':`Chapter ${n}`}</span><h1>${esc(c.title)}</h1><p class="reader-lead">${esc(c.summary)}</p></header><div class="chapter-intro">${c.paragraphs.map(t=>`<p>${esc(t)}</p>`).join('')}</div><section class="chapter-section"><h2>Explore ${n===0?'the opening questions':'this chapter'}</h2><div class="result-list">${available.map(resultItem).join('')}</div></section><section class="chapter-section"><h2>Find a diagram by figure number</h2><ul class="topic-list">${c.topics.map(t=>`<li><span class="topic-ref">${esc(t.figure||'')}</span><a href="#/concept/${t.pageId}">${esc(t.title)}</a><span class="topic-state">${arrow}</span></li>`).join('')}</ul></section><section class="related-section"><h2>Continue exploring</h2>${relatedLinks(c.related.slice(0,2))}</section><nav class="sequence-nav" aria-label="Chapter sequence"><a href="${n>0?'#/chapters/'+(n-1):'#/map'}"><small>← ${n>0?'Previous chapter':'Return'}</small><strong>${n>0?esc(chapters.find(x=>x.number===n-1)?.title):'The management map'}</strong></a>${n<10?`<a href="#/chapters/${n+1}"><small>Next chapter →</small><strong>${esc(chapters.find(x=>x.number===n+1)?.title)}</strong></a>`:`<a href="#/map"><small>Return →</small><strong>The management map</strong></a>`}</nav>`,null,n);
  }
  function renderUnderstand() {
    document.title='Understand continuity | Lifecycle Continuity Field Guide';
    return `<section class="content-page">${breadcrumbs([{label:'Understand'}])}<header><span class="eyebrow">The management map · Chapters 1–2</span><h1>Understand the operating condition</h1><p class="page-intro">Begin with the problem of disconnection, then examine what must remain connected. These chapters establish the meaning of continuity and the practical conditions that make a lifecycle state actionable.</p></header><div class="chapter-index">${chapters.filter(c=>[1,2].includes(c.number)).map(c=>`<a href="#/chapters/${c.number}"><span class="chapter-no">0${c.number}</span><div><h2>${esc(c.title)}</h2><p>${esc(c.summary)}</p><small>Open chapter overview</small></div></a>`).join('')}</div><section class="chapter-section"><h2>Start with a guided example</h2><div class="result-list">${resultItem(byId['know-own-decide-recover'])}</div></section></section>`;
  }
  function normalise(s){return String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'');}
  function searchResults(query) {
    const words=normalise(query).trim().split(/\s+/).filter(Boolean);
    if(!words.length)return {matched:pages,chapterMatches:[]};
    const matches=text=>words.every(w=>normalise(text).includes(w));
    return {matched:pages.filter(p=>matches([p.question,p.title,p.summary,...p.paragraphs,...p.evidence,...p.keywords,p.section,p.figure,p.chapterTitle,chapterLabel(p)].join(' '))),chapterMatches:chapters.filter(c=>matches([c.title,c.summary,...c.paragraphs,...c.topics.map(t=>t.title)].join(' ')))};
  }
  function searchMarkup(query) {
    const {matched,chapterMatches}=searchResults(query);
    const count=matched.length+chapterMatches.length;
    if(!count)return `<div class="empty-results"><h2>No matching page in the guide</h2><p>Try a broader term such as <button class="filter-button" data-search-term="release">release</button>, <button class="filter-button" data-search-term="recovery">recovery</button> or <button class="filter-button" data-search-term="evidence">evidence</button>, or <a href="#/chapters">browse the chapter map</a>.</p></div>`;
    return `<p class="results-count">${count} ${count===1?'result':'results'}${query?' for “'+esc(query)+'”':''}</p><div class="result-list">${matched.map(resultItem).join('')}${chapterMatches.map(c=>`<a class="result-item" href="#/chapters/${c.number}"><span class="eyebrow">${c.number===0?'Prologue':`Chapter ${c.number}`} · Chapter overview</span><h2>${esc(c.title)} ${arrow}</h2><p>${esc(c.summary)}</p></a>`).join('')}</div>`;
  }
  function renderSearch(query='') {
    document.title='Search | Lifecycle Continuity Field Guide';
    return `<section class="content-page">${breadcrumbs([{label:'Search'}])}<header><span class="eyebrow">Find a concept or a connection</span><h1>Search the field guide</h1><p class="page-intro">Search all concept pages and chapter overviews by operating question, concept, evidence or book reference.</p></header><form class="search-form" id="search-form" role="search"><label class="search-field"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg><span class="sr-only">Search terms</span><input type="search" id="guide-search" name="q" placeholder="Try stock, responsibility or recovery…" value="${esc(query)}" autocomplete="off"></label><button class="button" type="submit">Search</button></form><p class="search-hint">Try <button data-search-term="release">release</button>, <button data-search-term="decision">decision</button>, <button data-search-term="recovery">recovery</button> or <button data-search-term="evidence">evidence</button>.</p><div id="search-results" aria-live="polite">${searchMarkup(query)}</div></section>`;
  }
  function renderNotFound(){document.title='Page not found | Lifecycle Continuity Field Guide';return `<section class="content-page"><span class="eyebrow">Find your place</span><h1>This page is not in the guide</h1><p>The management map and operating questions will help you find the concept you need.</p><a class="button" href="#/map">Return to the map</a></section>`;}
  function closeMenu(){menu.hidden=true;menuToggle.setAttribute('aria-expanded','false');}
  function route(){
    if(dialog.open)dialog.close();
    closeMenu();
    const hash=window.location.hash.replace(/^#\/?/,'')||'map';
    const [path,queryString]=hash.split('?');
    const [view,id]=path.split('/');
    let html;
    if(view==='map')html=renderHome();
    else if(view==='concept')html=renderConcept(id);
    else if(view==='questions')html=renderQuestions(new URLSearchParams(queryString||'').get('filter')||'all');
    else if(view==='chapters')html=id===undefined?renderChapterIndex():renderChapter(Number(id));
    else if(view==='area'&&id==='understand')html=renderUnderstand();
    else if(view==='search')html=renderSearch(new URLSearchParams(queryString||'').get('q')||'');
    else html=renderNotFound();
    main.innerHTML=html;
    document.querySelectorAll('[data-nav]').forEach(a=>{const active=a.dataset.nav===(view==='concept'||view==='area'?'chapters':view);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    window.scrollTo({top:0,behavior:'instant'});
    main.focus({preventScroll:true});
    live.textContent=document.title.replace(' | Lifecycle Continuity Field Guide','');
  }
  function updateZoom(){document.getElementById('dialog-image').style.width=zoom+'%';document.getElementById('zoom-value').textContent=zoom+'%';document.getElementById('zoom-out').disabled=zoom<=100;document.getElementById('zoom-in').disabled=zoom>=300;}
  function openDiagram(id,trigger){const p=byId[id];if(!p)return;lastDiagramTrigger=trigger;zoom=100;document.getElementById('diagram-dialog-title').textContent=p.title;const img=document.getElementById('dialog-image');img.src='assets/'+id+'.svg';img.alt=p.alt;updateZoom();dialog.showModal();document.body.style.overflow='hidden';document.getElementById('diagram-viewport').scrollTo(0,0);}
  menuToggle.addEventListener('click',()=>{const willOpen=menu.hidden;menu.hidden=!willOpen;menuToggle.setAttribute('aria-expanded',String(willOpen));if(willOpen)menu.querySelector('a').focus();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!menu.hidden){closeMenu();menuToggle.focus();}});
  document.addEventListener('click',event=>{
    if(event.target.closest('.skip-link')){event.preventDefault();main.focus();main.scrollIntoView({block:'start'});return;}
    const enlarge=event.target.closest('[data-enlarge]');if(enlarge){openDiagram(enlarge.dataset.enlarge,enlarge);return;}
    const filter=event.target.closest('[data-filter]');if(filter){window.location.hash='/questions'+(filter.dataset.filter==='all'?'':'?filter='+filter.dataset.filter);return;}
    const term=event.target.closest('[data-search-term]');if(term){window.location.hash='/search?q='+encodeURIComponent(term.dataset.searchTerm);return;}
    if(event.target.closest('[data-print]'))window.print();
  });
  document.addEventListener('submit',event=>{if(event.target.id==='search-form'){event.preventDefault();const query=document.getElementById('guide-search').value.trim();const next='/search'+(query?'?q='+encodeURIComponent(query):'');if(location.hash==='#'+next){document.getElementById('search-results').innerHTML=searchMarkup(query);}else location.hash=next;}});
  document.addEventListener('input',event=>{if(event.target.id==='guide-search'){const query=event.target.value;document.getElementById('search-results').innerHTML=searchMarkup(query);history.replaceState(null,'','#/search'+(query?'?q='+encodeURIComponent(query):''));}});
  document.getElementById('close-diagram').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{document.body.style.overflow='';if(lastDiagramTrigger?.isConnected)lastDiagramTrigger.focus();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  document.getElementById('zoom-in').addEventListener('click',()=>{zoom=Math.min(300,zoom+25);updateZoom();});
  document.getElementById('zoom-out').addEventListener('click',()=>{zoom=Math.max(100,zoom-25);updateZoom();});
  document.getElementById('zoom-reset').addEventListener('click',()=>{zoom=100;updateZoom();document.getElementById('diagram-viewport').scrollTo(0,0);});
  window.addEventListener('hashchange',route);
  route();
})();
