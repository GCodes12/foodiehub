import type { ReactNode } from 'react';
import type { ArtSpec, Garnish, PlateItem, Topping } from '../../utils/dishArt.ts';
import { seededRandom } from '../../utils/dishArt.ts';

// Flat, warm illustrations of each dish, drawn as SVG (viewBox 400 × 300, the 4:3 card ratio). They scale to any size
// and are replaced automatically by a real photo when one is added to src/assets/dishes.

type Rand = () => number;
type Pt = [number, number];

const BOWLS = {
  ceramic: { body: ['#fffdf8', '#e8dfd0'], rim: '#f4ede2', band: '#c9a24a' },
  brass: { body: ['#e7b75a', '#a26f1f'], rim: '#d6a447', band: '#f6d58b' },
  clay: { body: ['#c56a3c', '#8a3f1f'], rim: '#a9532c', band: '#e0965f' },
  kadai: { body: ['#4a3a34', '#211814'], rim: '#3a2c27', band: '#6b5850' },
} as const;

/* ---------- small parts ---------- */

function Steam({ xs }: { xs: number[] }) {
  return (
    <g className="art-steam" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.55}>
      {xs.map((x, i) => (
        <path key={x} d={`M${x} ${92 - i * 6} q-12 -14 0 -28 q12 -14 0 -28`} />
      ))}
    </g>
  );
}

