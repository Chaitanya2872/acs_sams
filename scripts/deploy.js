const { exec } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting deployment...');

// Check if build exists
if (!fs.existsSync('dist')) {
  console.error('❌ Build directory not found. Run npm run build first.');
  process.exit(1);
}

// Deploy commands
const deployCommands = [
  'tar -czf sams-api.tar.gz dist/',
  'scp sams-api.tar.gz user@server:/var/www/',
  'ssh user@server "cd /var/www && tar -xzf sams-api.tar.gz && pm2 restart sams-api"'
];

deployCommands.forEach((command, index) => {
  console.log(`📦 Step ${index + 1}: ${command}`);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error in step ${index + 1}:`, error);
      return;
    }
    console.log(`✅ Step ${index + 1} completed`);
  });
});