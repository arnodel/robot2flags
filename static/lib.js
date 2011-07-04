function make_matrix(width, height, value) {
    var i, j, row;
    var mat = [];
    for (j = 0; j < height; j++) {
        row = [];
	for (i = 0; i < width; i++) {
	    row.push(value);
	}
	mat.push(row);
    }
    return mat;
}

function copy_matrix(mat) {
    var i, j, row;
    var mat2 = [];
    for (j = 0; j < mat.length; j++) {
	row = mat[j];
	row2 = [];
	for (i = 0; i < row.length; i++) {
	    row2.push(row[i]);
	}
	mat2.push(row2);
    }
    return mat2;
}

function loop_matrix(mat, action) {
    var i, j, row;
    for (j = 0; j < mat.length; j++) {
	row = mat[j];
	for (i = 0; i < row.length; i++) {
	    action({x:i, y:j}, row[i]);
	}
    }
}

function $(x) {
    if (typeof x === "string") {
	return document.getElementById(x);
    } else {
	return x;
    }
}


var simpleSwitch = function(id) {
    var that = {};
    var el = document.getElementById(id);
    that.switchOn = function() {
	el.style.color = "red";
    };
    that.switchOff = function() {
	el.style.color = "black";
    };
    return that;
};

var canvasSwitch = function(id, draw) {
    var that = {};
    var canvas = $(id);
    var ctx = canvas.getContext("2d");
    var drawSwitch = function(bgcol) {
	ctx.save();
	ctx.fillStyle = bgcol;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.translate(canvas.width/2, canvas.height/2);
	draw(ctx);
	ctx.restore();
    };
    that.switchOn = function() {
	drawSwitch("#CCFFCC");
    };
    that.switchOff = function() {
	drawSwitch("white");
    };
    that.switchOff();
    canvas.style.cursor = "pointer";
    return that;
};

var canvasButton = function(id, draw, action, center) {
    if (center === undefined) {
	center = true;
    };
    var that = {}
    var canvas = $(id);
    var ctx = canvas.getContext("2d");
    var active;
    var drawButton = function(bgcol, draw) {
	ctx.save();
	ctx.fillStyle = bgcol;
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	if (center) {
	    ctx.translate(canvas.width/2, canvas.height/2);
	};
	draw(ctx);
	ctx.restore();
    };
    canvas.addEventListener("click", function(ev) {
	if (active) {
	    action(that);
	};
    }, false);
    that.activate = function() {
	active = true;
	drawButton("white", draw);
    };
    that.deactivate = function() {
	active = false;
	drawButton("#AAAAAA", draw);
    };
    that.customDraw = function(draw) {
	drawButton("white", draw);
    };
    that.activate();
    canvas.style.cursor = "pointer";
    return that;
};

var getEventCoordinates = function (ev) {
    var x, y;
    if (ev.offsetX || ev.offsetX === 0) {
	// IE, Safari, Chrome
	x = ev.offsetX;
	y = ev.offsetY;
    } else if (ev.layerX || ev.layerX === 0) {
	// Firefox
	x = ev.layerX;
	y = ev.layerY;
	for (var el = ev.target; el; el = el.offsetParent) {
	    x -= el.offsetLeft;
	    y -= el.offsetTop;
	}
    } else {
	// Not sure which!
	x = ev.pageX - ev.target.offsetLeft;
	y = ev.pageY - ev.target.offsetTop;
    }
    return {x: x, y: y};
};

var canvasSlide = {
    init: function () {
	var self = this;
	this.ctx = this.canvas.getContext("2d");
	this.setCurVal(this.curVal);
	var ev_handler = function (ev) {
	    if (self.active) {
		var x = getEventCoordinates(ev).x;
		if (handlers[ev.type](x, ev)) {
		    self.setCurVal(self.min + (self.max - self.min)*x/self.canvas.width);
		    self.action(self.curVal);
		}
	    }
	};
	var handlers = {
	    mousedown: function (x) {
		self.mousedown = true;
		return true;
	    },
	    mouseup: function (x) {
		self.mousedown = false;
	    },
	    mousemove: function (x) {
		return self.mousedown;
	    },
	    mouseout: function () {
		self.mousedown = false;
	    },
	    mouseover: function () {
		self.mousedown = false;
	    }
	};
	handlers.loopItems(function (evtype) {
	    self.canvas.addEventListener(evtype, function (ev) {
		ev_handler(ev);
	    }, false);
	});
	this.canvas.style.cursor = "pointer";
	return this;
    },
    setCurVal: function (val) {
	var ratio = (val - this.min) / (this.max - this.min)
	this.curVal = val;
	this.draw(this.ctx, ratio*this.canvas.width);
    }
};

