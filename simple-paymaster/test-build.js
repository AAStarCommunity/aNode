#!/usr/bin/env node

// Simple build test script
const { spawn } = require('node:child_process')

console.log('🔨 Testing aNode Simple Paymaster build...')

// Test TypeScript compilation
console.log('📝 Checking TypeScript...')
const tsc = spawn('npx', ['tsc', '--noEmit'], {
  cwd: __dirname,
  stdio: 'inherit',
})

tsc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ TypeScript check passed!')

    // Test linting
    console.log('🔍 Running linter...')
    const biome = spawn('npx', ['biome', 'check', '.'], {
      cwd: __dirname,
      stdio: 'inherit',
    })

    biome.on('close', (lintCode) => {
      if (lintCode === 0) {
        console.log('✅ Linting passed!')
      } else {
        console.log('⚠️ Linting issues found (but continuing...)')
      }

      // Test basic functionality
      console.log('🧪 Running tests...')
      const vitest = spawn('npx', ['vitest', 'run'], {
        cwd: __dirname,
        stdio: 'inherit',
      })

      vitest.on('close', (testCode) => {
        if (testCode === 0) {
          console.log('✅ Tests passed!')
          console.log('🎉 Build test completed successfully!')
        } else {
          console.log('❌ Tests failed')
          process.exit(1)
        }
      })
    })
  } else {
    console.log('❌ TypeScript check failed')
    process.exit(1)
  }
})
