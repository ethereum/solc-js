{
  // Configuration reference: https://www.typescriptlang.org/tsconfig
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "resolveJsonModule": true,
    // This is needed for backwards-compatibility, to keep imports of the form `wrapper = require('solc/wrapper)`
    // working like they did before the TypeScript migration.
    // TODO: Drop it in the next breaking release.
    "esModuleInterop": true,
    "outDir": "./dist",
    "forceConsistentCasingInFileNames": true,
    // Allow JS must be included to ensure that the built binary is included
    // in the output. This could be copied directly in the future if required.
    "allowJs": true,
    // TODO:
    // In order to gracefully move our project to TypeScript without having
    // TS immediately yell at you, we'll disable strict mode for now.
    "strict": false,
    "noImplicitAny": false
  },
  "include": [
    "**/*.js",
    "**/*.ts",
    "**/*.json"
  ],
  "exclude": [
    "coverage",
    "dist"
  ],
  "ts-node": {
    "transpileOnly": true
  }
}
