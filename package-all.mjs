import { build } from '@modheader/core/tools/extension-builder.js';

build({
  dirs: ['modheader', 'modheader-core'],
  platforms: ['chrome', 'firefox', 'edge']
});
