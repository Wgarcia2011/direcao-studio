const path = require('node:path');
require('esbuild').build({entryPoints:[path.join(__dirname,'src/Player.tsx')],bundle:true,minify:true,format:'iife',outfile:path.join(__dirname,'../../..','central/motion-player.js')}).catch(error=>{console.error(error);process.exitCode=1;});
