'use strict';

/**
 * Word Duel — Game Server
 *
 * Run:  cd server && npm install && node game-server.js
 *
 * Socket events (client → server):
 *   join_queue                  – enter the matchmaking queue
 *   submit_word  { word }       – submit a word during an active round
 *
 * Socket events (server → client):
 *   queued        { position }
 *   match_start   { matchId, grid, seed, startTs, endTs, opponentId }
 *   word_result   { word, valid, reason, score, runningScore }
 *   match_end     { winner, scores, payouts, words }
 *   error         { message }
 */

const http = require('http');
const { Server } = require('socket.io');

// ─── Config ───────────────────────────────────────────────────────────────────

const PORT              = process.env.PORT || 3001;
const ROUND_DURATION_MS = 60_000;   // 60 seconds
const ENTRY_USD         = 1.00;     // hypothetical entry fee
const RAKE_RATE         = 0.10;     // 10 % rake on winning prize pool
const MAX_SUBMISSIONS   = 20;       // rate limit: submissions per round

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────
// Deterministic: same seed → same grid on every machine.

function createPrng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

// ─── Weighted letter pool ─────────────────────────────────────────────────────
// Weights mirror natural English letter frequency; ensures rich grids.

const LETTER_WEIGHTS = {
  E: 12, T: 9, A: 8, O: 8, I: 7, N: 7, S: 6, R: 6,
  H: 6,  L: 4, D: 4, C: 4, U: 4, M: 3, F: 2, P: 2,
  G: 2,  W: 2, Y: 2, B: 2, V: 1, K: 1, J: 1, X: 1,
  Q: 1,  Z: 1,
};

const LETTER_POOL = (function buildPool() {
  const pool = [];
  for (const [letter, weight] of Object.entries(LETTER_WEIGHTS)) {
    for (let i = 0; i < weight; i++) pool.push(letter);
  }
  return pool;
})();

// ─── Grid generation ──────────────────────────────────────────────────────────

function generateGrid(seed) {
  const prng = createPrng(seed);
  const grid = [];
  for (let r = 0; r < 4; r++) {
    grid[r] = [];
    for (let c = 0; c < 4; c++) {
      grid[r][c] = LETTER_POOL[Math.floor(prng() * LETTER_POOL.length)];
    }
  }
  return grid;
}

// ─── Boggle-style adjacency path validator ────────────────────────────────────
// Returns true if `word` can be traced on `grid` using 8-directional
// adjacency without reusing any tile.

function wordExistsOnGrid(grid, word) {
  const W = word.toUpperCase();
  if (W.length < 3 || W.length > 16) return false;

  const visited = [
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
    [false, false, false, false],
  ];

  function dfs(r, c, idx) {
    if (idx === W.length) return true;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr < 0 || nr > 3 || nc < 0 || nc > 3) continue;
        if (visited[nr][nc] || grid[nr][nc] !== W[idx]) continue;
        visited[nr][nc] = true;
        if (dfs(nr, nc, idx + 1)) return true;
        visited[nr][nc] = false;
      }
    }
    return false;
  }

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === W[0]) {
        visited[r][c] = true;
        if (dfs(r, c, 1)) return true;
        visited[r][c] = false;
      }
    }
  }
  return false;
}

// ─── Dictionary (1 000 common English words, 3+ letters) ─────────────────────

