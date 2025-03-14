/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
module.exports = {
  preset: '@kbn/test',
  rootDir: '../../../..',
  /** all nested directories have their own Jest config file */
  testMatch: ['<rootDir>/x-pack/plugins/ess_security/public/**/*.test.{js,mjs,ts,tsx}'],
  roots: ['<rootDir>/x-pack/plugins/ess_security/public'],
  coverageDirectory: '<rootDir>/target/kibana-coverage/jest/x-pack/plugins/ess_security/public',
  coverageReporters: ['text', 'html'],
  collectCoverageFrom: [
    '<rootDir>/x-pack/plugins/ess_security/public/**/*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/ess_security/public/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/ess_security/public/{__test__,__snapshots__,__examples__,*mock*,tests,test_helpers,integration_tests,types}/**/*',
    '!<rootDir>/x-pack/plugins/ess_security/public/*mock*.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/ess_security/public/*.test.{ts,tsx}',
    '!<rootDir>/x-pack/plugins/ess_security/public/*.d.ts',
    '!<rootDir>/x-pack/plugins/ess_security/public/*.config.ts',
    '!<rootDir>/x-pack/plugins/ess_security/public/index.{js,ts,tsx}',
  ],
};
