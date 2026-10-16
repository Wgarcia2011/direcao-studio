import {staticFile} from 'remotion';

// Logo/foguete da marca sao opcionais: ficam em public local, fora do Git.
const VAZIO='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
export const marca=(src?:string|null)=>src?staticFile(src):VAZIO;
