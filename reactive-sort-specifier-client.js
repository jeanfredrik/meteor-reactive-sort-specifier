var SEP1 = ',';
var SEP2 = ':';

var changed = function (v) {
  v && v.changed();
};

/*
Turns
	[["a", "asc"], ["b", "desc"]]
into
	"a:asc,b:desc"
*/
var stringify = function(specifier) {
	return _.map(specifier, function(item) {
		return item.join(SEP2);
	}).join(SEP1);
}

/*
Turns
	"a:asc,b:desc"
into
	[["a", "asc"], ["b", "desc"]]
*/
var parse = function(specifier) {
	return _.map(specifier.split(SEP1), function(item) {
		return item.split(SEP2);
	});
}

/*
Turns any of
	[["a", "asc"], ["b", "desc"]]
	["a", ["b", "desc"]]
	{a: 1, b: -1}
into
	[["a", "asc"], ["b", "desc"]]
*/
var normalize = function(specifier) {
	var result;
	if(!_.isArray(specifier)) {
		result = _.map(specifier, function(value, key) {
			return [key, value == -1 ? 'desc' : 'asc'];
		});
	} else {
		result = _.map(specifier, function(value) {
			return _.isString(value) ? [value, 'asc'] : value;
		});
	}
	return result;
}

/**
 * @constructor SortSpecifier
 * @public
 * @param {Object} options Options
 * @param {Object} options.fields A list of fields
 * @param {MongoSortSpecifier} [options.defaultSort] The default sort order
 * @param {Boolean} [options.toggleReset] Whether `toggle()` also should reset the sort order
 * @param {'previous'|'default'|false} [options.append] What to append to the value when calling `toggle()` or `set()`. `false` means nothing.
 */
SortSpecifier = function(options) {
	options = options || {};

	_.defaults(options, SortSpecifier.defaultOptions);

	options.defaultSort = normalize(options.defaultSort);

	check(options, Match.ObjectIncluding({
		fields: Match.ObjectIncluding({}),
		defaultSort: [Match.Any],
		toggleReset: Boolean,
		append: Match.OneOf(String, Boolean),
	}));

	this._append = options.append;
	this._toggleReset = options.toggleReset;

	this._defaultValue = stringify(options.defaultSort);
	this._equalsDeps = {};
	this._valueDep = new Tracker.Dependency();
	this._value = this._defaultValue;

	// Create fields object
	var fields = this._fields = {};
	_.each(options.fields, function(field, name) {
		fields[name] = {};
		var values = fields[name].values = {};
		if(_.isString(field)) {
			if(field == 'asc') {
				fields[name].order = ['asc', 'desc'];
			} else if(field == 'desc') {
				fields[name].order = ['desc', 'asc'];
			} else if(field == 'asconly') {
				fields[name].order = ['asc'];
			} else if(field == 'desconly') {
				fields[name].order = ['desc'];
			}
			if(field !== 'desconly') {
				values.asc = name+SEP2+'asc';
			}
			if(field !== 'asconly') {
				values.desc = name+SEP2+'desc';
			}
		} else if(_.isObject(field)) {
			// Treat {asc: [], desc: []} as {options: {asc: [], desc: []}}
			if(!field.options) field = {options: field};

			// Normalize and stringify `options` and put in `values`
			_.each(field.options, function(value, dir) {
				values[dir] = stringify(normalize(value));
			});

			// Copy `order` if present, or infer from `options`
			fields[name].order = field.order || _.keys(field.options);
		}
	});
}

/**
 * @method sortSpecifier.reset
 * @public
 * @returns {undefined}
 *
 * Resets the value to `defaultSort`
 */
SortSpecifier.prototype.reset = function() {
	this.set(undefined);
}
SortSpecifier.prototype._equals = function(sortSpecifierString) {
	this._ensureValueDep(sortSpecifierString);
	this._equalsDeps[sortSpecifierString].depend();
	return this._value.indexOf(sortSpecifierString) === 0;
}

/**
 * @method sortSpecifier.equals
 * @public
 * @reactive
 * @param {MongoSortSpecifier|String} valueOrField A valid Mongo sort specifier or a field name
 * @param {String} [direction] Combined with a field name, a direction (`'asc'` or `'desc'`) that the field could be sorted in
 * @returns {Boolean}
 *
 * Checks if the value matches a Mongo sort specifier or a field and optional direction
 */
SortSpecifier.prototype.equals = function(field, dir) {
	var self = this;
	if(_.isString(field)) {
		if(dir == undefined) {
			var field = self._fields[field];
			var fieldValues = field && field.values;
			return _.some(fieldValues || [], function(fieldValue) {
				return fieldValue && self._equals(fieldValue);
			});
		} else {
			var field = self._fields[field];
			var fieldValues = field && field.values;
			var fieldValue = fieldValues && fieldValues[dir];
			return fieldValue && self._equals(fieldValue) || false;
		}
	} else {
		return self._equals(stringify(field));
	}
}