function Leaf({ x, y, r, color = '#3f8f3a', size = 1 }: { x: number; y: number; r: number; color?: string; size?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${size})`}>
      <path d="M-11 0 Q0 -10 11 0 Q0 10 -11 0Z" fill={color} />
      <path d="M-9 0 H9" stroke="#2b6a27" strokeWidth={1.2} />
    </g>
  );
}

function Topping({ kind, x, y, r, rand }: { kind: Topping; x: number; y: number; r: number; rand: Rand }) {
  const rot = `translate(${x} ${y}) rotate(${r})`;
  switch (kind) {
    case 'chicken':
      return (
        <g transform={rot}>
          <path d="M-18 2 Q-16 -12 0 -12 Q17 -11 18 1 Q16 12 0 12 Q-15 12 -18 2Z" fill="#a94a1b" />
          <path d="M-9 -5 Q0 -9 9 -5" stroke="#d27a3d" strokeWidth={4} strokeLinecap="round" fill="none" />
          <circle cx={6} cy={4} r={2.4} fill="#6d2b0e" />
        </g>
      );
    case 'chicken65':
      return (
        <g transform={rot}>
          <path d="M-14 0 Q-13 -10 -2 -11 Q12 -12 14 -1 Q15 10 2 11 Q-12 11 -14 0Z" fill="#c2331b" />
          <circle cx={-5} cy={-3} r={2.2} fill="#ff8a5c" />
          <circle cx={5} cy={4} r={2} fill="#7a1a0c" />
        </g>
      );
    case 'tikka':
      return (
        <g transform={rot}>
          <rect x={-14} y={-11} width={28} height={22} rx={6} fill="#d0501f" />
          <path d="M-9 -6 L9 6 M-2 -10 L12 0" stroke="#7a2508" strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case 'mutton':
      return (
        <g transform={rot}>
          <path d="M-17 1 Q-15 -12 0 -12 Q16 -11 17 2 Q15 13 0 12 Q-15 12 -17 1Z" fill="#6b2a14" />
          <path d="M-6 -4 Q2 -8 10 -2" stroke="#9a4a2a" strokeWidth={3} strokeLinecap="round" fill="none" />
          {rand() > 0.5 && <rect x={10} y={-3} width={14} height={6} rx={3} fill="#f3e6d0" />}
        </g>
      );
    case 'egg':
      return (
        <g transform={rot}>
          <ellipse rx={17} ry={12} fill="#fffaf0" stroke="#efe2c8" strokeWidth={1.5} />
          <circle cx={1} cy={0} r={7} fill="#f3a712" />
          <circle cx={-1} cy={-2} r={2.4} fill="#ffd36b" />
        </g>
      );
    case 'paneer':
      return (
        <g transform={rot}>
          <rect x={-12} y={-11} width={24} height={22} rx={3} fill="#fbecc9" stroke="#e5c486" strokeWidth={1.5} />
          <path d="M-8 -4 L6 -4 M-6 4 L8 4" stroke="#b46a22" strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case 'paneerMasala':
      return (
        <g transform={rot}>
          <rect x={-12} y={-11} width={24} height={22} rx={3} fill="#fbecc9" />
          <path d="M-12 -2 Q0 -12 12 -2 V-8 Q12 -11 9 -11 H-9 Q-12 -11 -12 -8Z" fill="#e0662b" />
        </g>
      );
    case 'mushroom':
      return (
        <g transform={rot}>
          <rect x={-4} y={-2} width={8} height={12} rx={3} fill="#efe0c6" />
          <path d="M-15 0 Q-14 -14 0 -14 Q14 -14 15 0Z" fill="#a9774a" />
          <path d="M-9 -6 Q0 -10 9 -6" stroke="#c9996a" strokeWidth={2} fill="none" />
        </g>
      );
    case 'veg':
      return (
        <g transform={rot}>
          <circle cx={-8} cy={0} r={5} fill="#5d9e3f" />
          <circle cx={1} cy={-5} r={4.5} fill="#6fb24c" />
          <rect x={2} y={0} width={13} height={7} rx={2} fill="#ea7a28" />
          <rect x={-14} y={6} width={12} height={5} rx={2} fill="#3e8a3a" />
        </g>
      );
    case 'jamun':
      return (
        <g transform={rot}>
          <circle r={28} fill="#7a2c10" />
          <circle r={28} fill="url(#art-jamun-shine)" />
          <ellipse cx={-9} cy={-11} rx={9} ry={5} fill="#c9693a" opacity={0.7} />
        </g>
      );
    case 'rasmalai':
      return (
        <g transform={rot}>
          <ellipse rx={34} ry={15} fill="#fff8ea" stroke="#d9a441" strokeWidth={3} />
          <ellipse cx={-6} cy={-4} rx={14} ry={5} fill="#fffdf6" />
        </g>
      );
    case 'corn':
      return <circle cx={x} cy={y} r={4.6} fill={rand() > 0.3 ? '#f4c430' : '#e0a21c'} stroke="#c98d12" strokeWidth={0.8} />;
    case 'boondi':
      return <circle cx={x} cy={y} r={4} fill={rand() > 0.5 ? '#e7a23b' : '#d98a26'} />;
    case 'cucumber':
      return (
        <g transform={rot}>
          <circle r={10} fill="#9cc96b" stroke="#4f8a2c" strokeWidth={2.5} />
          <circle r={4} fill="#d9ecbd" />
        </g>
      );
    case 'chilli':
      return (
        <g transform={rot}>
          <path d="M-26 0 Q-10 -9 22 -3 Q26 0 22 3 Q-10 9 -26 0Z" fill="#4f8a2c" />
          <path d="M-26 0 L-32 -4" stroke="#2f6a1c" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
  }
}

function Garnishes({ list, spots, rand }: { list: Garnish[]; spots: Pt[]; rand: Rand }) {
  const out: ReactNode[] = [];
  list.forEach((g, gi) => {
    const n = g === 'lemon' || g === 'butter' ? 1 : g === 'cream' ? 1 : 3;
    for (let i = 0; i < n; i++) {
      const [x, y] = spots[(gi * 3 + i * 2) % spots.length];
      const key = `${g}-${i}`;
      const r = rand() * 360;
      switch (g) {
        case 'mint':
        case 'coriander':
          out.push(<Leaf key={key} x={x} y={y} r={r} size={g === 'coriander' ? 0.8 : 1} color={g === 'mint' ? '#3f8f3a' : '#4c9a32'} />);
          break;
        case 'curryLeaf':
          out.push(<Leaf key={key} x={x} y={y} r={r} size={1.1} color="#2f6a1c" />);
          break;
        case 'onion':
          out.push(<path key={key} d={`M${x - 9} ${y} q9 -9 18 0`} stroke="#8a4a1c" strokeWidth={3.5} strokeLinecap="round" fill="none" />);
          break;
        case 'saffron':
          out.push(<path key={key} d={`M${x - 6} ${y} l12 -3`} stroke="#d1460f" strokeWidth={2} strokeLinecap="round" />);
          break;
        case 'pistachio':
          out.push(<ellipse key={key} cx={x} cy={y} rx={5} ry={2.4} transform={`rotate(${r} ${x} ${y})`} fill="#8bbf4a" />);
          break;
        case 'redChilli':
          out.push(<path key={key} d={`M${x - 10} ${y} q10 -6 20 0`} stroke="#b3200f" strokeWidth={5} strokeLinecap="round" fill="none" />);
          break;
        case 'cream':
          out.push(<path key={key} d={`M${x - 26} ${y} q13 -10 26 0 t26 0 q-10 8 -22 2`} stroke="#fff6e8" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.95} />);
          break;
        case 'butter':
          out.push(<rect key={key} x={x - 9} y={y - 7} width={18} height={14} rx={3} fill="#ffe08a" transform={`rotate(-12 ${x} ${y})`} />);
          break;
        case 'lemon':
          out.push(
            <g key={key} transform={`translate(${x} ${y}) rotate(${r})`}>
              <path d="M-14 0 A14 14 0 0 1 14 0Z" fill="#f6d33c" stroke="#e3b51d" strokeWidth={2} />
              <path d="M0 0 L-8 -8 M0 0 L0 -12 M0 0 L8 -8" stroke="#fff3b0" strokeWidth={1.5} />
            </g>,
          );
          break;
      }
    }
  });
  return <>{out}</>;
}

/** Spread `count` points over an ellipse surface, avoiding the edge. */
function spread(cx: number, cy: number, rx: number, ry: number, count: number, rand: Rand): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.6;
    const dist = 0.35 + rand() * 0.5;
    pts.push([cx + Math.cos(angle) * rx * dist, cy + Math.sin(angle) * ry * dist]);
  }
  return pts;
}

/* ---------- vessels ---------- */

function Handi({ spec, rand }: { spec: ArtSpec; rand: Rand }) {
  const grains: ReactNode[] = [];
  for (let i = 0; i < 70; i++) {
    const t = rand();
    const x = 118 + rand() * 164;
    const top = 180 - 80 * Math.sin(((x - 108) / 184) * Math.PI);
    const y = top + 4 + t * (176 - top);
    const color = ['#fffaf0', '#fbefd6', '#f2a83c', '#e8862a', '#fff4df'][Math.floor(rand() * 5)];
    grains.push(<ellipse key={i} cx={x} cy={y} rx={5} ry={1.9} fill={color} transform={`rotate(${rand() * 180} ${x} ${y})`} />);
  }
  const toppingSpots = spread(200, 148, 66, 20, spec.count ?? 5, rand);
  return (
    <>
      <ellipse cx={200} cy={266} rx={118} ry={13} fill="rgb(60 25 10 / 20%)" />
      <ellipse cx={96} cy={196} rx={10} ry={14} fill="none" stroke="#7d3a14" strokeWidth={6} />
      <ellipse cx={304} cy={196} rx={10} ry={14} fill="none" stroke="#7d3a14" strokeWidth={6} />
      <path d="M100 180 C100 242 140 264 200 264 C260 264 300 242 300 180Z" fill="url(#art-copper)" />
      <path d="M110 206 C150 222 250 222 290 206" stroke="#e8b25a" strokeWidth={6} fill="none" opacity={0.9} />
      <path d="M128 232 C160 244 240 244 272 232" stroke="#e8b25a" strokeWidth={3} fill="none" opacity={0.6} />
      <ellipse cx={200} cy={180} rx={104} ry={22} fill="#a24e1d" />
      <path d="M108 181 C120 124 166 100 200 100 C234 100 280 124 292 181Z" fill={spec.content ? spec.content : 'url(#art-rice)'} />
      {grains}
      {toppingSpots.map(([x, y], i) => (
        <Topping key={i} kind={spec.toppings![i % spec.toppings!.length]} x={x} y={y} r={rand() * 60 - 30} rand={rand} />
      ))}
      <Garnishes list={spec.garnish ?? []} spots={spread(200, 140, 78, 26, 9, rand)} rand={rand} />
    </>
  );
}

function Bowl({ spec, rand }: { spec: ArtSpec; rand: Rand }) {
  const style = BOWLS[spec.bowl ?? 'ceramic'];
  const surface = spec.content ?? '#d98a3a';
  const toppings = spec.toppings ?? [];
  const count = spec.count ?? 5;
  const small = toppings[0] === 'corn' || toppings[0] === 'boondi';
  const spots = toppings[0] === 'jamun' || toppings[0] === 'rasmalai'
    ? ([[172, 168], [230, 172]] as Pt[])
    : spread(200, 172, small ? 86 : 74, small ? 16 : 13, count, rand);
  return (
    <>
      <ellipse cx={200} cy={262} rx={118} ry={13} fill="rgb(60 25 10 / 20%)" />
      <path d="M90 172 C94 238 140 260 200 260 C260 260 306 238 310 172Z" fill={`url(#art-bowl-${spec.bowl ?? 'ceramic'})`} />
      <path d="M104 204 C150 222 250 222 296 204" stroke={style.band} strokeWidth={4} fill="none" opacity={0.85} />
      <ellipse cx={200} cy={172} rx={110} ry={25} fill={style.rim} />
      <ellipse cx={200} cy={174} rx={98} ry={19} fill={surface} />
      <ellipse cx={186} cy={170} rx={54} ry={8} fill="#fff" opacity={0.12} />
      {spots.map(([x, y], i) => (
        <Topping key={i} kind={toppings[i % toppings.length]} x={x} y={y} r={rand() * 50 - 25} rand={rand} />
      ))}
      <Garnishes list={spec.garnish ?? []} spots={spread(200, 172, 80, 13, 9, rand)} rand={rand} />
    </>
  );
}

