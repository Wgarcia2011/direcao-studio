import {z} from 'zod';
import defaults from '../../../templates/biblioteca/kinetico-estrategico.template.json';

export const kineticSceneSchema = z.object({
  duration: z.number().min(2).max(30),
  mode: z.enum(['paper', 'accent']),
  art: z.enum(['target', 'cards', 'graph', 'tv', 'orbit']),
  lead: z.string().max(52),
  emphasis: z.string().max(28),
  caption: z.string().max(72),
  asset: z.string(),
  labels: z.array(z.string().max(16)).max(3),
});
export const kineticSchema = z.object({
  paper: z.string(), ink: z.string(), accent: z.string(), secondary: z.string(),
  audio: z.string(), scenes: z.array(kineticSceneSchema).min(1),
});
export type KineticProps = z.infer<typeof kineticSchema>;
export type KineticScene = z.infer<typeof kineticSceneSchema>;
export const kineticDefaults = kineticSchema.parse(defaults);
