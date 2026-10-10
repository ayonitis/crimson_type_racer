function uniqueWords(words: string): string[] {
  return Array.from(new Set(words.trim().split(/\s+/).map((word) => word.toLowerCase())));
}

const COMMON_WORDS = uniqueWords(`
able acid aged also area army away baby back ball band bank base bath bear beat been beer bell belt best bill bird blow blue boat body bomb bond bone book boom born boss both bowl bulk burn bush busy calm came camp card care case cash cast cell chat chip city club coal coat code cold come cook cool copy core cost crew crop dark data date dawn days dead deal dear debt deep desk dial diet disk does done door dose down draw drew drop drug drum dual duke dust duty each earn ease east easy edge else even ever evil exit face fact fair fall farm fast fate fear feed feel feet fell felt file fill film find fine fire firm fish five flat flow food foot ford form four free from fuel fund gain game gate gave gear gene gift girl give glad goal goes gold golf gone good gray grew grow gulf hair half hall hand hang hard harm hate have head heal hear heat held help here hero high hill hire hold hole holy home hope host hour huge hung hunt hurt idea inch into iron item jack jail join jump jury keep kent kept keys kick kill kind king knee knew know lack lady laid lake land lane last late lead left less life lift like line link list live load loan lock logo long look lord lose loss lost love luck made mail main make male many mark mass meal mean meat meet menu mere mile milk mind mine miss mode mood moon more most move much must name navy near neck need news next nice nick nine none nose note okay once only onto open oral over pace pack page paid pain pair palm park part pass past path peak pick pipe plan play plot plug plus poll pool poor port post pull pure push race rail rain rank rare rate read real rear rely rent rest rice rich ride ring rise risk road rock role roof room root rose rule rush safe said sake sale salt same sand save seat seed seek seem seen self sell send sent sets shop shot show shut sick side sign site size skin skip slow snow soft soil sold sole some song soon sort soul spot star stay step stop such suit sure take tale talk tank tape task team tech tell tend term test text than that them then they thin this thus tide time tiny told tone took tool tour town tree trip true tune turn twin type unit upon used user uses vast very view vote wage wait wake walk wall want ward warm wash wave ways weak wear week well went were west what when whoa wide wife wild will wind wine wing wire wise wish with wood word wore work yard yeah year your zero zone
`);

const NATURE_WORDS = uniqueWords(`
acorn algae alpine amber antler arctic aspen autumn bamboo beach beaver berry breeze brook cactus canyon cedar cloud coast comet coral creek creekside cricket daisy desert dune earth ember fern field finch flora forest fossil garden glacier grass gravel grove harbor heron hilltop hollow horizon island jungle lagoon lake leaf ledge lightning linden marsh meadow mist moss mountain ocean orchid pebble pine pollen prairie quartz rain rainbow reef ridge river robin root savanna sea shell shore shrub sky slope smoke snow sparrow spring spruce stone storm stream summit sunset swamp thicket thunder tide timber trail valley vapor vine volcano water wave wetland willow wind winter wood
`);

const SCIENCE_TECH_WORDS = uniqueWords(`
access active adapter agile align analog anchor android aperture applet array ascent assign atomic backup binary biotech buffer cache camera carbon circuit cipher client cloud cluster coding column command compile compute console contact cortex cosmic crypto cursor custom cycle data debug decode deploy design device digital domain driver dynamic editor effect electric element encode energy engine ether event execute export factor fiber filter firewall folder format frame fusion gamma gateway gravity grid handle hash helper hosting hybrid icon image import index input kernel lambda laser launch layout logic macro matrix memory merge method metric micro modem module monitor motion native neural node object opcode optic packet panel parser patch pathing pixel plasma pointer portal process profile program proton proxy pulse python queue radar radio random reactor render repair repeat request response result retina robot router runtime sample scalar schema script search secure segment sensor server signal socket source spark stack state static storage stream string switch syntax system tablet target tensor thread token trace tracker upload vector vertex virtual vision widget wireless
`);

