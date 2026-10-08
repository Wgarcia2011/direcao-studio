export type Word = {s: number; e: number; w: string};
export type MotionAsset = {kind: 'image' | 'video'; url: string};
export type MotionScene = {
  id: string; kind: 'layout' | 'element'; start: number; duration: number;
  startFrame: number; durationInFrames: number; layout: string; effect: string;
  text: string; items: string[]; item_times: number[]; asset: string;
  required: boolean; fit: 'cover' | 'contain'; focusX: number; focusY: number;
  x: number; y: number; size: number; scale: number; intensity: string; caption: string;
  preset?: string; accent?: string; accent2?: string;
  box_width?: number; labels?: string[];
  presenter_width?: number;
  hold_layout?: boolean; eyebrow?: string;
};
export type MotionCaptions = {
  enabled: boolean; preset: string; accent: string; size: number;
  position: string; words: number;
};
export type MotionDocument = {
  scenes: MotionScene[]; assets: Record<string, MotionAsset>;
  captions: MotionCaptions; words: Word[]; revision: number;
};
