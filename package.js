Package.describe({
  name: 'jeanfredrik:reactive-sort-specifier',
  version: '0.1.2',
  summary: 'Create sort specifiers for your collection.find calls that are reactive and easy to manipulate',
  git: 'https://github.com/jeanfredrik/meteor-reactive-sort-specifier',
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.1.0.2');

  // Client dependencies
  api.use([
    'underscore',
    'tracker',
    'check'
  ], 'client');

  api.addFiles('reactive-sort-specifier-client.js', 'client');

  api.export('SortSpecifier', 'client');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('jeanfredrik:reactive-sort-specifier');
  api.addFiles('reactive-sort-specifier-tests-client.js', 'client');
});
