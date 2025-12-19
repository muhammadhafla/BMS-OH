import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Base JavaScript configuration
  js.configs.recommended,
  
  // Configuration files - disable all TypeScript rules
  {
    files: [
      '**/*.config.{js,ts,cjs,mjs}',
      'webpack.config.js',
      'vite.config.ts',
      'jest.config.cjs',
      '.lintstagedrc.js',
      '.prettierrc.js',
      'tsconfig.json',
      'tsconfig.*.json'
    ],
    languageOptions: {
      globals: {
        // Node.js globals for config files
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    rules: {
      // Disable problematic rules for config files
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/await-thenable': 'off',
      // Allow console in config files
      'no-console': 'off',
    },
  },

  // Main TypeScript source files (React + TypeScript)
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/main.tsx', // Entry point with Vite-specific imports
      'src/vite-env.d.ts', // Vite type definitions
      'src/database/*.ts', // Service files have their own config
      'src/shared/*.ts', // Service files have their own config
    ],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.eslint.json',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        HTMLElement: 'readonly',
        MutationObserver: 'readonly',
        // React globals
        React: 'readonly',
        // Vite globals
        import: 'readonly',
        // Test globals (for test files mixed in src)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      
      // Core ESLint rules
      'prefer-const': 'error',
      'no-var': 'error',
      
      // General ESLint rules
      'no-console': 'warn', // Allow console in development
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-return-assign': 'error',
      'no-param-reassign': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'never'],
      
      // Performance and complexity rules (relaxed)
      'complexity': ['warn', 20], // Increased from 15
      'max-depth': ['warn', 6], // Increased from 4
      'max-lines-per-function': ['warn', 80], // Increased from 50
      'max-params': ['warn', 6], // Increased from 5
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'prefer-promise-reject-errors': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // ES6+ rules
      'prefer-destructuring': ['warn', {
        object: true,
        array: false,
      }],
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      
      // Variable and naming rules
      'camelcase': ['error', { properties: 'never', ignoreDestructuring: false }],
      'one-var': ['error', 'never'],
      'one-var-declaration-per-line': ['error', 'always'],
      
      // Code style preferences - let Prettier handle these
      'indent': 'off',
      'space-before-function-paren': 'off',
      'object-curly-spacing': 'off',
      'array-bracket-spacing': 'off',
      'no-trailing-spaces': 'off',
      'eol-last': 'off',
      'padded-blocks': 'off',
    },
  },

  // JavaScript source files (legacy files)
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        // Same globals as TypeScript files
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        HTMLElement: 'readonly',
        React: 'readonly',
        import: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // Core ESLint rules
      'prefer-const': 'error',
      'no-var': 'error',
      
      // General ESLint rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-return-assign': 'error',
      'no-param-reassign': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'never'],
      
      // Performance and complexity rules (relaxed)
      'complexity': ['warn', 20],
      'max-depth': ['warn', 6],
      'max-lines-per-function': ['warn', 80],
      'max-params': ['warn', 6],
      
      // Best practices
      'eqeqeq': ['error', 'always'],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'prefer-promise-reject-errors': 'error',
      'radix': 'error',
      'yoda': 'error',
      
      // ES6+ rules
      'prefer-destructuring': ['warn', {
        object: true,
        array: false,
      }],
      'prefer-template': 'warn',
      'object-shorthand': 'warn',
      
      // Variable and naming rules
      'camelcase': ['error', { properties: 'never', ignoreDestructuring: false }],
      'one-var': ['error', 'never'],
      'one-var-declaration-per-line': ['error', 'always'],
      
      // Code style preferences - let Prettier handle these
      'indent': 'off',
      'space-before-function-paren': 'off',
      'object-curly-spacing': 'off',
      'array-bracket-spacing': 'off',
      'no-trailing-spaces': 'off',
      'eol-last': 'off',
      'padded-blocks': 'off',
    },
  },

  // Service files configuration (PWA services) - Basic JS linting only
  {
    files: ['src/database/*.js', 'src/shared/*.js'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        HTMLElement: 'readonly',
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        IDBRequest: 'readonly',
        IDBOpenDBRequest: 'readonly',
        IDBKeyRange: 'readonly',
        // React globals
        React: 'readonly',
        // Vite globals
        import: 'readonly',
      },
    },
    rules: {
      // Basic JS rules only - no TypeScript parsing
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-unreachable': 'off',
      'max-lines-per-function': 'off',
      'complexity': 'off',
      'no-undef': 'off', // Disable undefined variable checks for service files
      // Disable all TypeScript rules
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Test files configuration
  {
    files: [
      'src/tests/**/*',
      'src/**/*.{test.ts,test.tsx,spec.ts,spec.tsx}',
      '**/*.{test.ts,test.tsx,spec.ts,spec.tsx}'
    ],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.eslint.json',
      },
      globals: {
        // Browser and test globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        console: 'readonly',
        // Test-specific globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly',
        vitest: 'readonly'
      },
    },
    rules: {
      // Disable problematic TypeScript rules for test files
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/prefer-optional-chain': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      // Allow console in tests
      'no-console': 'off',
      // Relax performance rules for tests
      'complexity': 'off',
      'max-lines-per-function': 'off',
      'max-depth': 'off',
      'max-params': 'off',
      // Allow unused variables in tests
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },

  // Main entry point files
  {
    files: ['src/main/**/*.{ts,tsx,js,jsx}'],
    rules: {
      'no-console': 'off', // Main entry point can have console logs
      '@typescript-eslint/no-var-requires': 'off', // Allow require in electron main
    },
  },

  // Electron main process files
  {
    files: ['src/main/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        // Node.js globals for Electron main process
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        // Electron globals
        electron: 'readonly',
        ipcMain: 'readonly',
        app: 'readonly',
        BrowserWindow: 'readonly',
        dialog: 'readonly',
        Menu: 'readonly',
        shell: 'readonly',
      },
    },
  },

  // Scripts and tools
  {
    files: ['scripts/**/*.{js,ts}'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        exports: 'readonly',
        global: 'readonly',
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        // Node.js modules
        fs: 'readonly',
        path: 'readonly',
        child_process: 'readonly',
      },
    },
    rules: {
      'no-console': 'off', // Allow console in scripts
    },
  },
);
