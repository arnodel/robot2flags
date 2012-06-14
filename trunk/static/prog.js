//
// robo.prog
//
// This module implements the circuit board and the circuit board editor

module.register("robo.prog", function (m) {

    var draw_two_lines = function (ctx, line1, line2) {
	// draw two lines of text
	ctx.fillStyle = "black";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(line1, 0, -8);
	ctx.fillText(line2, 0, 8);
    };

    var chipShape = {
	square: function (ctx) {
	    ctx.rect(-20, -20, 40, 40);
	},
	diamond: function (ctx) {
	    ctx.save();
	    ctx.rotate(Math.PI/4);
	ctx.rect(-18, -18, 36, 36);
	    ctx.restore();
	},
	circle: function (ctx) {
	    ctx.arc(0, 0, 25, 0, Math.PI*2, true);
	}
    };
    
    var transTypes = [0, 'Y', 'N'];

    var encodeTransition = function (dx, dy) {
	// Return one of "N", "E", "S", "W" given a transition as dx, dy
	if (dx) {
	    return dx > 0 ? 'E' : 'W';
	} else {
	    return dy > 0 ? 'S' : 'N';
	}
    };

    var translate = function (t, x, y) {
	// Return a start and end position given x, y and t as a
	// cardinal direction
	var tr = { start: {x:x, y:y}, end: {x:x, y:y} };
	if (t === 'E') {
	    tr.end.x += 1;
	    tr.orient = 0;
	} else if (t === 'W') {
	    tr.end.x -= 1;
	    tr.orient = 2;
	} else if (t === 'N') {
	    tr.end.y -= 1;
	    tr.orient = 3;
	} else if (t === 'S') {
	    tr.end.y += 1;
	    tr.orient = 1;
	} else {
	    return false;
	}
	return tr;
    };
    
    m.circuitBoard = {
	//function (width, height) {
	create: function(width, height) {
	    var board = this.specialise();
	    board.width = width;
	    board.height = height;
	    // Start chip position
	    board.start = {x: Math.floor(width/2), y: 0};
	    board.clear();
	    return board;
	},
	clear: function () {
	    var width = this.width;
	    var height = this.height;
	    this._chips = make_matrix(width, height, chips.nochip);
	    this._transitions = {
		0: make_matrix(width, height, 0),
		Y: make_matrix(width, height, 0),
		N: make_matrix(width, height, 0)
	    };
	    this._chips[this.start.y][this.start.x] = chips.start;
	},
	//
	// Transition methods
	//
	setTransition: function (val, start, end) {
	    // val: transition type
	    // start: start location
	    // end: end location
	    //
	    // Return true if transition was set, false otherwise
	    var x = start.x, y = start.y;
	    var dx = end.x - x;
	    var dy = end.y - y;
	    var otherval;
	    var tr;
	    var transitions = this._transitions;
	    var _chips = this._chips;
	    // return false if the transition is of the wrong kind
	    if (_chips[y][x].isTest) {
		if (val !== 'Y' && val !== 'N') {
		    return false;
		}
	    } else {
		if (val !== 0) {
		    return false;
		}
	    }
	    // return false if the transition is not between adjacent squares
	    if (!dx && Math.abs(dy) !== 1 || !dy && Math.abs(dx) !== 1) {
	    return false;
	    }
	    // Now the transition should be reasonable
	    transitions[val][y][x] = encodeTransition(dx, dy);
	    // Yes and No transitions can't have the same destination:
	    if (val) {
		otherval = val === 'Y' ? 'N' : 'Y';
		if (transitions[val][y][x] === transitions[otherval][y][x]) {
		    this.clearTransition(otherval, start);
		}
	    }
	    // Clear opposite transition:
	    for (i = 0; i < transTypes.length; i++) {
		tr = this.getTransition(transTypes[i], end);
		if (tr && sameLocation(start, tr.end)) {
		    this.clearTransition(transTypes[i], end);
		}
	    }
	    return true;
	},
	clearTransition: function (val, loc) {
	    // val: transition type
	    // loc: start location of the transition
	    //
	    // Remove the transition identified by val and loc.
	    this._transitions[val][loc.y][loc.x] = 0;
	},
	getTransition: function (val, loc) {
	    // val: transition type
	    // loc: start location of the transition
	    //
	    // Return and object containing the following attributes:
	    // - start: the start location of the transition
	    // - end: the end location of the transition
	    // - orient: the direction of the transition (0 for E, 1 for S...)
	    return translate(this._transitions[val][loc.y][loc.x],
			     loc.x, loc.y);
	},
	hasTransition: function (start, end) {
	    // start: start location of the transition
	    // end: end location of the transition
	    //
	    // Return the transition type of the transition identified
	    // by start and end, or false if there is no such
	    // transition.
	    var i, tr;
	    for (i = 0; i < transTypes.length; i++) {
		tr = this.getTransition(transTypes[i], start);
		if (tr && sameLocation(end, tr.end)) {
		    return transTypes[i];
		}
	    }
	    return false;
	},
	//
	// Chip methods
	//
	setChip: function (chip, loc) {
	    // Put the chip at location loc.
	    var _chips = this._chips;
	    if (sameLocation(loc, this.start)) {
		return;
	    }
	    _chips[loc.y][loc.x] = chip;
	    if (chip.name === "start") {
		_chips[this.start.y][this.start.x] = chips.nochip;
		this.start = loc;
	    }
	    if (chip.isTest) {
		this.clearTransition(0, loc);
	    } else {
		this.clearTransition("Y", loc);
		this.clearTransition("N", loc);
	    }
	},
	clearChip: function (loc) {
	    // Remove any chip from location loc
	    this.setChip(chips.nochip, loc);
	},
	getChip: function (loc) {
	    // Return chip at location loc
	    return this._chips[loc.y][loc.x];
	},
	//
	// Loops
	//
	loop: function (func) {
	    var i, j;
	    var _chips = this._chips;
	    for (i = 0; i < this.width; i++) {
		for (j = 0; j < this.height; j++) {
		    func({x:i, y:j}, _chips[j][i]);
		}
	    }
	},
	transitionLoop: function (func) {
	    var i, j, tr;
	    for (i = 0; i < this.width; i++) {
		for (j = 0; j < this.height; j++) {
		    for (k = 0; k < transTypes.length; k++) {
			tr = this.getTransition(transTypes[k], {x:i, y:j});
			if (tr) {
			    func(transTypes[k], tr);
			}
		    }
		}
	    }
	},
	//
	// Circuit board cost
	//
	cost: function (chipPrices, transPrices) {
	    var cost = 0;
	    if (chipPrices) {
		this.loop(function (loc, chip) {
		    if (chip.name !== "nochip") {
			cost += chipPrices[chip.name] || chipPrices.chip;
		    }
		});
	    };
	    if (transPrices) {
		this.transitionLoop(function (trtype) {
		    cost += transPrices[trtype];
		});
	    };
	    return cost;
	},
	//
	// JSON methods
	//
	toJSON: function () {
	    var self = this;
	    var chipsJSON = [];
	    var transJSON = [];
	    var i;
	    loop_matrix(this._chips, function (loc, chip) {
		if (chip.name !== "nochip") {
		    chipsJSON.push({x:loc.x, y:loc.y, chip:chip.name});
		}
	    });
	    transTypes.loop(function (tp) {
		loop_matrix(self._transitions[tp], function (loc, dir) {
		    if (dir) {
			transJSON.push({x:loc.x, y:loc.y, dir:dir, type:tp});
		    }
		});
	    });
	    return {
		width: this.width,
		height: this.height,
		transitions: transJSON,
		chips: chipsJSON
	    };
	},
	fromJSON: function (obj) {
	    var self = this;
	    this.width = obj.width;
	    this.height = obj.height;
	    this.clear();
	    obj.chips.loop(function (data) {
		self._chips[data.y][data.x] = chips[data.chip];
	    });
	    obj.transitions.loop(function (data) {
		self._transitions[data.type][data.y][data.x] = data.dir;
	    });
	}
    };
    
    var transitionTool = {
	dragging: false,
	trans: 0,
	activate: function () {
	    this.widgets[this.trans].switchOn();
	},
	deactivate: function () {
	    this.widgets[this.trans].switchOff();
	},
	setTransition: function (val) {
	    this.widgets[this.trans].switchOff();
	    this.trans = val;
	    this.widgets[this.trans].switchOn();
	},
	mousedown: function (ev) {
	    this.dragging = true;
	    this.loc = ev._loc;
	    return false;
	},
	mousemove: function (ev) {
	    var paint = false;
	    if (this.dragging) {
		paint = this.board.setTransition(this.trans, this.loc, ev._loc);
		if (paint) {
		    this.setTransition(0);
		}
		this.loc = ev._loc;
	    }
	    return paint;
	},
	mouseup: function (ev) {
	    this.dragging = false;
	    return false;
	},
	mouseout: function (ev) {
	    this.dragging = false;
	    return false;
	}
    };
    
    var chips = {
	nochip: {
	    name: "nochip",
	    isTest: false,
	    time: 0,
	    run: function (state) {
		return 0;
	    }
	},
	wallp: {
	    name: "wallp",
	    isTest: true,
	    time: 0,
	    run: function (state) {
		return state.maze.facingWall(state.obj) ? "Y" : "N";
	    }
	},
	move: {
	    name: "move",
	    isTest: false,
	    time: 1,
	    run: function (state) {
		if (!state.maze.facingWall(state.obj)) {
		    state.obj.moveForward();
		}
		return 0;
	    }
	},
	left: {
	    name: "left",
	    isTest: false,
	    time: 1,
	    run: function (state) {
		state.obj.turnLeft();
		return 0;
	    }
	},
	right: {
	    name: "right",
	    isTest: false,
	    time: 1,
	    run: function (state) {
		state.obj.turnRight();
		return 0;
	    }
	},
	start: {
	    name: "start",
	    isTest: false,
	    time: 0,
	    run: function () {
		return 0;
	    }
	},
	paintRed: {
	    name: "paintRed",
	    isTest: false,
	    time: 1,
	    run: function(state) {
		state.obj.paint(0);
		return 0;
	    }
	},
	redp: {
	    name: "redp",
	    isTest: true,
	    time: 0,
	    run: function(state) {
		return state.maze.getFloorAt(state.obj) === 0 ? "Y" : "N";
	    }
	},
	paintYellow: {
	    name: "paintYellow",
	    isTest: false,
	    time: 1,
	    run: function(state) {
		state.obj.paint(1);
		return 0;
	    }
	},
	yellowp: {
	    name: "yellowp",
	    isTest: true,
	    time: 0,
	    run: function(state) {
		return state.maze.getFloorAt(state.obj) === 1 ? "Y" : "N";
	    }
	},
	paintBlue: {
	    name: "paintBlue",
	    isTest: false,
	    time: 1,
	    run: function(state) {
		state.obj.paint(2);
		return 0;
	    }
	},
	bluep: {
	    name: "bluep",
	    isTest: true,
	    time: 0,
	    run: function(state) {
		return state.maze.getFloorAt(state.obj) === 2 ? "Y" : "N";
	    }
	}
    };
    
    var chipTool = function (chip) {
	return function (editor, widget) {
	    var that = toolWithWidget.specialise({
		widget: widget
	    });
	    var board = editor.board;
	    that.mousedown = function (ev) {
		var transtool = editor.transtool;
		board.setChip(chip, ev._loc);
		// The commented lines below change the current tool
		// back to a transition.  I don't think it is desirable
		// behaviour
		/*
		  editor.setTool(transtool);
		  transtool.setTransition(chip.isTest ? "Y" : 0);
		*/
		return true;
	    };
	    return that;
	};
    };
    
    var deleteTool = function (editor, widget) {
	var that = toolWithWidget.specialise({
	    widget: widget
	});
	var board = editor.board;
	var dragging = false;
	var deleting_chips = true;
	var loc;
	that.mousedown = function (ev) {
	    dragging = true;
	    deleting_chips = true;
	    loc = ev._loc;
	    return false;
	};
	that.mousemove = function (ev) {
	    if (dragging) {
		t = board.hasTransition(loc, ev._loc);
		rev_t = board.hasTransition(ev._loc, loc);
		if (t !== false) {
		    board.clearTransition(t, loc);
		}
		else if (rev_t !== false) {
		    board.clearTransition(rev_t, ev._loc);
		}
		else {
		    return false;
		}
		deleting_chips = false;
		loc = ev._loc;
	    }
	    return true;
	};
	that.mouseup = function (ev) {
	    dragging = false;
	    if (deleting_chips && sameLocation(loc, ev._loc)) {
		board.clearChip(loc);
		return true;
	    }
	    deleting_chips = true;
	    return false;
	};
	that.mouseout = function (ev) {
	    dragging = false;
	    deleting_chips = true;
	    return false;
	};
	return that;
    };
    
    var boardToolNames = [
	"move", "left", "right", // motion
	"paintBlue", "paintYellow", "paintRed", //painting
	"wallp", "bluep", "yellowp", "redp",// test
	"del" // edit
    ];

    var boardDraw = {
	chip: function (ctx, chip) {
	    var path;
	    if (chip.isTest) {
		path = chipShape.diamond;
	    }
	    else {
		path = chip.name === "start" ? 
		    chipShape.circle : chipShape.square;
	    }
	    ctx.beginPath();
	    path(ctx);
	    ctx.fill();
	    ctx.clip();
	    ctx.save();
	    this[chip.name](ctx);
	    ctx.restore();
	    ctx.beginPath();
	    path(ctx);
	    ctx.stroke();
	    if (chip.isTest) {
		this.question(ctx);
	    }
	},
	question: function (ctx) {
	    ctx.fillStyle = "white";
	    ctx.strokeStyle = "black";
	    ctx.textAlign = "center";
	    ctx.textBaseline = "middle";
	    ctx.linewidth = 1;
	    ctx.font = "30px sans-serif bold";
	    ctx.strokeText("?", 0, 0);
	    ctx.fillText("?", 0, 0);
	},
	move: function (ctx) {
	    ctx.strokeStyle = "black";
	    ctx.lineWidth = 3;
	    ctx.beginPath();
	    ctx.moveTo(0, -10);
	    ctx.lineTo(0, 10);
	    ctx.moveTo(-5, -5);
	    ctx.lineTo(0, -10);
	    ctx.lineTo(5, -5);
	    ctx.stroke();
	},
	left: function (ctx) {
	    ctx.strokeStyle = "black";
	    ctx.lineWidth = 3;
	    ctx.beginPath();
	    ctx.arc(-10, 10, 20, 0, -Math.PI*0.5, true);
	    ctx.moveTo(-5, -5);
	    ctx.lineTo(-10, -10);
	    ctx.lineTo(-5, -15);
	    ctx.stroke();
	},
	right: function (ctx) {
	    ctx.strokeStyle = "black";
	    ctx.lineWidth = 3;
	    ctx.beginPath();
	    ctx.arc(10, 10, 20, Math.PI, -Math.PI*0.5, false);
	    ctx.moveTo(5, -5);
	    ctx.lineTo(10, -10);
	    ctx.lineTo(5, -15);
	    ctx.stroke();
	},
	wallp: function (ctx) {
	    ctx.fillStyle = "#CCCCCC";
	    for (i = -2; i < 2; i++) {
		for (j = -1; j < 2; j++) {
		    ctx.fillRect((2*i+j)*7, j*10 - 3, 12, 8);
		}
	    }
	},
	del: function (ctx) {
	    ctx.strokeStyle = "red";
	    ctx.lineWidth = 4;
	    ctx.beginPath();
	    ctx.moveTo(-20, -20);
	    ctx.lineTo(20, 20);
	    ctx.moveTo(-20, 20);
	    ctx.lineTo(20, -20);
	    ctx.stroke();
	},
	clear: function (ctx) {
	    boardDraw.del(ctx);
	    ctx.fillStyle = "black";
	    ctx.strokeStyle = "white";
	    ctx.lineWidth = 2;
	    ctx.textAlign = "center";
	    ctx.textBaseline = "middle";
	    ctx.font = "30px sans-serif bold";
	    ctx.strokeText("all", 0, 0);
	    ctx.fillText("all", 0, 0);
	},
	start: function (ctx) {
	    draw_two_lines(ctx, "start", "here");
	},
	trans: function (ctx, tp, rot) {
	    ctx.rotate(rot * Math.PI * 0.5);
	    ctx.beginPath();
	    ctx.moveTo(0, 0);
	    ctx.lineTo(60, 0);
	    ctx.moveTo(28, -5);
	    ctx.lineTo(33, 0);
	    ctx.lineTo(28, 5);
	    ctx.stroke();
	    if (tp !== 0) {
		ctx.fillStyle = 'black';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.translate(30, -15);
		ctx.rotate(-rot * Math.PI * 0.5);
		ctx.fillText(tp === 'Y' ? "yes" : "no", 0, 0);
	    }
	},
	paintRed: function (ctx) {
	    ctx.scale(0.8, 0.8);
	    robo.maze.draw.floor(ctx, 0);
	},
	redp: function (ctx) {
	    ctx.save();
	    ctx.scale(0.8, 0.8);
	    robo.maze.draw.floor(ctx, 0);
	    ctx.restore();
	},
	paintYellow: function (ctx) {
	    ctx.scale(0.8, 0.8);
	    robo.maze.draw.floor(ctx, 1);
	},
	yellowp: function (ctx) {
	    ctx.save();
	    ctx.scale(0.8, 0.8);
	    robo.maze.draw.floor(ctx, 1);
	    ctx.restore();
	},
	paintBlue: function (ctx) {
	    ctx.scale(0.8, 0.8);
	    robo.maze.draw.floor(ctx, 2);
	},
	bluep: function (ctx) {
	    ctx.save();
	    ctx.scale(0.8, 0.8);
	    robo.maze.draw.floor(ctx, 2);
	    ctx.restore();
	},
	nochip: function () {}
    };
    
    var boardTools = {
	del: deleteTool
    };

    chips.loopItems(function(name, chip) {
	boardTools[name] = chipTool(chip);
    });

    m.bindBoardTools = function (prefix, editor) {
	boardToolNames.loop(function (name) {
	    var el = $(prefix + name);
	    var widget;
	    if (chips.hasOwnProperty(name)) {
		widget = canvasSwitch(el, function (ctx) {
		    ctx.fillStyle = "white";
		    ctx.strokeStyle = "black";
		    ctx.lineWidth = 1;
		    ctx.scale(0.5, 0.5);
		    boardDraw.chip(ctx, chips[name]);
		});
	    }
	    else {
		widget = canvasSwitch(el, function (ctx) {
		    ctx.scale(0.5, 0.5);
		    boardDraw[name](ctx);
		});
	    }
	    var tool = boardTools[name](editor, widget);
	    el.addEventListener("mousedown", function () {
		editor.setTool(tool);
	    }, false);
	});
	var transtool = transitionTool.specialise({
	    board: editor.board, 
	    widgets: {
		0: canvasSwitch(prefix + "trans", function (ctx) {
		    ctx.translate(0, -30);
		    boardDraw.trans(ctx, 0, 1);
		}),
		Y: canvasSwitch(prefix + "yestrans", function (ctx) {
		    ctx.translate(-10, -30);
		    boardDraw.trans(ctx, "Y", 1);
		}),
		N: canvasSwitch(prefix + "notrans", function (ctx) {
		    ctx.translate(-10, -30);
		    boardDraw.trans(ctx, "N", 1);
		})
	    }
	});
	editor.transtool = transtool;
	editor.setTool(transtool);
	$(prefix + "trans").addEventListener("mousedown", function () {
	    editor.setTool(transtool);
	    transtool.setTransition(0);
	}, false);
	$(prefix + "yestrans").addEventListener("mousedown", function () {
	    editor.setTool(transtool);
	    transtool.setTransition("Y");
	}, false);
	$(prefix + "notrans").addEventListener("mousedown", function () {
	    editor.setTool(transtool);
	    transtool.setTransition("N");
	}, false);
	// Clear button
	var clearButton = canvasButton(
	    $(prefix + "clear"),
	    function (ctx) { ctx.scale(0.5, 0.5); boardDraw.clear(ctx); },
	    function () {
		if (confirm("click OK to clear the circuit board")) {
		    editor.clearBoard();
		}
	    }
	);
    };

    var boardPainter = function (draw) {
	return {
	    paintBackground: function (ctx, board) {
		ctx.save();
		ctx.fillStyle = "#BBFFBB";
		ctx.lineWidth = 10;
		ctx.strokeStyle = "#CCFFCC";
		board.loop(function (loc) {
		    ctx.fillRect(loc.x*60, loc.y*60, 60, 60);
		    ctx.strokeRect(loc.x*60, loc.y*60, 60, 60);
		    
		});
		ctx.restore();
	    },
	    paintTransition: function (ctx, tp, tr) {
		ctx.save();
		ctx.translate(30 + tr.start.x*60, 30 + tr.start.y*60);
		draw.trans(ctx, tp, tr.orient);
		ctx.restore();
	    },
	    paintTransitions: function (ctx, board) {
		var that = this;
		ctx.save();
		ctx.lineWidth = 1;
		ctx.strokeStyle = 'black';
		board.transitionLoop(function (tp, tr) {
		    that.paintTransition(ctx, tp, tr);
		});
		ctx.restore();
	    },
	    highlightTransition: function (ctx, tp, tr) {
		ctx.save();
		ctx.lineWidth = 2;
		ctx.strokeStyle = "red";
		this.paintTransition(ctx, tp, tr);
		ctx.restore();
	    },
	    paintChip: function (ctx, chip, loc) {
		if (chip.name === "nochip") {
		    return;
		}
		ctx.save();
		ctx.translate(30 + loc.x*60, 30 + loc.y*60);
		draw.chip(ctx, chip);
		ctx.restore();
	    },
	    paintChips: function (ctx, board) {
		var that = this;
		ctx.save();
		ctx.fillStyle = "white";
		ctx.strokeStyle = "black";
		ctx.lineWidth = 1;
		board.loop(function (loc, chip) {
		    that.paintChip(ctx, chip, loc);
		});
		ctx.restore();
	    },
	    paintAll: function (ctx, board) {
		this.paintBackground(ctx, board);
		this.paintTransitions(ctx, board);
		this.paintChips(ctx, board);
	    },
	    highlightChip: function (ctx, chip, loc) {
		if (chip.name === "nochip") {
		    return;
		}
		ctx.save();
		ctx.lineWidth = 2;
		ctx.strokeStyle="red";
		ctx.fillStyle = "#FFCCCC";
		this.paintChip(ctx, chip, loc);
		ctx.restore();
	    }
	}
    };
    
    
    m.boardEditor = {
	board: null,
	painter: boardPainter(boardDraw),
	_boardtools: null,
	_boardtoolsDeactivated: null,
	_canvas: null,
	_tool: null,
	_active: true,
	_ctx: null,
	paint: function () {
	    this.painter.paintBackground(this._ctx, this.board);
	    this.painter.paintTransitions(this._ctx, this.board);
	    this.painter.paintChips(this._ctx, this.board);
	},
	ev_canvas: function (ev) {
	    // Could use ev.offsetX/Y but for firefox
	    var ev_coord;
	    if (!this._active) {
		return;
	    }
	    ev_coord = getEventCoordinates(ev);
	    ev._loc = {
		x: Math.floor(ev_coord.x / 60),
		y: Math.floor(ev_coord.y / 60)
	    };
	    // Call the event handler of the tool.
	    var func = this._tool[ev.type];
	    if (func && func.call(this._tool, ev)) {
		this.paint();
	    }
	},
	setTool: function (new_tool) {
	    if (this._tool) {
		this._tool.deactivate();
	    }
	    this._tool = new_tool;
	    new_tool.activate();
	},
	setBoardtools: function (boardtools) {
	    this._boardtools = boardtools;
	    this._boardtoolsDeactivated = $(boardtools + '-deactivated');
	},
	clearBoard: function () {
	    this.board.clear();
	    this.paint();
	},
	activate: function () {
	    this._active = true;
	    showBlock(this._boardtools);
	    hideElement(this._boardtoolsDeactivated);
	},
	deactivate: function () {
	    this._active = false;
	    hideElement(this._boardtools);
	    showBlock(this._boardtoolsDeactivated);
	},
	setCanvas: function (canvas) {
	    canvas = $(canvas);
	    var ev_canvas = this.ev_canvas.bind(this);
	    if (this._requests) {
		this._requests.loop(function (req) {
		    req.abort();
		});
	    }
	    this._canvas = canvas;
	    this._ctx = canvas.getContext("2d");
	    touch2mouse(canvas);
	    this._requests = ["mousemove", 
			      "mousedown", 
			      "mouseup", 
			      "mouseout",
			      "click"].map(function (ev_type) {
				  return request.
				      event(canvas, ev_type).
				      success(ev_canvas).
				      send();
			      });
	    this.paint();
	}
    };
});
