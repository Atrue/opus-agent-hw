module.exports = {
  root: true,
  extends: ['airbnb'],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  ignorePatterns: ['dist', 'node_modules'],
  settings: {
    // eslint-import-resolver-typescript умеет читать exports-map ESM-пакетов (vite и т.п.)
    'import/resolver': {
      typescript: {},
    },
  },
  overrides: [
    {
      // конфиги сборки легитимно импортируют devDependencies
      files: ['*.config.js', '*.config.cjs', '*.config.mjs', '.eslintrc.cjs'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      // тесты и сетап импортируют devDependencies (vitest, testing-library)
      files: ['**/*.test.js?(x)', 'src/setupTests.js'],
      rules: {
        'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      },
    },
  ],
  rules: {
    // React 17+ JSX transform: import React не нужен
    'react/react-in-jsx-scope': 'off',
  },
};