/* eslint-disable */
const DICTIONARY = new Set([
  // 3-letter
  'ace','act','add','age','ago','aid','aim','air','ale','ant','ape','arc',
  'are','ark','arm','art','ash','ask','awe','axe','bag','ban','bar','bat',
  'bay','bed','bet','bid','big','bit','bow','box','boy','bud','bug','bus',
  'but','buy','cab','can','cap','car','cat','cop','cow','cry','cup','cut',
  'dam','day','did','dig','dim','dip','dog','dot','dry','dug','dye','ear',
  'eat','egg','ego','elm','end','era','eye','fan','fat','fed','few','fit',
  'fix','fly','fog','fox','fur','gap','gas','gem','get','gin','got','gun',
  'gut','guy','had','ham','has','hat','hay','hen','her','hew','him','hip',
  'his','hit','hog','hop','hot','hub','hug','hum','hut','ice','ill','ink',
  'inn','ion','ivy','jab','jam','jar','jaw','jet','job','joy','jug','key',
  'kid','kin','kit','lab','lag','law','lay','led','leg','let','lid','lip',
  'lit','log','lot','low','mad','map','mat','men','met','mid','mix','mob',
  'mom','mop','mud','mug','nap','net','new','nip','nod','nor','not','nun',
  'nut','oak','oar','odd','off','oil','old','one','opt','orb','ore','our',
  'out','owe','owl','own','pad','pan','par','pat','paw','pay','pea','peg',
  'pen','pet','pie','pig','pin','pit','pod','pop','pot','pro','pub','pun',
  'pup','put','rag','ran','rap','rat','raw','ray','red','ref','rep','rid',
  'rig','rip','rob','rod','row','rub','rut','rye','sad','sap','sat','saw',
  'say','set','sew','shy','sin','sip','sir','sit','six','ski','sky','son',
  'sow','soy','spa','spy','sub','sue','sun','tab','tan','tap','tar','tax',
  'tea','ten','tie','tin','tip','toe','top','toy','try','tub','tug','two',
  'urn','van','vat','vet','via','vow','wag','war','was','web','wed','wig',
  'win','wit','woe','won','yam','yew','you','zip','zoo',

  // 4-letter
  'able','ache','acid','acre','also','arch','area','army','arts','atom',
  'auto','back','bail','bait','bake','bald','ball','balm','band','bane',
  'bang','bank','barn','base','bash','bath','bead','beam','bean','bear',
  'beat','beef','been','bell','belt','bend','bird','bite','blow','blue',
  'blur','bold','bolt','bone','book','bore','boss','both','brag','bran',
  'brat','brew','bull','bump','burn','buzz','cafe','cage','cake','call',
  'calm','came','cane','cape','card','care','cart','case','cash','cast',
  'cave','cell','chat','chef','chin','chip','chop','city','clam','clan',
  'clap','claw','clay','clue','coil','coin','cold','colt','come','cone',
  'cook','cool','cope','cord','core','corn','cost','cram','crew','crop',
  'crow','curl','cute','damp','dare','dark','dart','data','date','dawn',
  'dead','deal','dean','dear','debt','deck','deed','deer','deli','deny',
  'desk','diet','dime','dire','dirt','dish','disk','dock','dome','done',
  'down','drag','draw','drip','drop','drum','dual','dull','dumb','dump',
  'dusk','dust','each','earl','earn','ease','east','edge','else','emit',
  'epic','even','evil','exam','exit','fade','fail','fair','fall','fame',
  'farm','fast','fate','fawn','fear','feat','feed','feel','felt','fend',
  'fern','fill','film','find','fine','fire','firm','fish','fist','flag',
  'flat','flaw','flea','fled','flew','flex','foam','fold','folk','font',
  'food','fool','ford','fore','fork','form','fort','foul','four','fray',
  'free','fuel','full','fuse','fuzz','gain','gale','gall','gape','gate',
  'gave','gaze','gill','gist','glad','glen','glow','glue','goal','goes',
  'gold','golf','good','gore','grab','gray','grew','grid','grim','grip',
  'grow','gulf','gust','hack','hail','hair','half','hall','halt','hard',
  'hare','harm','harp','hash','have','hawk','heap','heat','heel','heir',
  'helm','help','here','hero','high','hill','hint','hold','hole','holy',
  'home','hone','hook','hoop','horn','host','hull','hunt','hymn','icon',
  'idle','inch','iris','iron','isle','itch','jade','jail','jest','join',
  'joke','jolt','jump','just','keen','kept','kick','kill','kind','king',
  'knit','knob','know','lack','lake','lamb','lamp','land','lane','lard',
  'lark','lash','last','late','lava','lawn','lead','leaf','lean','leap',
  'leer','left','lend','lens','lent','levy','like','lime','limp','line',
  'lint','lion','live','load','loan','loft','lone','long','look','loom',
  'loon','loop','lore','loss','lost','loud','love','luck','lump','lure',
  'lust','mace','maid','mail','main','make','male','mall','malt','mane',
  'mare','mark','mast','mate','maze','mead','meal','mean','meat','melt',
  'memo','mend','menu','mere','mesh','milk','mill','mint','mist','mode',
  'mold','mole','mood','moon','moor','more','most','moth','move','mule',
  'myth','nail','name','navy','need','nest','next','nine','none','nose',
  'note','null','oath','obey','odds','omen','once','open','oral','oven',
  'over','pace','pack','page','pail','pain','pair','pale','palm','park',
  'part','pass','past','path','pave','pawn','peak','peel','peer','pelt',
  'pest','pick','pile','pill','pine','pink','pipe','plan','plot','plow',
  'plum','plus','poll','polo','pond','pool','port','pose','post','pour',
  'prey','prim','prod','prop','pull','pump','punk','pure','race','rack',
  'raft','rage','raid','rail','rain','rake','ramp','rank','rare','rash',
  'rasp','rate','rave','read','ream','reap','reed','reef','reel','rein',
  'rely','rent','rich','ride','rile','rind','rink','rise','risk','roam',
  'roar','romp','roof','rook','root','rope','rose','rosy','rout','rove',
  'ruin','rule','ruse','rush','rust','safe','saga','sage','sake','sale',
  'salt','same','sand','sane','sang','sank','save','scan','scar','seam',
  'seal','seat','seed','seek','seem','seep','self','sell','shed','shin',
  'ship','shot','show','silk','sill','sing','sink','site','size','slab',
  'slam','slap','slew','slim','slip','slit','slow','slur','snap','snip',
  'snow','soak','soap','soar','sock','soft','some','song','soon','sore',
  'sort','soul','sour','span','spar','spin','spit','spot','spur','stab',
  'stag','star','stem','step','stew','stir','stop','stub','stun','such',
  'suit','sung','sunk','sure','surf','swan','swap','sway','swim','tail',
  'tale','tall','tame','tang','tank','tape','tart','task','team','tear',
  'teem','tell','tend','tent','term','test','text','than','them','then',
  'they','thin','thud','tide','tilt','time','toad','toll','tomb','tome',
  'tone','tore','torn','tote','tour','town','trap','trek','trim','trio',
  'trip','trot','tuft','tune','turf','twin','twig','type','ugly','undo',
  'unit','upon','used','user','vain','vale','vane','vase','vast','veil',
  'vein','very','view','vine','void','wade','wage','wail','wake','walk',
  'wall','wand','ward','warm','warp','wart','wave','weak','wean','weed',
  'week','weep','weld','well','welt','went','were','west','wide','wile',
  'wilt','wine','wing','wink','wisp','with','wolf','womb','wool','word',
  'wore','work','worm','wove','wrap','wren','yawn','year','yell','zone',
  'zoom',

  // 5-letter
  'about','above','abuse','acute','admit','adopt','adult','after','again',
  'agile','aisle','alert','alike','align','alive','alone','along','aloud',
  'altar','amber','amend','angel','anger','angle','angry','ankle','apple',
  'apply','apron','argue','arise','aroma','arose','array','arson','aside',
  'asset','attic','audio','audit','avail','avert','aware','awful','basic',
  'basin','basis','batch','baton','began','begin','being','below','bench',
  'blaze','blend','bless','blind','blink','bliss','blood','blown','board',
  'bonus','boost','boxer','brace','brain','brake','brand','brass','brave',
  'break','breed','bribe','bride','brief','brine','brink','brisk','broad',
  'broke','brood','broom','broth','brown','brute','built','bully','buyer',
  'cabin','candy','cargo','carol','catch','cause','cease','cedar','chain',
  'chant','chaos','charm','chest','chief','choir','chord','chore','civil',
  'claim','clasp','cling','clone','close','cloud','coast','cobra','comet',
  'comic','comma','coral','cover','covet','cramp','crane','crash','craze',
  'crazy','cream','creek','crime','crisp','cubic','curve','cycle','daily',
  'dairy','dance','debut','decoy','decay','delta','depot','depth','dirty',
  'dodge','donor','doubt','dough','draft','drape','dread','dream','dried',
  'drift','drink','drive','drove','dwarf','eagle','early','earth','eight',
  'elite','email','ember','empty','enact','enemy','enjoy','enter','entry',
  'envoy','epoch','essay','event','evict','exact','exert','extra','fable',
  'faint','fairy','faith','fancy','farce','fiend','fifty','final','flank',
  'flask','fleet','flesh','flint','float','flock','flood','flora','flute',
  'foggy','force','forge','forte','forum','found','freak','fresh','front',
  'froze','funny','gavel','girth','given','gland','glare','glass','glide',
  'gloom','glory','gloss','glove','going','grace','grade','grain','grand',
  'grant','grasp','grass','grate','grave','graze','greed','greet','grief',
  'grill','grind','groan','grope','grove','guard','guess','guest','guile',
  'guise','gulch','gully','gusto','haste','hasty','haven','hazel','heavy',
  'hedge','heist','hence','hilly','hitch','homer','honor','hotel','hound',
  'hover','humid','humor','husky','image','inner','input','inert','ivory',
  'jumpy','juicy','knave','kneel','knife','knock','lapse','laser','later',
  'layer','learn','ledge','legal','lemon','level','libel','light','liner',
  'liver','lodge','lofty','logic','lowly','lucid','lucky','lusty','lying',
  'magic','major','manor','maxim','mayor','media','merge','merit','meter',
  'midst','might','minor','minus','mirth','miser','model','moldy','money',
  'month','moral','mossy','mourn','mucky','muddy','mural','music','naive',
  'nasty','naval','night','noble','noise','notch','novel','occur','ocean',
  'order','otter','oxide','ozone','paint','panic','panel','patch','peace',
  'penal','perky','petty','pilot','place','plain','plait','plank','pleat',
  'pluck','polar','pouch','power','prank','press','price','pride','prime',
  'prior','prize','probe','prone','prose','proud','prune','pulse','punch',
  'quack','quail','qualm','queen','query','quick','quiet','quota','rabbi',
  'radar','ranch','rapid','raven','realm','rebel','refer','reign','relax',
  'relay','relic','reply','repay','rider','rival','rivet','rocky','rogue',
  'rouge','rough','round','rowdy','rugby','ruler','sandy','sauce','savor',
  'scary','scene','score','scout','scowl','seize','seven','shade','shady',
  'shake','shale','shame','shape','share','shelf','shell','shift','shiny',
  'short','shout','sight','silly','since','siren','sixth','sixty','skill',
  'skull','slate','slave','sleek','sleep','slime','slope','sloth','smash',
  'smear','smell','smile','smoke','snail','snake','snare','snarl','sneak',
  'snide','sniff','snore','solar','solid','solve','sorry','sound','spend',
  'spice','spill','spine','spite','spoon','spray','stain','stake','stale',
  'stall','stamp','stand','stare','stark','stash','state','steak','steal',
  'steel','steep','steer','stern','stick','stiff','still','sting','stint',
  'stomp','store','storm','story','stout','style','sugar','suite','sulky',
  'sunny','super','surge','swift','stoic','syrup','table','talon','tangy',
  'taunt','thorn','thumb','tiger','tired','title','torch','touch','towel',
  'toxic','trace','trade','trail','trait','tramp','trash','tread','trend',
  'trial','trick','trout','tunic','ulcer','ultra','unify','union','unite',
  'unity','until','upper','upset','urban','usage','usher','vague','valid',
  'valor','vapor','vault','verse','viola','visit','visor','vital','vivid',
  'vocal','voice','voter','vouch','wagon','waist','weary','weave','wedge',
  'weird','wield','windy','witch','woman','women','world','wreck','wrong',
  'yacht','youth','zebra',

  // 6-letter
  'absorb','accent','accept','across','actual','almost','always','amount',
  'appear','around','artist','assent','assist','attain','avenge','banish',
  'battle','beware','blight','border','breach','bright','bundle','carton',
  'castle','casual','cattle','center','change','choose','church','circle',
  'cipher','clamor','cobalt','coffin','column','combat','coming','corner',
  'costly','cotton','coyote','crafts','create','crisis','critic','custom',
  'danger','daring','deadly','debate','defeat','delete','design','devout',
  'dinner','dollar','dynamo','easily','eating','either','empire','enable',
  'encode','entire','escape','events','excite','expand','expect','export',
  'fairly','fallen','famous','fathom','feline','filter','flavor','frozen',
  'gallop','gamble','garden','garlic','gather','gentle','global','govern',
  'guitar','handle','harbor','hardly','helmet','herbal','import','insane',
  'intent','invent','joined','joyful','jungle','launch','lawful','layout',
  'leader','lethal','limber','lively','lonely','losing','loosen','murder',
  'muscle','mutton','narrow','nature','noodle','normal','notice','notion',
  'object','obtain','office','oppose','orange','outlaw','pardon','parrot',
  'patron','piston','plague','planet','player','plenty','pocket','poetry',
  'potent','poster','proven','ransom','reason','rebuff','recent','recipe',
  'reduce','refund','reform','refuse','remote','repair','reside','resign',
  'resist','return','revoke','revolt','ribbon','riddle','robust','rotate',
  'smooth','subtle','survey','system','tangle','tickle','timber','tissue',
  'tongue','update','utmost','virtue','vision','voyage','weapon','wisdom',
  'wonder','yearly','zealot',

  // 7-letter
  'abandon','absence','account','advance','adverse','afflict','against',
  'algebra','ancient','another','anxiety','anxious','applied','archery',
  'archive','arrange','arsenal','article','assault','balance','bandage',
  'benefit','beneath','blossom','captain','capture','certain','chapter',
  'charity','chicken','colonel','comfort','command','compact','complex',
  'comrade','connect','consult','contain','content','contest','control',
  'convert','corrupt','courage','crystal','culture','curious','dealing',
  'declare','despair','destroy','develop','devoted','diamond','digital',
  'discord','discuss','disease','distant','divided','earnest','emotion',
  'empower','enforce','enhance','feature','fervent','fortune','forward',
  'gallery','general','glimpse','goodbye','harmony','healing','history',
  'hostile','however','imagine','improve','intense','journey','justice',
  'kingdom','knowing','largest','linking','listing','logical','mystery',
  'network','nothing','obvious','offered','ongoing','opinion','partial',
  'partner','pattern','perform','picture','popular','present','prevent',
  'process','produce','provide','reality','refusal','removal','replace',
  'request','respond','results','royalty','roughly','scandal','science',
  'several','showing','similar','soldier','someone','student','subject',
  'succeed','success','suppose','surface','survive','teacher','testing',
  'through','tonight','traffic','triumph','trouble','typical','unknown',
  'unusual','victory','village','whereas','whether','willing','witness',
  'working','writing','younger','zealous',

  // 8-letter
  'absolute','accepted','accurate','achieved','acquired','adjacent',
  'advanced','although','ambition','analysis','announce','apparent',
  'approach','approval','argument','arranged','assemble','balanced',
  'believed','blessing','boundary','business','calendar','children',
  'claiming','complete','composed','consider','creative','criminal',
  'decisive','departed','describe','distinct','document','dominant',
  'educated','emerging','emphasis','enrolled','evaluate','exchange',
  'existing','faithful','familiar','featured','floating','followed',
  'gathered','generate','glorious','graceful','grateful','grievous',
  'guardian','happened','historic','identify','imagined','improved',
  'included','informed','inspired','interest','involved','isolated',
  'judgment','leverage','manifest','measured','medieval','minister',
  'moderate','national','numerous','observed','obtained','official',
  'opponent','optimize','organize','original','outbreak','overcome',
  'patience','peaceful','powerful','precious','prepared','presence',
  'previous','priority','progress','promised','property','proposed',
  'purchase','realized','recently','rejected','released','relevant',
  'reliable','remained','repeated','required','reserved','resident',
  'resolved','returned','revealed','rewarded','romantic','scattered',
  'selected','separate','sequence','shortage','situated','somewhat',
  'specific','standing','sterling','storming','strategy','strength',
  'struggle','suburban','survived','talented','teaching','thousand',
  'together','touching','transfer','ultimate','uncommon','unveiled',
  'valuable','variable','virtuous','visiting','watching','welcomed',
]);
/* eslint-enable */