var toolWithWidget = {
    activate: function() {
	this.widget.switchOn();
    },
    deactivate: function() {
	this.widget.switchOff();
    }
};

/*
function clear_selection() {
    if(document.selection && document.selection.empty) {
        document.selection.empty();
    } else if(window.getSelection) {
        var sel = window.getSelection();
        sel.removeAllRanges();
    }
}
*/

function jsonGET(func, obj, callback) {
    function handler() {
        if (this.readyState === 4 && this.status === 200) {
            callback(JSON.parse(this.responseText));
        }
    }
    var client = new XMLHttpRequest();
    client.onreadystatechange = handler;
    args = "func=" + func + "&args=" + escape(JSON.stringify(obj));
    client.open("GET", JSONURL + "?" + args);
    client.send();
    return client;
}

function jsonPOST(func, obj, callback) {
    function handler() {
        if (this.readyState === 4 && this.status === 200) {
           callback(JSON.parse(this.responseText));
        }
    }
    var client = new XMLHttpRequest();
    client.onreadystatechange = handler;
    args = JSON.stringify({func: func, args: obj})
    client.open("POST", JSONURL);
    client.send(args);
    return client;
}


function element(name) {
    var start = "<" + name;
    var end = "</" + name + ">";
    return function() {
        var i = 0;
        var acc = start;
        if (arguments.length && typeof arguments[0] === "object") {
	    arguments[0].loopItems(function(attr, val) {
		acc += ' ' + attr + '="' + val + '"';
	    });
            i = 1;
	}
	acc += ">";
        for (; i < arguments.length; i++) {
            acc += arguments[i];
	}
	acc += end;
	return acc;
    };
}

["TR", "TD", "SPAN"].loop(function(name) {
    window[name] = element(name);
});

["tr", "td", "span"].loop(function(name) {
    window[name] = function() {
	var i, child;
	var el = document.createElement(name);
	if (arguments.length) {
	    arguments[0].loopItems(function(attr, val) {
		el.setAttribute(attr, val);
	    });
	}
	for (i = 1; i < arguments.length; i++) {
	    child = arguments[i];
	    if (typeof child === "string") {
		child = document.createTextNode(child);
	    }
	    el.appendChild(child);
	}
	return el;
    };
});

function showBlock(el) {
    var i;
    for (i = 0; i < arguments.length; i++) {
	$(arguments[i]).style.display = "block";
    }
}

function hideElement() {
    var i;
    for (i = 0; i < arguments.length; i++) {
	$(arguments[i]).style.display = "none";
    }
}

function addClass(el, cls) {
    el = $(el);
    if (el && (" " + el.className + " ").indexOf(" " + cls + " ") < 0) {
	el.className += " " + cls;
    }
}

function removeClass(el, cls) {
    el = $(el);
    if (!el) {
	return;
    }
    var classes = el.className;
    var end_re = new RegExp("^" + cls + " | " + cls + "$", "gi");
    var middle_re = new RegExp(" " + cls + " ", "gi");
    classes = classes.replace(end_re, "").replace(middle_re, " ");
    $(el).className = classes;
}

function jsonget (func, args) {
    return function (callback, callerr) {
	return jsonGET(func, args, function(res) {
	    (res.error ? callerr : callback)(res);
	});
    };
}

function jsonpost (func, args) {
    return function (callback, callerr) {
	return jsonPOST(func, args, function(res) {
	    (res.error ? callerr : callback)(res);
	});
    };
}

var pane = {
    init: function (el) {
	this.el = $(el);
	this.title = this.el.getElementsByClassName("title")[0];
	this.content = this.el.getElementsByClassName("content")[0];
	return this;
    },
    setTitle: function (titleText) {
	this.title.innerHTML = titleText;
	return this;
    },
    getTitle: function () {
	return this.title.innerHTML;
    },
    setContent: function (el) {
	if (this.content.firstChild) {
	    $("hidden-elements").appendChild(this.content.firstChild);
	}
	this.content.innerHTML = "";
	this.content.appendChild($(el));
	return this;
    },
    getContent: function () {
	return this.content.firstChild;
    }
};

