module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    'plugin:vue/essential',
    'plugin:vue/strongly-recommended',
    '@vue/standard'
  ],
  parserOptions: {
    ecmaVersion: 6,
    parser: 'babel-eslint',
  },
  rules: {
    indent: ['error', 2],
    quotes: ['error', 'single'],
    'vue/max-attributes-per-line': ['error', {
      singleline: 4,
      multiline: 1
    }],
    'vue/attributes-order': 'error',
    'vue/order-in-components': 'error'
  }
}
