#!/usr/bin/env node

/**
 * Pre-deployment check script for EtherFlow
 * Verifies the project is ready for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 EtherFlow Deployment Check\n');

// Check required files
const requiredFiles = [
  'package.json',
  'vercel.json',
  '.env.example',
  'DEPLOYMENT.md'
];

console.log('📁 Checking required files...');
let filesOk = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing!`);
    filesOk = false;
  }
});

// Check .gitignore contains .env
console.log('\n🔒 Checking .gitignore...');
if (fs.existsSync('.gitignore')) {
  const gitignore = fs.readFileSync('.gitignore', 'utf8');
  if (gitignore.includes('.env')) {
    console.log('✅ .env is properly ignored');
  } else {
    console.log('❌ .env should be in .gitignore');
    filesOk = false;
  }
} else {
  console.log('❌ .gitignore file missing');
  filesOk = false;
}

// Check package.json has vercel-build script
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (packageJson.scripts && packageJson.scripts['vercel-build']) {
  console.log('✅ vercel-build script present');
} else {
  console.log('❌ vercel-build script missing');
  filesOk = false;
}

// Check if .env exists (should NOT be committed)
console.log('\n🔑 Checking environment setup...');
if (fs.existsSync('.env')) {
  console.log('⚠️  .env file exists locally (good for development)');
  console.log('   Make sure it\'s in .gitignore and not committed!');
} else {
  console.log('ℹ️  No .env file (you\'ll need to set environment variables in Vercel)');
}

// Summary
console.log('\n' + '='.repeat(50));
if (filesOk) {
  console.log('🎉 Ready for deployment!');
  console.log('\nNext steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Connect to Vercel');
  console.log('3. Set REACT_APP_ALCHEMY_API_KEY in Vercel environment variables');
  console.log('4. Deploy!');
  console.log('\nSee DEPLOYMENT.md for detailed instructions.');
} else {
  console.log('❌ Fix the issues above before deploying');
}
console.log('='.repeat(50));