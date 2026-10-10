const IC = {
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><path d="M12 18v4"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="m3.5 6 1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2"/>',
  tasks:'<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="m9 16 2 2 4-4"/>',
  book:'<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  school:'<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  bulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6M10 22h4"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  signal:'<path d="M3 20v-3M8 20v-6M13 20v-9M18 20V5"/>',
  wifi:'<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  battery:'<rect x="2" y="7" width="18" height="10" rx="2.5"/><path d="M22 11v2M6 10v4M10 10v4M14 10v4"/>'
};
const svg = (n, c = 'i') => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${IC[n]}</svg>`;

const DIRS = [
  { id:'marigold', name:'Marigold Morning',
    vibe:'Warm, sunny and confident. Lots of white space, one happy marigold colour and deep plum text. A well-run home on a good morning.',
    feels:'Airbnb’s warmth, Swiggy’s friendliness, festival marigolds without the kitsch',
    type:'Anek Latin + Anek Tamil (Ek Type): one family drawn for both scripts, friendly and slightly wide',
    shape:'Soft 22px cards, pill buttons, round icon badges, a sunrise header band',
    colour:'White canvas; marigold for actions and highlights; plum ink; leaf, hibiscus and sky as quiet helpers',
    motion:'Smooth ease-out; the tick fills and throws a tiny ring of marigold petals',
    dark:'Plum night, marigold stays bright',
    palette:[['#FFFFFF','Canvas'],['#FFF1D2','Sunrise'],['#FFAD1F','Marigold'],['#2A1631','Plum ink'],['#1E8A4C','Leaf'],['#C8323F','Hibiscus']],
    r:{Spacious:4,Colourful:3,Playful:3,Professional:5,'Kid-friendly':3,'Native feel':4,'Tamil type':5},
    watch:'Can drift toward a food-delivery look if marigold is used everywhere. Keep it for actions and the morning header.' },
  { id:'pastel', name:'Pastel Rooms',
    vibe:'Every tab is its own softly coloured room: peach Today, mint Lists, lilac Talk, butter Tasks, sky Memory. White cards float on top. Airy and the friendliest of the six.',
    feels:'Tiimo, Structured, Apple Journal',
    type:'Nunito + Baloo Thambi 2: rounded letters in both scripts',
    shape:'Very round 28px cards, round icons, pill buttons, tab bar like a soft tray',
    colour:'A pastel room per tab, deep navy ink, a coral mic',
    motion:'Gentle squish on press and a soft ripple on tick (light overshoot)',
    dark:'Dusky versions of each room',
    rooms:[['Today','#FFE7D9'],['Lists','#D7F2E5'],['Talk','#E8E2FF'],['Tasks','#FFF0BF'],['Memory','#DCEBFF']],
    palette:[['#FFE7D9','Peach room'],['#D7F2E5','Mint room'],['#E8E2FF','Lilac room'],['#FFF0BF','Butter room'],['#FF7657','Coral mic'],['#2D2940','Navy ink']],
    r:{Spacious:5,Colourful:4,Playful:4,Professional:3,'Kid-friendly':5,'Native feel':4,'Tamil type':4},
    watch:'Pastels wash out in bright sunlight at the shop, so text and buttons rely on deep navy. Room colours must never be read as meaning.' },
  { id:'rangoli', name:'Rangoli Colour',
    vibe:'Bold, joyful colour blocks (tomato, teal, sunflower, kumkum pink) with a quiet kolam-dot motif. The most colourful, still neatly organised.',
    feels:'Headspace, Material 3 Expressive, a doorstep kolam at Pongal',
    type:'Lexend (designed for easy reading) + Catamaran for Tamil',
    shape:'20px blocks, squarer 14px buttons, dot patterns tucked into corners',
    colour:'White canvas; only “needs attention” items become full colour blocks; violet for actions',
    motion:'Blocks press in slightly; the tick bursts kolam dots in colour (light overshoot)',
    dark:'Near-black with the blocks glowing richer',
    palette:[['#FFFFFF','Canvas'],['#D63A1F','Tomato'],['#0D7C7A','Teal'],['#FFC83A','Sunflower'],['#CC2D77','Kumkum'],['#5B3FC4','Violet']],
    r:{Spacious:3,Colourful:5,Playful:4,Professional:3,'Kid-friendly':4,'Native feel':3,'Tamil type':4},
    watch:'The loudest option. On busy days a screen of blocks can feel like a toy box; it needs a strict rule about what earns a block.' },
  { id:'moon', name:'Moonlight',
    vibe:'Named after Nilumi itself: nila, the moon. Soft lilac morning sky, a small crescent, calm indigo. Reassuring by day, genuinely beautiful at night.',
    feels:'Calm, Finch at night, Apple’s Sleep screens',
    type:'Manrope + Noto Sans Tamil: clean, modern, open',
    shape:'24px cards with hairline borders, round buttons, airy spacing',
    colour:'Lilac-and-cream sky, indigo for actions, moon-gold for highlights',
    motion:'The crescent breathes slowly; the tick glows gold; things fade rather than bounce',
    dark:'Its best mode: deep indigo night with gold moonlight',
    palette:[['#F6F4FF','Morning sky'],['#DCD5FF','Lilac'],['#4A3ED0','Indigo'],['#E7B640','Moon gold'],['#1D1A3A','Night ink'],['#0D0C22','Night']],
    r:{Spacious:4,Colourful:2,Playful:2,Professional:4,'Kid-friendly':3,'Native feel':4,'Tamil type':4},
    watch:'Least colourful and least playful; soft gradients can drift toward the “AI product” look if they spread.' },
  { id:'sticker', name:'Paper & Stickers',
    vibe:'A cheerful notebook: dotted paper, outlined cards, icons stuck on like stickers, a DONE stamp when you finish something. The most playful.',
    feels:'Finch, Notion’s illustrations, a school diary',
    type:'Fredoka headings + Figtree body; Arima and Catamaran for Tamil',
    shape:'Outlined 20px cards with a solid bottom edge, chunky pressable buttons, tilted sticker icons',
    colour:'Dotted white paper, tomato, sky, leaf, sunflower and grape stickers, dark ink outlines',
    motion:'Buttons physically press down; a DONE stamp lands on tick (light overshoot)',
    dark:'Dark paper with light outlines',
    palette:[['#FFFFFF','Paper'],['#FF6B4A','Tomato'],['#2E9BEA','Sky'],['#2DB36A','Leaf'],['#FFD23F','Sunflower'],['#232036','Ink']],
    r:{Spacious:3,Colourful:4,Playful:5,Professional:2,'Kid-friendly':5,'Native feel':2,'Tamil type':3},
    watch:'Closest to “too childish”. It may not feel serious enough for insurance renewals, health facts or Forget.' },
  { id:'native', name:'Soft Native',
    vibe:'Looks like it came with the phone: large titles, grouped lists, colourful little app-icon tiles, a frosted tab bar. Calm and instantly familiar.',
    feels:'Apple Reminders, Apple Health, Google Tasks',
    type:'The phone’s own font (SF Pro on iPhone, Roboto on Android; Segoe UI in this Windows preview) and system Tamil',
    shape:'Grouped 14px lists, small rounded icon tiles, standard controls',
    colour:'Light grey background, white groups, teal for Nilumi, colourful system tiles',
    motion:'Standard platform easing only; nothing extra',
    dark:'True black, like the phone’s own apps',
    palette:[['#F2F2F7','Background'],['#FFFFFF','Group'],['#0B7F78','Nilumi teal'],['#FF9500','Orange tile'],['#34C759','Green tile'],['#007AFF','Blue tile']],
    r:{Spacious:4,Colourful:3,Playful:1,Professional:5,'Kid-friendly':2,'Native feel':5,'Tamil type':3},
    watch:'Most familiar but least “Nilumi”. It could be any app, and grouped lists edge toward the settings-screen feel you don’t want.' }
];

const dots = n => '●'.repeat(n) + '○'.repeat(5 - n);

function phone() {
  return `<div class="phone"><div class="screen">
  <div class="status"><span>9:41</span><span class="sbi">${svg('signal','i sb')}${svg('wifi','i sb')}${svg('battery','i sb')}</span></div>
  <div class="scroll">
    <section class="hero">
      <div class="top"><span class="avatar">M</span><button class="icon-btn" type="button" aria-label="Inbox, 2 unread">${svg('bell')}<span class="count">2</span></button></div>
      <span class="moon" aria-hidden="true"></span>
      <p class="date">Friday, 10 October</p>
      <h1 class="greet">Good morning, <span class="nm">Meera</span></h1>
      <p class="sub">Three things need you today.</p>
      <span class="kolam" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    </section>
    <button class="capture" type="button"><span class="ph">Say or type something</span><span class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="listen-txt">Listening…</span><span class="mic">${svg('mic')}</span></button>
    <h2 class="sec">Needs attention now</h2>
    <ul class="items attn">
      <li class="item" style="--i:0"><span class="ico tone-1">${svg('shield')}</span><div class="body"><p class="title">Car insurance renews on Sunday</p><p class="meta"><span class="chip">${svg('link','i s')}From memory · 2 Sep</span><span class="badge vis-house">${svg('home','i s')}Household</span></p></div></li>
      <li class="item" style="--i:1"><span class="ico tone-2">${svg('school')}</span><div class="body"><p class="title">Pay Aarav’s school fees</p><p class="meta"><span class="chip">${svg('clock','i s')}Today · 10:00 am</span></p></div><button class="done-btn" type="button" aria-label="Mark done" aria-pressed="false">${svg('check','i ck')}<span class="burst"></span></button></li>
      <li class="item" style="--i:2"><span class="ico tone-3">${svg('cart')}</span><div class="body"><p class="title">Shopping list · 6 items</p><p class="meta"><span class="chip">Arjun added தேங்காய், பால்</span></p></div><span class="chev">${svg('chev')}</span></li>
    </ul>
    <div class="card suggest">
      <div class="s-head"><span class="ico tone-4">${svg('bulb')}</span><p class="s-text">Move “Call plumber Ravi” to tomorrow, 10:00 am?</p></div>
      <p class="meta"><span class="chip">${svg('link','i s')}Overdue since Wednesday</span></p>
      <div class="actions"><button class="btn primary approve" type="button">Approve</button><button class="btn quiet" type="button">Edit</button><button class="btn quiet notnow" type="button">Not now</button></div>
      <p class="approved-msg">${svg('check','i s')}Moved to tomorrow, 10:00 am</p>
    </div>
    <h2 class="sec">Just now in Talk</h2>
    <div class="card saved" style="margin-top:0">
      <div class="s-head"><span class="ok">${svg('check','i s')}</span><span class="saved-label">Saved</span><span class="badge vis-house">${svg('home','i s')}Household</span></div>
      <p class="saved-text">Washing machine warranty ends on <b>15 Mar 2028</b></p>
      <p class="heard">Heard: “our washing machine warranty ends on March 15, 2028”</p>
      <div class="actions"><button class="btn secondary undo" type="button">Undo</button><button class="btn quiet" type="button">Edit</button></div>
    </div>
    <h2 class="sec">Later this week</h2>
    <ul class="later">
      <li><span class="dot"></span><div><p class="title">Water purifier service</p><p class="small">Tue, 14 Oct</p></div><span class="badge vis-house">${svg('home','i s')}Household</span></li>
      <li><span class="dot d2"></span><div><p class="title">Diwali sweets order</p><p class="small">Sat, 18 Oct</p></div><span class="badge vis-shared">${svg('users','i s')}Shared</span></li>
      <li><span class="dot d3"></span><div><p class="title">Anniversary gift ideas</p><p class="small">Only you can see this</p></div><span class="badge vis-private">${svg('lock','i s')}Private</span></li>
    </ul>
    <p class="end">That’s everything for now.</p>
  </div>
  <nav class="tabbar" aria-label="Main">
    <button class="tab active" type="button"><span class="ti">${svg('sun')}</span>Today</button>
    <button class="tab" type="button"><span class="ti">${svg('list')}</span>Lists</button>
    <button class="tab talk" type="button" aria-label="Talk"><span class="ti">${svg('mic')}</span>Talk</button>
    <button class="tab" type="button"><span class="ti">${svg('tasks')}</span>Tasks</button>
    <button class="tab" type="button"><span class="ti">${svg('book')}</span>Memory</button>
  </nav>
  <div class="toast" role="status"></div>
