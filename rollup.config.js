import { babel } from '@rollup/plugin-babel';

export default {
  input: 'src/index.mjs',
  output: {
    file: 'build/index.js',
    sourcemap: true,
    format: 'cjs',
  },
  external: ['http', 'express', 'ws'],
  plugins: [
    babel({
      babelHelpers: 'bundled',
      presets: [
        [
          '@babel/preset-env',
          {
            useBuiltIns: false,
            targets: {
              node: '14',
            },
          },
        ],
      ],
    }),
  ],
};
