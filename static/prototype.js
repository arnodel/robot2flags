//
// Additions to the Object prototype
//

Object.prototype.contains = function (key) {
    return this.hasOwnProperty(key);
};

Object.prototype.specialise = function (spec) {
    function F () {}
    F.prototype = this;
    var obj = new F()
    if (spec) {
	for (prop in spec) {
	    if (spec.hasOwnProperty(prop)) {
		obj[prop] = spec[prop];
	    }
	}
    }
    // Add __proto__ property as it is not standard
    if (!obj.hasOwnProperty("__proto__")) {
	obj.__proto__ = this;
    }
    return obj;
};

Object.prototype.bind = function (prop) {
    var self = this;
    var method = this[prop];
    return function () {
	return method.apply(self, arguments);
    };
};

Object.prototype.loopItems = function(action, defaultResult) {
    var key, result;
    for (key in this) {
        if (this.hasOwnProperty(key)) {
	    result = action(key, this[key]);
	    if (result !== undefined) {
		return result;
	    }
	}
    }
    return defaultResult;
};

Object.prototype.setDefault = function(key, value) {
    if (!this.hasOwnProperty(key)) {
	this[key] = value;
    }
    return this[key];
};

Object.prototype.getOwn = function(key, defaultValue) {
    if (this.hasOwnProperty(key)) {
	return this[key];
    }
    else {
	return defaultValue;
    }
};

Object.prototype.update = function (obj) {
    var self = this;
    obj.loopItems(function (key, val) {
	self[key] = val;
    });
    return this;
};

//
// Additions to the Function prototype
//

Function.prototype.bind = function(obj) {
    var f = this;
    return function () {
	return f.apply(obj, arguments);
    };
};

//
// Additions to the Array prototype
//

Array.prototype.loop = function(action) {
    var i;
    for (i = 0; i < this.length; i++) {
	action(this[i], i);
    }
    return this;
};

Array.prototype.filter = function (test) {
    var i, item, newArray = [];
    for (i = 0; i < this.length; i++) {
	item = this[i];
	if (test(item)) {
	    newArray.push(item);
	}
    }
    return newArray;
};

Array.prototype.findFirst = function (test) {
    var i, item;
    for (i = 0; i < this.length; i++) {
	item = this[i];
	if (test(item)) {
	    return item;
	}
    }
};

Array.prototype.indexOf = function (obj) {
    for (i = 0; i < this.length; i++) {
	if (obj === this[i]) {
	    return i
	}
    }
    return -1;
};

Array.prototype.map = function(f) {
    var i;
    var mapped = [];
    for (i = 0; i < this.length; i++) {
	mapped.push(f(this[i]));
    }
    return mapped;
};