function Plate({ item, rand, garnish }: { item: PlateItem; rand: Rand; garnish: Garnish[] }) {
  const content: ReactNode[] = [];
  // A skewer from (92, y+8) to (310, y-10) with five pieces along it.
  const skewer = (y: number, piece: (x: number, py: number, i: number) => ReactNode) => (
    <g key={y}>
      <path d={`M92 ${y + 8} L310 ${y - 10}`} stroke="#9a6a35" strokeWidth={4} strokeLinecap="round" />
      {[130, 168, 206, 244, 282].map((x, i) => piece(x, y + 8 - (x - 92) * (18 / 218), i))}
    </g>
  );
  switch (item) {
    case 'tikkaSkewers':
      for (const y of [196, 224]) {
        content.push(skewer(y, (x, py) => <Topping key={x} kind="tikka" x={x} y={py} r={rand() * 20 - 10} rand={rand} />));
      }
      break;
    case 'paneerSkewers':
      for (const y of [196, 224]) {
        content.push(skewer(y, (x, py, i) => (i % 2 === 0
          ? <Topping key={x} kind="paneer" x={x} y={py} r={rand() * 16 - 8} rand={rand} />
          : <rect key={x} x={x - 10} y={py - 10} width={20} height={20} rx={5} fill={i === 1 ? '#d9452b' : '#4f8a2c'}
              transform={`rotate(${rand() * 20 - 10} ${x} ${py})`} />)));
      }
      break;
    case 'seekh':
      for (const [y, d] of [[198, 0], [226, 10]] as const) {
        content.push(
          <g key={y}>
            <path d={`M86 ${y + 6} L316 ${y - 8}`} stroke="#9a6a35" strokeWidth={3} strokeLinecap="round" />
            <path d={`M${120 + d} ${y + 4} L${282 + d} ${y - 6}`} stroke="#7a3518" strokeWidth={24} strokeLinecap="round" />
            {[150, 190, 230, 266].map((x) => (
              <path key={x} d={`M${x + d} ${y - 8} l6 18`} stroke="#4a1f0c" strokeWidth={3} strokeLinecap="round" />
            ))}
          </g>,
        );
      }
      break;
    case 'papad':
      content.push(<ellipse key="p" cx={200} cy={206} rx={118} ry={40} fill="#f0d28f" stroke="#d9b468" strokeWidth={3} />);
      spread(200, 206, 112, 36, 46, rand).forEach(([x, y], i) => {
        content.push(<circle key={i} cx={x} cy={y} r={rand() * 3 + 1.8} fill={rand() > 0.5 ? '#c9984a' : '#fbe7b5'} />);
      });
      break;
    case 'onionRings':
      spread(200, 206, 100, 30, 10, rand).forEach(([x, y], i) => {
        content.push(<ellipse key={i} cx={x} cy={y} rx={24} ry={10} fill="none" stroke={i % 2 ? '#c4457a' : '#e7a0c0'} strokeWidth={4.5}
          transform={`rotate(${rand() * 30 - 15} ${x} ${y})`} />);
      });
      content.push(<path key="c1" d="M140 222 q30 -14 64 -4" stroke="#4f8a2c" strokeWidth={7} strokeLinecap="round" fill="none" />);
      break;
    case 'breadPudding':
      for (const [x, y] of [[150, 196], [208, 188], [262, 200], [182, 220], [240, 224]] as const) {
        content.push(
          <g key={`${x}`} transform={`translate(${x} ${y}) rotate(${rand() * 16 - 8})`}>
            <rect x={-26} y={-18} width={52} height={36} rx={6} fill="#c9741f" />
            <rect x={-22} y={-15} width={44} height={22} rx={5} fill="#e5a24a" />
            <ellipse cx={-6} cy={-8} rx={10} ry={3} fill="#fff" opacity={0.35} />
          </g>,
        );
      }
      break;
  }
  return (
    <>
      <ellipse cx={200} cy={262} rx={150} ry={14} fill="rgb(60 25 10 / 18%)" />
      <ellipse cx={200} cy={212} rx={164} ry={50} fill="#fbf7f0" stroke="#e6dccb" strokeWidth={3} />
      <ellipse cx={200} cy={212} rx={136} ry={38} fill="#f3ebde" />
      {content}
      <Garnishes list={garnish} spots={[[300, 236], [118, 234], [304, 196], [100, 196], [200, 246]]} rand={rand} />
    </>
  );
}

