const path = require('node:path');
const {build} = require('esbuild');
build({entryPoints: [path.join(__dirname, 'src/Player.tsx')], bundle: true,
  outfile: path.join(__dirname, '../public/remotion-player.js'), platform: 'browser',
  format: 'iife', minify: true, sourcemap: false}).catch(error => {
    console.error(error); process.exitCode = 1;
  });
