const { build } = require('esbuild');
const { dependencies } = require('./package.json');

const externalDependencies = Object.keys(dependencies || {});

build({
  entryPoints: ['src/**/*.ts'], // Main entry point, imports will be followed
  bundle: true,
  platform: 'node',
  external: ['typeorm', 'reflect-metadata'], // Mark TypeORM as external// Avoid bundling external dependencies
  outdir: 'dist', // Output directory
  sourcemap: true, // Set to true for production
  target: ['es2020'], // JavaScript target
  tsconfig: './tsconfig.json', // TypeScript config
  format: 'cjs',
  // external: ['src/swagger_output.json','swagger-ui-express']                    // CommonJS format
})
  .then(() => {
    console.log('Build finished');
  })
  .catch(() => process.exit(1));
