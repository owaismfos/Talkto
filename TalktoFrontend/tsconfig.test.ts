{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "types": ["node"],
    "esModuleInterop": true
  },
  "include": [
    "test.ts",
    "src/utils/encryption.ts"
  ]
}