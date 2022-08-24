import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import zip from 'rollup-plugin-zip';
import svelte from 'rollup-plugin-svelte';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import cssModules from 'svelte-preprocess-cssmodules';
import copy from 'rollup-plugin-copy';
import { chromeExtension, simpleReloader } from 'rollup-plugin-chrome-extension';
import { emptyDir } from 'rollup-plugin-empty-dir';

const production = process.env.NODE_ENV === 'production';
const URL_BASE = production
  ? 'https://modheader.com'
  : process.env.URL_BASE || 'https://modheader.com';

export default {
  input: 'src/manifest.json',
  output: {
    dir: 'dist',
    format: 'esm'
  },
  plugins: [
    replace({
      preventAssignment: true,
      'process.env.PROFILE_TYPE': JSON.stringify('ModHeader'),
      'process.env.PRODUCT_NAME': JSON.stringify('ModHeader'),
      'process.env.BROWSER': JSON.stringify(process.env.BROWSER),
      'process.env.WEB_DRIVER': JSON.stringify(process.env.WEB_DRIVER),
      'process.env.URL_BASE': JSON.stringify(URL_BASE)
    }),
    copy({
      targets: [
        { src: 'src/images/icon_bw.png', dest: 'dist/images' },
        { src: 'src/images/modresponse.png', dest: 'dist/images' },
        { src: 'src/schema.json', dest: 'dist' }
      ],
      hook: 'writeBundle'
    }),
    chromeExtension({
      extendManifest: (manifest) => {
        if (!production) {
          manifest.externally_connectable.matches.push('*://localhost/*');
        }
        if (process.env.BROWSER === 'firefox') {
          manifest.content_scripts = [
            {
              matches: [production ? 'https://modheader.com/*' : 'http://localhost/*'],
              js: ['js/native-messaging.js']
            }
          ];
          manifest.browser_specific_settings = {
            gecko: {
              id: '{ed630365-1261-4ba9-a676-99963d2b4f54}',
              strict_min_version: '75.0'
            }
          };
        }
        if (process.env.WEB_DRIVER) {
          manifest.web_accessible_resources.push('add.html');
          manifest.web_accessible_resources.push('clear.html');
          manifest.web_accessible_resources.push('load.html');
          if (process.env.BROWSER === 'firefox') {
            manifest.browser_specific_settings = {
              gecko: {
                id: '{a0690929-84ee-447c-b22d-8d7a4451ce5d}',
                strict_min_version: '75.0'
              }
            };
          }
        }
        return manifest;
      }
    }),
    simpleReloader(),
    svelte({
      preprocess: [cssModules()],
      compilerOptions: {
        dev: !production
      },
      emitCss: false
    }),
    resolve({
      browser: true,
      dedupe: ['svelte']
    }),
    commonjs(),
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    // Empties the output dir before a new build
    emptyDir(),
    // If we're building for production, minify
    production && terser(),
    // Outputs a zip file in ./releases
    production && zip({ dir: 'releases' })
  ]
};