// ─── Scoring ──────────────────────────────────────────────────────────────────

function calcScore(word) {
  return word.length ** 2;
}

// ─── Payout calculator ────────────────────────────────────────────────────────

function calcPayouts(playerA, playerB, scoreA, scoreB) {
  const pool   = ENTRY_USD * 2;
  const rake   = +(pool * RAKE_RATE).toFixed(2);
  const prize  = +(pool - rake).toFixed(2);

  if (scoreA === scoreB) {
    // Draw: full refund, no rake
    return {
      winner: null,
      rake: 0,
      payouts: { [playerA]: ENTRY_USD, [playerB]: ENTRY_USD },
    };
  }

  const winner = scoreA > scoreB ? playerA : playerB;
  return {
    winner,
    rake,
    payouts: { [winner]: prize, [winner === playerA ? playerB : playerA]: 0 },
  };
}

// ─── Match state factory ──────────────────────────────────────────────────────

function createMatch(socketA, socketB) {
  const seed    = Date.now() & 0x7fff_ffff;   // 31-bit seed from wall clock
  const grid    = generateGrid(seed);
  const startTs = Date.now() + 1_000;         // 1s grace for clients to render
  const endTs   = startTs + ROUND_DURATION_MS;

  return {
    id:      `${socketA.id}:${socketB.id}`,
    players: [socketA, socketB],
    grid,
    seed,
    startTs,
    endTs,
    scores:      { [socketA.id]: 0, [socketB.id]: 0 },
    foundWords:  { [socketA.id]: new Set(), [socketB.id]: new Set() },
    submissionCount: { [socketA.id]: 0, [socketB.id]: 0 },
    timer:   null,
    ended:   false,
  };
}

