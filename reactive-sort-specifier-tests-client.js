Tinytest.add('instantiate with fields', function (test) {
  sortSpecifier1 = new SortSpecifier({
  	fields: {
  		'name': 'asc',
  		'createdAt': 'desc',
  		'email': 'asconly',
  		'updatedAt': 'desconly',
  	}
  });
});

Tinytest.add('instantiate with more options', function (test) {
  sortSpecifier2 = new SortSpecifier({
  	fields: {
  		'name': 'asc',
  		'createdAt': 'desc',
  		'email': 'asconly',
  		'updatedAt': 'desconly',
  	},
  	append: 'default',
  	toggleReset: true,
  	defaultSort: {name: 1}
  });
});

Tinytest.add('SortSpecifier.get should be default', function (test) {
  test.equal(sortSpecifier2.get()[0][0], 'name');
  test.equal(sortSpecifier2.get()[0][1], 'asc');
});

Tinytest.add('SortSpecifier.toggle desc field', function (test) {
	sortSpecifier2.toggle('createdAt');
  test.equal(sortSpecifier2.get()[0][0], 'createdAt');
  test.equal(sortSpecifier2.get()[0][1], 'desc');
	sortSpecifier2.toggle('createdAt');
  test.equal(sortSpecifier2.get()[0][0], 'createdAt');
  test.equal(sortSpecifier2.get()[0][1], 'asc');
});

Tinytest.add('SortSpecifier.toggle append="default"', function (test) {
  test.equal(sortSpecifier2.get()[1][0], 'name');
  test.equal(sortSpecifier2.get()[1][1], 'asc');
});

Tinytest.add('SortSpecifier.toggle toggleReset=true', function (test) {
	sortSpecifier2.toggle('createdAt');
  test.equal(sortSpecifier2.get()[0][0], 'name');
  test.equal(sortSpecifier2.get()[0][1], 'asc');
});

Tinytest.add('SortSpecifier.toggle asconly', function (test) {
	sortSpecifier2.toggle('email');
  test.equal(sortSpecifier2.get()[0][0], 'email');
  test.equal(sortSpecifier2.get()[0][1], 'asc');
	sortSpecifier2.toggle('email');
  test.equal(sortSpecifier2.get()[0][0], 'name');
  test.equal(sortSpecifier2.get()[0][1], 'asc');
});

Tinytest.add('SortSpecifier.toggle desconly', function (test) {
	sortSpecifier2.toggle('updatedAt');
  test.equal(sortSpecifier2.get()[0][0], 'updatedAt');
  test.equal(sortSpecifier2.get()[0][1], 'desc');
	sortSpecifier2.toggle('updatedAt');
  test.equal(sortSpecifier2.get()[0][0], 'name');
  test.equal(sortSpecifier2.get()[0][1], 'asc');
});
