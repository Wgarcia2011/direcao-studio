// Contraste Cinético — tipos das props (Pin 15551561209923797).
// Todos os tempos são segundos do vídeo preparado (o corte), não da amostra.

export type Token = {w: string; s: number; key?: boolean; size?: number};

export type Line = {
  tokens: Token[];
  align?: 'left' | 'center' | 'right';
  dx?: number;
  size?: number;
  until?: number;
};

export type Mark = 'check' | 'x' | 'dot';

export type SceneObject = {
  sides?: [string, string];
  label?: string;
  kind: 'gabarito' | 'pin' | 'persona' | 'rank' | 'crowd' | 'stamp' | 'png' | 'pip' | 'logo' | 'debate' | 'microphone' | 'claim';
  at: number;
  until?: number;
  x: number;
  y: number;
  size: number;
  rot?: number;
  // gabarito
  fillAt?: number;
  tearAt?: number;
  tearAmount?: number;
  mendAt?: number;
  // pin
  title?: string;
  tone?: 'gray' | 'paper';
  items?: {at: number; text: string; mark?: Mark}[];
  // persona
  head?: Line[];
  // rank / stamp
  text?: string;
  // crowd
  highlightAt?: number;
  // png / logo / pip (src = vídeo preparado)
  src?: string;
  negative?: boolean;
  write?: boolean;
  // pip: altura da moldura, forma e ponto do rosto no quadro de origem (0–1)
  h?: number;
  shape?: 'round' | 'circle';
  fx?: number;
  fy?: number;
  zoom?: number;
};

export type Scene = {
  from: number;
  to: number;
  bg: 'paper' | 'night';
  arc?: boolean;
  grid?: boolean;
  deco?: boolean;
  textX?: number;
  textY?: number;
  enter?: 'cut' | 'fade' | 'white' | 'reveal';
  exit?: 'cut' | 'iris' | 'tilt' | 'dip' | 'circle' | 'flash';
  shakeAt?: number[];
  lines: Line[];
  objects: SceneObject[];
};

export type Caption = {s: number; e: number; tokens: Token[]};

export type Palette = {
  paper: string;
  ink: string;
  accent: string;
  muted: string;
  night: string;
  arc: string;
  pink: string;
  // Destaque no fundo claro (cor do texto); a sombra deslocada usa accent.
  navy?: string;
};

export type ContrasteProps = {
  video: string;
  audio: string;
  duration: number;
  videoEnd: number;
  previewFrom: number;
  previewDuration: number;
  speakerX: number;
  palette: Palette;
  fonts: {regular: string; bold: string};
  brand?: string;
  scenes: Scene[];
  captions: Caption[];
  captionY: number;
  punches: {at: number; dur: number; scale: number}[];
};