// ─── Match end handler ────────────────────────────────────────────────────────

function endMatch(match) {
  if (match.ended) return;
  match.ended = true;
  clearTimeout(match.timer);
  matches.delete(match.id);

  const [a, b]  = match.players;
  const scoreA  = match.scores[a.id];
  const scoreB  = match.scores[b.id];
  const result  = calcPayouts(a.id, b.id, scoreA, scoreB);

  // Log financials to console (stub — replace with real wallet calls)
  console.log('\n────────────────────────────────────────');
  console.log(`MATCH OVER  [${match.id}]`);
  console.log(`  Scores  :  ${a.id.slice(0,8)}=${scoreA}  ${b.id.slice(0,8)}=${scoreB}`);
  if (result.winner) {
    console.log(`  Winner  :  ${result.winner.slice(0,8)}`);
    console.log(`  Prize   :  $${result.payouts[result.winner].toFixed(2)}  (rake $${result.rake.toFixed(2)})`);
    console.log(`  Loser   :  $0.00`);
  } else {
    console.log(`  Result  :  DRAW — full refund $${ENTRY_USD.toFixed(2)} each (rake $0.00)`);
  }
  console.log('────────────────────────────────────────\n');

  const payload = {
    winner:  result.winner,
    scores:  match.scores,
    payouts: result.payouts,
    rake:    result.rake,
    words: {
      [a.id]: [...match.foundWords[a.id]],
      [b.id]: [...match.foundWords[b.id]],
    },
  };

  for (const socket of match.players) {
    if (socket.connected) socket.emit('match_end', payload);
  }
}

