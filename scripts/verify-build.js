const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying build...');

const requiredFiles = [
  'dist/server.js',
  'dist/app.js',
  'dist/package.json',
  'dist/src/config/database.js',
  'dist/src/models/Structure.js',
  'dist/src/controllers/structureController.js'
];

let buildValid = true;

requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing file: ${file}`);
    buildValid = false;
  } else {
    console.log(`✅ Found: ${file}`);
  }
});

if (buildValid) {
  console.log('🎉 Build verification successful!');
  process.exit(0);
} else {
  console.error('💥 Build verification failed!');
  process.exit(1);
}