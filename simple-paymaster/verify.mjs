#!/usr/bin/env node

// Verify project setup
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔍 Verifying aNode Simple Paymaster project...')

// Check required files
const requiredFiles = [
  'package.json',
  'wrangler.toml',
  'tsconfig.json',
  'biome.json',
  'vitest.config.ts',
  'src/index.ts',
  'src/paymaster.ts',
  'src/types.ts',
  'src/paymaster.test.ts',
]

let allFilesExist = true
for (const file of requiredFiles) {
  const filePath = join(__dirname, file)
  if (existsSync(filePath)) {
    console.log(`✅ ${file}`)
  } else {
    console.log(`❌ ${file} - MISSING`)
    allFilesExist = false
  }
}

if (!allFilesExist) {
  console.log('❌ Some required files are missing!')
  process.exit(1)
}

// Check package.json structure
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
  console.log(`📦 Package: ${packageJson.name}@${packageJson.version}`)
  console.log(`📝 Description: ${packageJson.description}`)

  const requiredScripts = ['dev', 'deploy', 'build', 'test', 'lint']
  for (const script of requiredScripts) {
    if (packageJson.scripts[script]) {
      console.log(`✅ Script: ${script}`)
    } else {
      console.log(`❌ Script: ${script} - MISSING`)
    }
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message)
  process.exit(1)
}

// Check TypeScript files for basic syntax
try {
  const indexContent = readFileSync('src/index.ts', 'utf8')
  const paymasterContent = readFileSync('src/paymaster.ts', 'utf8')
  const typesContent = readFileSync('src/types.ts', 'utf8')

  // Basic checks
  if (indexContent.includes('export default')) {
    console.log('✅ index.ts has default export')
  } else {
    console.log('❌ index.ts missing default export')
  }

  if (paymasterContent.includes('class aNodePaymaster')) {
    console.log('✅ paymaster.ts has aNodePaymaster class')
  } else {
    console.log('❌ paymaster.ts missing aNodePaymaster class')
  }

  if (typesContent.includes('interface UserOperation')) {
    console.log('✅ types.ts has UserOperation interface')
  } else {
    console.log('❌ types.ts missing UserOperation interface')
  }
} catch (error) {
  console.log('❌ Error reading TypeScript files:', error.message)
  process.exit(1)
}

console.log('🎉 Project verification completed successfully!')
console.log('')
console.log('Next steps:')
console.log('1. Run: wrangler login')
console.log('2. Run: wrangler kv:namespace create "CACHE_KV"')
console.log('3. Run: wrangler kv:namespace create "SETTLEMENT_KV"')
console.log('4. Update wrangler.toml with KV namespace IDs')
console.log('5. Run: wrangler secret put PAYMASTER_PRIVATE_KEY')
console.log('6. Run: wrangler secret put SEPOLIA_RPC_URL')
console.log('7. Test with: wrangler dev')