// ─── Matchmaking queue ────────────────────────────────────────────────────────

const queue   = [];   // waiting sockets
const matches = new Map();   // matchId → match object

function tryPairPlayers() {
  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    // Skip disconnected sockets
    if (!a.connected && !b.connected) continue;
    if (!a.connected) { queue.unshift(b); continue; }
    if (!b.connected) { queue.unshift(a); continue; }

    const match = createMatch(a, b);

    // Register match for each socket
    a.data.matchId = match.id;
    b.data.matchId = match.id;
    matches.set(match.id, match);

    console.log(`[MATCH] ${a.id.slice(0,8)} vs ${b.id.slice(0,8)}  seed=${match.seed}`);
    console.log(`[GRID ] ${match.grid.map(r => r.join(' ')).join(' | ')}`);

    // Notify both players
    for (const [socket, opponent] of [[a, b], [b, a]]) {
      socket.emit('match_start', {
        matchId:    match.id,
        grid:       match.grid,
        seed:       match.seed,
        startTs:    match.startTs,
        endTs:      match.endTs,
        opponentId: opponent.id,
      });
    }

    // Server-authoritative timer
    const delay = match.startTs - Date.now();
    match.timer = setTimeout(() => endMatch(match), delay + ROUND_DURATION_MS);
  }
}