function Glass({ spec, rand }: { spec: ArtSpec; rand: Rand }) {
  const fills = { lassi: '#f8f1df', mango: '#f4ac2f', chaas: '#eef0d8', cola: '#5a2a16' } as const;
  const kind = spec.drink ?? 'lassi';
  const liquid = fills[kind];
  if (spec.vessel === 'drink') {
    return (
      <>
        <ellipse cx={200} cy={264} rx={70} ry={10} fill="rgb(20 30 40 / 22%)" />
        <path d="M150 74 L250 74 L240 258 L160 258Z" fill="#ffffff" opacity={0.35} stroke="#fff" strokeWidth={3} />
        <path d="M156 110 L244 110 L236 252 L164 252Z" fill={liquid} />
        {[[180, 140], [214, 128], [196, 168]].map(([x, y]) => (
          <rect key={x} x={x - 14} y={y - 12} width={28} height={24} rx={6} fill="#ffffff" opacity={0.45} transform={`rotate(${rand() * 30} ${x} ${y})`} />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <circle key={i} cx={170 + rand() * 60} cy={180 + rand() * 66} r={2 + rand() * 2} fill="#fff" opacity={0.5} />
        ))}
        <path d="M222 40 L206 200" stroke="#e87524" strokeWidth={9} strokeLinecap="round" />
        <Garnishes list={['lemon']} spots={[[248, 78]]} rand={rand} />
      </>
    );
  }
  return (
    <>
      <ellipse cx={200} cy={264} rx={70} ry={10} fill="rgb(60 25 10 / 20%)" />
      <path d="M148 70 L252 70 L240 258 L160 258Z" fill="#ffffff" opacity={0.4} stroke="#fff" strokeWidth={3} />
      <path d="M153 96 L247 96 L236 252 L164 252Z" fill={liquid} />
      <ellipse cx={200} cy={96} rx={47} ry={9} fill={kind === 'mango' ? '#f8c766' : '#fffaf0'} />
      <path d="M160 110 L170 246" stroke="#fff" strokeWidth={6} opacity={0.4} strokeLinecap="round" />
      <path d="M226 34 L210 190" stroke="#e87524" strokeWidth={8} strokeLinecap="round" />
      <path d="M224 50 L222 66 M221 82 L219 98" stroke="#fff" strokeWidth={8} />
      {kind === 'mango' && (
        <g transform="translate(250 82) rotate(20)">
          <path d="M-22 0 Q-20 -20 0 -22 Q20 -20 22 0Z" fill="#f7b32b" stroke="#e08e12" strokeWidth={2} />
          <path d="M-14 -4 L14 -4 M-10 -12 L10 -12" stroke="#ffd36b" strokeWidth={2} />
        </g>
      )}
      {kind === 'chaas' && Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={166 + rand() * 66} cy={110 + rand() * 130} r={1.8} fill="#4f8a2c" />
      ))}
      <Garnishes list={spec.garnish ?? []} spots={[[186, 94], [206, 92], [196, 98], [214, 97], [182, 99]]} rand={rand} />
    </>
  );
}

