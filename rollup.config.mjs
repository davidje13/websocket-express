export default {
  input: 'src/index.mjs',
  output: [
    { file: 'build/index.js', format: 'cjs' },
    { file: 'build/index.mjs', format: 'esm' },
  ],
  external: ['node:http', 'express', 'ws'],
};
