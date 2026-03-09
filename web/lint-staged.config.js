export default {
    '*.{ts,tsx,js,jsx}': ['eslint --fix', 'prettier -wu'],
    '*.css': ['stylelint --fix', 'prettier -wu'],
    '*': ['prettier -wu', () => 'tsc --noEmit'],
};