// ─── Word submission handler ──────────────────────────────────────────────────

function handleSubmit(socket, rawWord) {
  const matchId = socket.data.matchId;
  const match   = matchId ? matches.get(matchId) : null;

  if (!match) {
    return socket.emit('error', { message: 'No active match.' });
  }
  if (match.ended || Date.now() >= match.endTs) {
    return socket.emit('error', { message: 'Round has ended.' });
  }

  const pid = socket.id;

  // ── Rate limit ──
  if (match.submissionCount[pid] >= MAX_SUBMISSIONS) {
    socket.emit('word_result', {
      word:         rawWord,
      valid:        false,
      reason:       'RATE_LIMITED',
      score:        0,
      runningScore: match.scores[pid],
    });
    console.log(`[RATE_LIMIT] ${pid.slice(0,8)} – ${rawWord}`);
    return;
  }
  match.submissionCount[pid]++;

  const word = rawWord.trim().toUpperCase();

  // ── Minimum length ──
  if (word.length < 3) {
    return socket.emit('word_result', {
      word, valid: false, reason: 'TOO_SHORT', score: 0,
      runningScore: match.scores[pid],
    });
  }

  // ── Dictionary check ──
  if (!DICTIONARY.has(word.toLowerCase())) {
    socket.emit('word_result', {
      word, valid: false, reason: 'NOT_IN_DICTIONARY', score: 0,
      runningScore: match.scores[pid],
    });
    console.log(`[INVALID] ${pid.slice(0,8)} – ${word} (not in dictionary)`);
    return;
  }

  // ── Grid adjacency check ──
  if (!wordExistsOnGrid(match.grid, word)) {
    socket.emit('word_result', {
      word, valid: false, reason: 'NOT_ON_GRID', score: 0,
      runningScore: match.scores[pid],
    });
    console.log(`[INVALID] ${pid.slice(0,8)} – ${word} (not on grid)`);
    return;
  }

  // ── Duplicate check ──
  if (match.foundWords[pid].has(word)) {
    socket.emit('word_result', {
      word, valid: false, reason: 'ALREADY_SCORED', score: 0,
      runningScore: match.scores[pid],
    });
    return;
  }

  // ── Accept ──
  const score = calcScore(word);
  match.foundWords[pid].add(word);
  match.scores[pid] += score;

  socket.emit('word_result', {
    word, valid: true, reason: 'OK', score,
    runningScore: match.scores[pid],
  });
  console.log(`[WORD] ${pid.slice(0,8)} – ${word} (+${score} → ${match.scores[pid]})`);
}