var state = {
    init: function () {
	this._onEnter = {};
	this._onLeave = {};
	return this;
    },
    setEnterAction: function (state, action) {
	this._onEnter.setDefault(state, []).push(action);
    },
    setLeaveAction: function (state, action) {
	this._onLeave.setDefault(state, []).push(action);
    },
    _performActions: function (onState) {
	var self = this;
	onState.getOwn(this._state, []).loop(function (action) {
	    action.call(self);
	});
    },
    switchTo: function (state) {
	this._performActions(this._onLeave);
	this._state = state;
	this._performActions(this._onEnter);
    }
};

var isSubstate = function (s, t) {
    if (!s) {
	return true;
    }
    return s.loopItems(function (axis, value) {
	if (t[axis] !== value) {
	    return false;
	}
    }, true);
};

var stateSpace = {
    init: function () {
	this.enterActions = {};
	this.leaveActions = {};
	this.actionArray = [];
	this.axes = {};
	return this;
    },
    addAxis: function (axis, values) {
	if (this.axes.contains(axis)) {
	    throw "Axis already exists";
	}
	this.axes[axis] = values;
	[this.enterActions, this.leaveActions].loop(function (actions) {
	    var axisActions = actions[axis] = {};
	    values.loop(function (value) {
		axisActions[value] = [];
	    });
	});
    },
    addAction: function (actions, state, mutation, action) {
	var self = this;
	state.loopItems(function (axis, value) {
	    var actionIndex = self.actionArray.length;
	    self.actionArray.push([state, mutation, action]);
	    actions[axis][value].push(actionIndex);
	});
    },
    addEnterAction: function (state, mutation, action) {
	if (action === undefined) {
	    action = mutation;
	    mutation = undefined;
	}
	this.addAction(this.enterActions, state, mutation, action);
    },
    addLeaveAction: function (state, mutation, action) {
	if (action === undefined) {
	    action = mutation;
	    mutation = undefined;
	}
	this.addAction(this.leaveActions, state, mutation, action);
    },
    performActions: function (actions, state, mutation) {
	var self = this;
	var performed = {};
	mutation.loopItems(function (axis) {
	    actions[axis][state[axis]].loop(function (i) {
		// Check the action hasn't been performed yet
		if (performed.contains(i)) {
		    return;
		}
		var sa = self.actionArray[i];
		var actionState = sa[0];
		var actionMutation = sa[1];
		var action = sa[2];
		// Check that the current state matches the action
		// state and same for mutation.  If so, perform the
		// action provided it hasn't been performed yet
		if (isSubstate(actionState, state) &&
		    isSubstate(actionMutation, mutation)) {
		    action();
		    performed[i]=1;
		}
	    });
	});
    },
    performLeaveActions: function (state, mutation) {
	this.performActions(this.leaveActions, state, mutation);
    },
    performEnterActions: function (state, mutation) {
	this.performActions(this.enterActions, state, mutation);
    }
}

var mutableState = {
    space: null,
    initialState: null,
    _locked: false,
    _state: null,
    init: function () {
	var state = this._state = {};
	state.update(this.initialState);
	this.space.performEnterActions(state, state);
    },
    mutate: function (mutation) {
	var state = this._state;
	if (this._locked) {
	    throw "mutable state cannot be mutated while locked";
	}
	this._locked = true;
	this.space.performLeaveActions(state, mutation);
	state.update(mutation);
	this.space.performEnterActions(state, mutation);
	this._locked = false;
    }
};

var keyCmp = function (key) {
    return function (a, b) {
	var x = a[key], y = b[key];
	return x > y ? 1 : x < y ? -1 : 0;
    };
};

//
// Module
//

module = {
    register: function (modulepath, initmodule) {
	var names = modulepath.split(".");
	if (!names.length) {
	    return;
	}
	var current = window;
	for (i = 0; i < names.length; i++) {
	    if (!current.hasOwnProperty(names[i])) {
		current[names[i]] = {}
	    }
	    current = current[names[i]];
	}
	initmodule(current);
    }
}

var sameLocation = function (l1, l2) {
    return l1.x === l2.x && l1.y === l2.y;
}

