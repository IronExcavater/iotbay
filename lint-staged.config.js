module.exports = {
    'web/**/*.{ts,tsx,js,jsx}': [
        () => 'npm run -w web eslint:fix',
        () => 'npm run -w web prettier:fix',
        () => 'npm run -w web typecheck',
    ],
    'web/**/*.css': [
        () => 'npm run -w web stylelint:fix',
        () => 'npm run -w web prettier:fix',
    ],
    'api/**/*.py': [() => 'npm run -w api ruff:fix'],
};