// ─── Server bootstrap ─────────────────────────────────────────────────────────

const httpServer = http.createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
  connectionStateRecovery: { maxDisconnectionDuration: 30_000 },
});

io.on('connection', (socket) => {
  console.log(`[+] ${socket.id.slice(0,8)} connected`);

  socket.on('join_queue', () => {
    // Guard: already queued or in a match
    if (queue.includes(socket)) {
      return socket.emit('error', { message: 'Already in queue.' });
    }
    if (socket.data.matchId && matches.has(socket.data.matchId)) {
      return socket.emit('error', { message: 'Already in a match.' });
    }

    queue.push(socket);
    socket.emit('queued', { position: queue.length });
    console.log(`[QUEUE] ${socket.id.slice(0,8)} joined (queue length: ${queue.length})`);
    tryPairPlayers();
  });

  socket.on('submit_word', ({ word } = {}) => {
    if (typeof word !== 'string' || word.length === 0) {
      return socket.emit('error', { message: 'Invalid submission.' });
    }
    handleSubmit(socket, word);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[-] ${socket.id.slice(0,8)} disconnected (${reason})`);

    // Remove from queue if waiting
    const qi = queue.indexOf(socket);
    if (qi !== -1) queue.splice(qi, 1);

    // Forfeit active match
    const match = socket.data.matchId ? matches.get(socket.data.matchId) : null;
    if (match && !match.ended) {
      console.log(`[FORFEIT] ${socket.id.slice(0,8)} disconnected mid-match`);
      // Give opponent 30s to reconnect; for simplicity end immediately
      endMatch(match);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\nWord Duel server listening on port ${PORT}`);
  console.log(`  ROUND_DURATION : ${ROUND_DURATION_MS / 1000}s`);
  console.log(`  ENTRY_FEE      : $${ENTRY_USD.toFixed(2)}`);
  console.log(`  RAKE           : ${RAKE_RATE * 100}%`);
  console.log(`  MAX_SUBMISSIONS: ${MAX_SUBMISSIONS} per round\n`);
});