function Kulhad({ spec, rand }: { spec: ArtSpec; rand: Rand }) {
  return (
    <>
      <ellipse cx={200} cy={262} rx={90} ry={12} fill="rgb(60 25 10 / 20%)" />
      <path d="M124 168 C128 236 160 256 200 256 C240 256 272 236 276 168Z" fill="url(#art-bowl-clay)" />
      <ellipse cx={200} cy={168} rx={77} ry={19} fill="#a9532c" />
      <ellipse cx={200} cy={170} rx={68} ry={14} fill={spec.content ?? '#f5ecd6'} />
      <Garnishes list={spec.garnish ?? []} spots={spread(200, 170, 50, 9, 8, rand)} rand={rand} />
    </>
  );
}

function Thali({ spec, rand }: { spec: ArtSpec; rand: Rand }) {
  const katoris = spec.katoris ?? [];
  const positions: Pt[] = [[292, 186], [304, 222], [252, 236], [118, 230]].slice(0, katoris.length) as Pt[];
  const grains: ReactNode[] = [];
  for (let i = 0; i < 46; i++) {
    const x = 118 + rand() * 104;
    const top = 196 - 56 * Math.sin(((x - 110) / 120) * Math.PI);
    const y = top + 4 + rand() * (192 - top);
    grains.push(<ellipse key={i} cx={x} cy={y} rx={4.5} ry={1.7} fill={['#fffaf0', '#f2a83c', '#e8862a', '#fbefd6'][Math.floor(rand() * 4)]}
      transform={`rotate(${rand() * 180} ${x} ${y})`} />);
  }
  return (
    <>
      <ellipse cx={200} cy={264} rx={168} ry={14} fill="rgb(60 25 10 / 20%)" />
      <ellipse cx={200} cy={212} rx={176} ry={54} fill="url(#art-bowl-brass)" />
      <ellipse cx={200} cy={210} rx={160} ry={44} fill="#e8c06e" />
      {spec.mound && (
        <>
          <path d="M108 200 C116 158 146 140 168 140 C194 140 222 158 230 200Z" fill="url(#art-rice)" />
          {grains}
          <Leaf x={150} y={168} r={20} />
          <Leaf x={190} y={160} r={-30} />
        </>
      )}
      {spec.pieces && [[214, 236], [236, 224], [196, 228]].map(([x, y], i) => (
        <Topping key={i} kind={spec.pieces!} x={x} y={y} r={rand() * 40 - 20} rand={rand} />
      ))}
      {positions.map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y + 8} rx={34} ry={12} fill="#a26f1f" />
          <ellipse cx={x} cy={y} rx={34} ry={12} fill="#d6a447" />
          <ellipse cx={x} cy={y + 1} rx={28} ry={8.5} fill={katoris[i]} />
          {katoris[i] === '#a8461c' && <circle cx={x} cy={y} r={7} fill="#7a2c10" />}
        </g>
      ))}
    </>
  );
}