const OBJECT_ACTION_WORDS = uniqueWords(`
adjust admire anchor answer arrive attach balance bargain borrow bounce branch brighten build capture carve charge chase check choose claim clean clear climb close collect color comfort compare compete compose connect cover craft create cross cycle dance decide deliver detach discover divide double drag drive edit elevate enable engage enjoy erase escape expand explore extract finish focus follow gather glide grasp guard guide handle identify ignite improve include inspect inspire install join kindle launch learn level listen manage map measure mend merge mix move navigate notice observe operate order organize paint park pause perform polish prepare press prevent print process produce protect push qualify race react rebuild recall recharge refine reflect release remove render repair replace report reset resolve restore resume retreat review reward rotate save scale scan score search secure select settle share shift signal simplify sketch slide solve sort spawn speed split stack start steer stitch store stream stretch strike study submit support switch target teach test track train travel trigger tune unlock update upgrade verify weave wield write
`);

const PLACES_ABSTRACT_WORDS = uniqueWords(`
academy archive arena atrium avenue balcony bayou border borough bridge campus capital castle center chamber chapel checkpoint district domain embassy estate factory gallery gateway harbor haven highway hostel industry junction kingdom library market metro museum neighborhood network outpost palace passage plaza port quarter region reserve sanctuary sector station suburb terminal theater township tunnel village warehouse workshop zenith ability balance bravery clarity comfort courage curiosity destiny effort empathy fairness focus freedom harmony honesty insight justice kindness legacy liberty memory patience purpose reason respect rhythm spirit strategy triumph unity value wisdom wonder
`);

const CHALLENGE_WORDS = uniqueWords(`
abrupt absorb acclaim account achieve acoustic activate adapter advance advent alert already analysis ancient angular annual anxious aperture approval arrival article artisan assist athlete attempt attitude attract average battery beacon benefit blossom boundary builder capsule caution central channel charter classic climate cluster combine command compact company compare complex compose concept conduct confirm connect consume contour control convert correct culture current custom deadline decimal deliver density detail develop diagram digital diligent discover display distinct dynamic eclipse economy educate efficient elastic element embrace emotion empower endless enhance episode essence estimate evolve example execute explain explore express extreme feature fiction finance flexible formula forward fracture friction frontier function gallery general generate genuine graphic habitat harmony holistic horizon imagine impulse include indicate inspire instant integer interact journey kinetic lantern logical machine magnetic manage manual margin measure mindset minimal mission modern moment monitor natural network neutral notable observe optical organic outcome passion patient pattern perform phrase pioneer planet popular portion precise predict premium prepare present primary process profile project promise protect purpose quality radical random reading reality reason recycle reflect regular related release remain remote render resolve respect respond restore rhythm routine science segment signal similar simplify sincere social solar source special spectrum stable standard storage strategy stretch subject success support surface sustain symbol system talent target tension texture theory thermal toward transit trusted uniform unique utility validate variable version vibrant virtual vision volume warfare welfare wisdom
`);

const CHILL_BASE = [...COMMON_WORDS, ...NATURE_WORDS, ...OBJECT_ACTION_WORDS];
const NORMAL_BASE = [...COMMON_WORDS, ...NATURE_WORDS, ...SCIENCE_TECH_WORDS, ...OBJECT_ACTION_WORDS, ...PLACES_ABSTRACT_WORDS];
const INTENSE_BASE = [...COMMON_WORDS, ...SCIENCE_TECH_WORDS, ...OBJECT_ACTION_WORDS, ...PLACES_ABSTRACT_WORDS, ...CHALLENGE_WORDS];

function pickByLength(list: string[], min: number, max: number): string[] {
  return Array.from(new Set(list.filter((word) => word.length >= min && word.length <= max)));
}

function weightByLength(list: string[], ranges: Array<{ min: number; max: number; copies: number }>): string[] {
  const weighted: string[] = [];
  for (const word of list) {
    let copies = 1;
    for (const range of ranges) {
      if (word.length >= range.min && word.length <= range.max) {
        copies = Math.max(copies, range.copies);
      }
    }
    for (let i = 0; i < copies; i += 1) {
      weighted.push(word);
    }
  }
  return weighted;
}

export const CHILL_WORDS = pickByLength(CHILL_BASE, 2, 5);
export const NORMAL_WORDS = weightByLength(pickByLength(NORMAL_BASE, 3, 8), [
  { min: 5, max: 6, copies: 2 },
  { min: 7, max: 8, copies: 2 },
]);
export const INTENSE_WORDS = weightByLength(pickByLength(INTENSE_BASE, 4, 10), [
  { min: 6, max: 8, copies: 2 },
  { min: 9, max: 10, copies: 3 },
]);