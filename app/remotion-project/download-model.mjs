import {downloadVideoMattingModel} from '@remotion/video-matting';
import {env} from '@huggingface/transformers';
import path from 'node:path';
env.cacheDir=path.resolve(import.meta.dirname,'models');
await downloadVideoMattingModel({model:'modnet'});
console.log('Modelo MODNet disponível localmente');
