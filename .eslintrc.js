// eslint-disable-next-line import/no-commonjs
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'airbnb-base',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
  ],
  plugins: ['@typescript-eslint', 'prettier', 'jest'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['dist/**/*'],
  overrides: [
    {
      files: ['*.cjs', 'jest.config.js'],
      rules: {
        'import/no-commonjs': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-require': 'off',
        'import/no-dynamic-require': 'off',
      },
    },
    {
      files: ['tests/**/*.ts', 'src/core/native.ts', 'src/index.esm.ts', 'scripts/**/*.js'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      files: ['examples/**/*.js', 'examples/**/*.ts'],
      rules: {
        'import/extensions': 'off',
        'import/no-unresolved': 'off',
      },
    },
  ],
  rules: {
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'never',
        ts: 'never',
      },
    ],
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    'import/no-commonjs': ['error', { allowRequire: true }],
  },
};
