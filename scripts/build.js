/**
 * Production build script for Pulse Wellness Tracker
 * Minifies JS and CSS, outputs to dist/
 */
const fs = require('fs');
const path = require('path');
const { minify } = require('terser');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

async function build() {
  console.log('🔨 Building Pulse for production...\n');

  // 1. Minify JS
  const jsSrc = fs.readFileSync(path.join(ROOT, 'js', 'pulse.js'), 'utf8');
  const jsResult = await minify(jsSrc, {
    compress: {
      drop_console: false,  // keep console.warn for chart errors
      drop_debugger: true,
      passes: 2
    },
    mangle: true,
    output: { comments: false }
  });
  const jsOutPath = path.join(DIST, 'js', 'pulse.min.js');
  fs.mkdirSync(path.dirname(jsOutPath), { recursive: true });
  fs.writeFileSync(jsOutPath, jsResult.code);
  console.log(`  ✓ JS  → dist/js/pulse.min.js  (${(jsResult.code.length / 1024).toFixed(1)} KB)`);

  // Copy Chart.js as-is (already minified)
  const chartSrc = path.join(ROOT, 'js', 'chart.umd.min.js');
  if (fs.existsSync(chartSrc)) {
    fs.copyFileSync(chartSrc, path.join(DIST, 'js', 'chart.umd.min.js'));
    console.log(`  ✓ JS  → dist/js/chart.umd.min.js (copied)`);
  }

  // 2. Minify HTML (includes inline CSS)
  const htmlSrc = fs.readFileSync(path.join(ROOT, 'wellness-tracker.html'), 'utf8');
  const htmlMinified = await minifyHTML(htmlSrc, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: {
      level: 2
    },
    minifyJS: {
      compress: { drop_console: false, drop_debugger: true },
      mangle: true
    }
  });
  // Replace external script references with minified versions
  const htmlOut = htmlMinified
    .replace(/src="js\/pulse\.js"/g, 'src="js/pulse.min.js"');
  fs.writeFileSync(path.join(DIST, 'wellness-tracker.html'), htmlOut);
  console.log(`  ✓ HTML → dist/wellness-tracker.html  (${(htmlOut.length / 1024).toFixed(1)} KB)`);

  // 3. Copy assets that don't need minification
  const assets = [
    { src: 'manifest.json', dest: 'manifest.json' },
    { src: 'sw.js', dest: 'sw.js' },
    { src: 'Daily_Wellness_Tracker (1).xlsx', dest: 'Daily_Wellness_Tracker (1).xlsx' }
  ];
  for (const { src, dest } of assets) {
    const srcPath = path.join(ROOT, src);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(DIST, dest));
      console.log(`  ✓ Copy → dist/${dest}`);
    }
  }

  // 4. Copy backend folder
  const backendDir = path.join(ROOT, 'backend');
  if (fs.existsSync(backendDir)) {
    const destBackend = path.join(DIST, 'backend');
    fs.mkdirSync(destBackend, { recursive: true });
    for (const file of fs.readdirSync(backendDir)) {
      fs.copyFileSync(path.join(backendDir, file), path.join(destBackend, file));
    }
    console.log(`  ✓ Copy → dist/backend/`);
  }

  console.log('\n✅ Build complete! Output in dist/\n');
  console.log('To preview: npx serve dist -l 3000');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