/**
 * @method sortSpecifier.toggle
 * @public
 * @param {String} field A field name
 * @returns {undefined}
 *
 * Toggles sort on a specific field
 */
SortSpecifier.prototype.toggle = function(field) {
	var self = this;
	var field = self._fields[field];
	var fieldOrder = field && field.order;
	var fieldValues = field && field.values;
	if(fieldOrder && fieldValues) {
		var currentDir = _.find(fieldOrder, function(dir) {
			var fieldValue = fieldValues[dir];
			return self._value.indexOf(fieldValue) === 0;
		});
		var index = currentDir ? fieldOrder.indexOf(currentDir) : -1;
		var newDir = fieldOrder[index+1];
		if(!newDir && !self._toggleReset) newDir = fieldOrder[0];
		var newValue = newDir && fieldValues[newDir];
		newValue = newValue && parse(newValue);
		self.set(newValue);
	} else {
		console.warn('Could not toggle', field);
	}
}

/**
 * @method sortSpecifier.get
 * @public
 * @reactive
 * @returns {MongoSortSpecifier} A valid Mongo sort specifier that you can use in `collection.find`
 *
 * Returns the current value
 */
SortSpecifier.prototype.get = function() {
	this._valueDep.depend();
	return parse(this._value);
}

/**
 * @method sortSpecifier.set
 * @public
 * @param {MongoSortSpecifier|String} valueOrField A valid Mongo sort specifier or a field name
 * @param {String} [direction] Combined with a field name, a direction (`'asc'` or `'desc'`) that the field could be sorted in
 * @returns {undefined}
 *
 * Sets the value to a Mongo sort specifier or a field and optional direction
 */
SortSpecifier.prototype.set = function(valueOrField, dir) {
	var self = this;
	if(arguments.length == 0) {
		throw new Error('SortSpecifier.set called without arguments')
	}
	if(!valueOrField) {
		var value = self._defaultValue;
	} else if(_.isString(valueOrField)) {
		check(dir, String);
		check(self._fields[valueOrField], Match.Any);
		var value = self._fields[valueOrField].values[dir];
		check(value, String);
	} else {
		var value = normalize(valueOrField);
		var newFields = _.map(value, function(item) {
			return item[0];
		});
		var appendedSpecifier;
		if(self._append == 'previous') {
			appendedSpecifier = parse(self._value);
		} else if(self._append == 'default') {
			appendedSpecifier = parse(self._defaultValue);
		} else {
			appendedSpecifier = [];
		}
		value = value.concat(_.filter(appendedSpecifier, function(item) {
			return !_.contains(newFields, item[0])
		}));
		value = stringify(value);
	}
	if(self._value != value) {
		var oldMatchingValuesWithDeps = self._matchingValuesWithDeps(self._value);
		var newMatchingValuesWithDeps = self._matchingValuesWithDeps(value);
		self._value = value;
		self._valueDep.changed();
		_.each(_.difference(oldMatchingValuesWithDeps, newMatchingValuesWithDeps), function(name) {
			changed(self._equalsDeps[name]);
		});
		_.each(_.difference(newMatchingValuesWithDeps, oldMatchingValuesWithDeps), function(name) {
			changed(self._equalsDeps[name]);
		});
	}
}
SortSpecifier.prototype._ensureValueDep = function(value) {
  if(!(value in this._equalsDeps)) {
  	this._equalsDeps[value] = new Tracker.Dependency;
  }
};
SortSpecifier.prototype._matchingValuesWithDeps = function(value) {
	return _.filter(_.keys(this._equalsDeps), function(name) {
		return value.indexOf(name) === 0;
	});
};

/**
 * @property SortSpecifier.defaultOptions
 * @type {Object}
 * @namespace SortSpecifier
 * @public
 *
 * Used as options if some options are missing when calling `new SortSpecifier(options)`
 */

/**
 * @property SortSpecifier.defaultOptions.defaultSort
 * @type {MongoSortSpecifier}
 * @namespace SortSpecifier
 * @public
 *
 * The default sort order
 */

/**
 * @property SortSpecifier.defaultOptions.toggleReset
 * @type {Boolean}
 * @namespace SortSpecifier
 * @public
 *
 * Whether `toggle()` also should reset the sort order
 */

/**
 * @property SortSpecifier.defaultOptions.append
 * @type {'previous'|'default'|false}
 * @namespace SortSpecifier
 * @public
 *
 * Used as options if some options are missing when calling `new SortSpecifier(options)`
 */

SortSpecifier.defaultOptions = {
	fields: {},
	defaultSort: [],
	toggleReset: true,
	append: 'previous',
}