</div></div>`;
}

function notes(d) {
  const rooms = d.rooms ? `<div class="rooms">${d.rooms.map(([n,c]) => `<span style="background:${c}">${n}</span>`).join('')}</div>` : '';
  return `<div class="notes">
    <h2>${d.name}</h2>
    <p class="vibe">${d.vibe}</p>
    <div class="swatches">${d.palette.map(([h,l]) => `<div class="sw"><i style="background:${h}"></i><b>${l}</b>${h}</div>`).join('')}</div>
    <dl class="facts">
      <dt>Feels like</dt><dd>${d.feels}</dd>
      <dt>Type</dt><dd>${d.type}</dd>
      <dt>Shapes</dt><dd>${d.shape}</dd>
      <dt>Colour</dt><dd>${d.colour}</dd>
      <dt>Motion</dt><dd>${d.motion}</dd>
      <dt>Dark mode</dt><dd>${d.dark}</dd>
    </dl>
    <div class="kit">
      <div class="spec"><span class="aa">Aa</span><span class="ln"><b>Good morning, Meera</b><span>நிலுமி · இன்றைய நினைவூட்டல்கள்</span></span></div>
      ${rooms}
      <div class="kit-row"><button class="btn primary" type="button">Approve</button><button class="btn secondary" type="button">Edit</button><button class="btn quiet" type="button">Not now</button><button class="btn danger" type="button">Forget</button></div>
      <div class="kit-row"><span class="badge vis-house">${svg('home','i s')}Household</span><span class="badge vis-shared">${svg('users','i s')}Shared</span><span class="badge vis-private">${svg('lock','i s')}Private</span><span class="chip">${svg('link','i s')}From memory · 2 Sep</span></div>
      <div class="kit-row"><label class="field">${svg('plus')}<input placeholder="Add to the list…" aria-label="Add to the list"></label><span class="switch-wrap"><button class="switch" type="button" role="switch" aria-checked="true" aria-label="Speak replies"></button>Speak replies</span></div>
      <div class="kit-row"><button class="row-check" type="button" role="checkbox" aria-checked="false"><span class="box">${svg('check','i ck')}</span><span class="lbl">Rice</span><span class="qty">2 kg</span></button><button class="row-check on" type="button" role="checkbox" aria-checked="true"><span class="box">${svg('check','i ck')}</span><span class="lbl">தேங்காய் (coconut)</span><span class="qty">2</span></button></div>
    </div>
    <div class="ratings">${Object.entries(d.r).map(([k,v]) => `<div class="rate"><span>${k}</span><span class="dots" aria-label="${v} of 5">${dots(v)}</span></div>`).join('')}</div>
    <div class="watch"><strong>Watch out</strong>${d.watch}</div>
  </div>`;
}

function render() {
  document.getElementById('jump').innerHTML = DIRS.map(d => `<a href="#${d.id}">${d.name}</a>`).join('') + '<a href="#compare">Compare</a>';
  document.getElementById('dirs').innerHTML = DIRS.map(d => `<section class="dir d-${d.id}" id="${d.id}" aria-label="${d.name}">${phone()}${notes(d)}</section>`).join('');
  const keys = Object.keys(DIRS[0].r);
  document.getElementById('table').innerHTML = `<thead><tr><th>Direction</th>${keys.map(k => `<th>${k}</th>`).join('')}<th>Watch out</th></tr></thead><tbody>${DIRS.map(d => `<tr><td><a href="#${d.id}" style="color:inherit">${d.name}</a></td>${keys.map(k => `<td class="dots">${dots(d.r[k])}</td>`).join('')}<td>${d.watch}</td></tr>`).join('')}</tbody>`;
}

function toast(el, msg) {
  const t = el.closest('.screen')?.querySelector('.toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

function listen(screen) {
  const c = screen.querySelector('.capture');
  c.classList.add('listening');
  clearTimeout(c._t); c._t = setTimeout(() => c.classList.remove('listening'), 2600);
}

document.addEventListener('click', e => {
  const t = e.target;
  const done = t.closest('.done-btn');
  if (done) { const it = done.closest('.item'); const on = it.classList.toggle('is-done'); done.setAttribute('aria-pressed', on); if (on) toast(done, 'Nice — marked done'); return; }
  const ap = t.closest('.approve');
  if (ap && ap.closest('.suggest')) { ap.closest('.suggest').classList.add('approved'); return; }
  const nn = t.closest('.notnow');
  if (nn) { nn.closest('.suggest').classList.add('dismissed'); toast(nn, 'Okay, not now'); return; }
  const un = t.closest('.undo');
  if (un) { toast(un, 'Undone · warranty date removed'); return; }
  const cap = t.closest('.capture, .tab.talk');
  if (cap && cap.closest('.screen')) { listen(cap.closest('.screen')); return; }
  const row = t.closest('.row-check');
  if (row) { const on = row.classList.toggle('on'); row.setAttribute('aria-checked', on); return; }
  const sw = t.closest('.switch');
  if (sw) { sw.setAttribute('aria-checked', sw.getAttribute('aria-checked') !== 'true'); return; }
});

render();

const themeBtn = document.querySelector('.theme-btn');
themeBtn.addEventListener('click', () => {
  const dark = document.body.dataset.theme !== 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  themeBtn.textContent = dark ? 'Light mode' : 'Dark mode';
});

const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.25 });
document.querySelectorAll('.dir').forEach(d => io.observe(d));