/* ---------- the illustration ---------- */

/** How much each vessel is enlarged to fill the card (wide thalis and tall glasses less). */
const SCALE: Record<ArtSpec['vessel'], number> = { handi: 1.2, bowl: 1.2, plate: 1.12, glass: 1.08, drink: 1.08, kulhad: 1.25, thali: 1.0 };

export function DishArt({ spec, seed, className = '', title }: { spec: ArtSpec; seed: string; className?: string; title?: string }) {
  const rand = seededRandom(seed);
  const bgId = `art-bg-${spec.hue}`;
  const vessel = spec.vessel;
  const steamXs = vessel === 'handi' ? [176, 204, 232] : [184, 216];
  return (
    <svg viewBox="0 0 400 300" className={`dish-art ${className}`} role={title ? 'img' : undefined}
      aria-label={title} aria-hidden={title ? undefined : true} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={bgId} cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor={`hsl(${spec.hue} 70% 94%)`} />
          <stop offset="100%" stopColor={`hsl(${spec.hue} 52% 80%)`} />
        </radialGradient>
        <linearGradient id="art-copper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d47a3a" />
          <stop offset="55%" stopColor="#a9521f" />
          <stop offset="100%" stopColor="#6e2f10" />
        </linearGradient>
        <linearGradient id="art-rice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3b04a" />
          <stop offset="100%" stopColor="#f8e6bd" />
        </linearGradient>
        {Object.entries(BOWLS).map(([name, b]) => (
          <linearGradient key={name} id={`art-bowl-${name}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={b.body[0]} />
            <stop offset="100%" stopColor={b.body[1]} />
          </linearGradient>
        ))}
        <radialGradient id="art-jamun-shine" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#c5602c" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#4a1606" stopOpacity={0.2} />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${bgId})`} />
      <circle cx={200} cy={170} r={128} fill="#fff" opacity={0.2} />
      {/* The food is drawn on a 400 × 300 canvas and enlarged around its centre to fill the card. */}
      <g transform={`translate(200 172) scale(${SCALE[vessel]}) translate(-200 -172)`}>
      {spec.steam && <Steam xs={steamXs} />}
      {vessel === 'handi' && <Handi spec={spec} rand={rand} />}
      {vessel === 'bowl' && <Bowl spec={spec} rand={rand} />}
      {vessel === 'plate' && <Plate item={spec.plate ?? 'papad'} rand={rand} garnish={spec.garnish ?? []} />}
      {(vessel === 'glass' || vessel === 'drink') && <Glass spec={spec} rand={rand} />}
      {vessel === 'kulhad' && <Kulhad spec={spec} rand={rand} />}
      {vessel === 'thali' && <Thali spec={spec} rand={rand} />}
      </g>
    </svg>
  );
}
