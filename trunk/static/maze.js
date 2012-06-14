//
// robo.maze
//
// This module implements the maze and the maze editor
//


module.register("robo.maze", function (m) {
    
    //
    // The object that represents a maze
    //

    m.genericMaze = {
	//
	// Initialisation and copy
	//
	copy: function() {
	    // Make a deep copy of this maze
	    var maze = m.genericMaze.specialise({
		width: this.width,
		height: this.height,
		costs: {},
		_hwalls: copy_matrix(this._hwalls),
		_vwalls: copy_matrix(this._vwalls),
		_floors: copy_matrix(this._floors),
		_objects: [],
		_objCount: {}
	    });
	    this.loopObjects(function(obj) {
		maze.addObject(obj.copy());
	    });
	    this.costs.loopItems(function (item, cost) {
		maze.costs[item] = cost;
	    });
	    return maze;
	},
	create: function (width, height) {
	    // create & return a new maze object
	    return m.genericMaze.specialise({
		width: width,
		height: height,
		costs: {chip: 10, step: 1},
		_floors: make_matrix(width, height, 0),
		_hwalls: make_matrix(width, height + 1, 0),
		_vwalls: make_matrix(width + 1, height, 0),
		_objects: [],
		_objCount: {}
	    });
	},
	//
	// Methods to access/modify objects, floors, walls
	//
	// Get / set floor
	getFloorAt: function (loc) {
	    return this._floors[loc.y][loc.x];
	},
	setFloorAt: function (loc, val) {
	    this._floors[loc.y][loc.x] = val;
	},
	// Get / set vertical wall
	getVWall: function (loc) {
	    return this._vwalls[loc.y][loc.x];
	},
	setVWall: function (loc, val) {
	    this._vwalls[loc.y][loc.x] = val;
	},
	// Get / set horizontal wall
	getHWall: function (loc) {
	    return this._hwalls[loc.y][loc.x];
	},
	setHWall: function (loc, val) {
	    this._hwalls[loc.y][loc.x] = val;
	},
	// Get / add / remove object at a given location
	getObjectAt: function (loc) {
	    return this._objects.findFirst(function (obj) {
		return sameLocation(obj, loc);
	    });
	},
	removeObjectAt: function (loc) {
	    var self = this;
	    this._objects = this._objects.filter(function (obj) {
		if (sameLocation(obj, loc)) {
		    self.decCount(obj.name);
		    return false;
		}
		return true;
	    });
	},
	addObject: function (obj) {
	    this.removeObjectAt(obj);
	    this._objects.push(obj);
	    this.incCount(obj.name);
	},
	// Get / increase / decrease object count
	getCount: function(name) {
	    // Return the number of objects of a certain kind in the maze
	    return this._objCount[name] || 0;
	},
	incCount: function (name) {
	    this._objCount[name] = this.getCount(name) + 1;
	},
	decCount: function (name) {
	    var count = this.getCount(name);
	    if (count) {
		this._objCount[name] = count - 1;
	    }
	},
	//
	facingWall:  function (obj) {
	    // Return a value which is true if the given object is
	    // directly facing a wall
	    if (obj.dir % 2) {
		// facing up or down
		return this._hwalls[obj.y + (obj.dir === 1 ? 1 : 0)][obj.x];
	    } else {
		// facing left or right
		return this._vwalls[obj.y][obj.x + (obj.dir === 0 ? 1 : 0)];
	    }
	},
	//
	// Methods to run the maze
	//
	resolveConflicts: function (t) {
	    // Decide the fate of objects at the same location
	    var objectHash = {};
	    var i, tmp;
	    this._objects.loop(function(obj) {
		i = (obj.x + obj.vx*t)*1000 + (obj.y + obj.vy*t);
		var obj1 = objectHash[i];
		if (obj1) {
		    if (obj1.name > obj.name) {
			tmp = obj1;
			obj1 = obj;
			obj = tmp;
		    }
		    if (obj1.name === "flag" && obj.name === "robot") {
			obj1.kill = true;
			objectHash[i] = obj;
		    } else if (obj1.name === "bomb" && obj.name === "robot") {
			obj.kill = true;
			obj1.kill = true;
		    } else {
			alert("Undecided conflict");
		    }
		} else {
		    objectHash[i] = obj;
		}
	    });
	},
	killDeadObjects: function() {
	    var newObjects = [];
	    var objCount = this._objCount = {};
	    this._objects = this._objects.filter(function(obj) {
		if (obj.kill) {
		    return false;
		}
		objCount[obj.name] = (objCount[obj.name] || 0) + 1;
		return true;
	    });
	},	    
	updateObjects: function() {
	    var self = this;
	    this._objects.loop(function(obj) {
		if (obj.painting !== undefined) {
		    self.setFloorAt(obj, obj.painting);
		}
		obj.x += obj.vx;
		obj.y += obj.vy;
		if (obj.x < 0 || obj.x >= self.width || 
		    obj.y < 0 || obj.y >= self.height ||
		    self.getFloorAt(obj) === noFloor) {
		    obj.kill = true;
		}
		obj.dir = (obj.dir + obj.rot + 4) % 4;
		obj.rest();
	    });
	},
	//
	// JSON functions
	//
	toJSON: function () {
	    return {
		costs: this.costs,
		floors: this._floors,
		hwalls: this._hwalls,
		vwalls: this._vwalls,
		objects: this._objects.map(function(obj) {
		    return obj.toJSON();
		})
	    };
	},
	fromJSON: function (jsonMaze) {
	    var height = jsonMaze.floors.length;
	    var width = jsonMaze.floors[0].length;
	    var costs = jsonMaze.costs || {chip: 10, step: 1};
	    var maze = this.specialise({
		width: width,
		height: height,
		costs: costs,
		_floors: jsonMaze.floors,
		_hwalls: jsonMaze.hwalls,
		_vwalls: jsonMaze.vwalls,
		_objects: [],
		_objCount: {}
	    });
	    // Do it like this to update _objCount correctly:
	    jsonMaze.objects.loop(function (obj) {
		maze.addObject(mazeObject.fromJSON(obj));
	    });
	    return maze;
	},
	//
	// Loops
	//
	loopFloors: function (action) {
	    return loop_matrix(this._floors, action);
	},
	loopHWalls: function (action) {
	    return loop_matrix(this._hwalls, action);
	},
	loopVWalls: function (action) {
	    return loop_matrix(this._vwalls, action);
	},
	loopObjects: function (action) {
	    return this._objects.loop(action);
	}
    };
    
    //
    // The three floor colors + the color of no tile
    //
    
    var floorColors = ["#FF9999", "#FFFF66", "#9999FF", "#FFFFFF"];
    var noFloor = 3;

    //
    // Objects represent dragging states in the maze editor
    //
    
    var wallDrag = {
	hloop: function(action) {
	    if (this.horiz) {
		var x0 = Math.min(this.x0, this.x);
		var x1 = Math.max(this.x0, this.x);
		var x;
		for (x = x0; x <= x1; x++) {
		    action({x:x, y:this.y0});
		}
	    }
	},
	vloop: function(action) {
	    if (this.vert) {
		var y0 = Math.min(this.y0, this.y);
		var y1 = Math.max(this.y0, this.y);
		var y;
		for (y = y0; y <= y1; y++) {
		    action({x:this.x0, y:y});
		}
	    }
	}
    };
    
    var floorDrag = {
	loop: function(action) {
	    var x0 = Math.min(this.x0, this.x);
	    var x1 = Math.max(this.x0, this.x);
	    var y0 = Math.min(this.y0, this.y);
	    var y1 = Math.max(this.y0, this.y);
	    var x, y;
	    for (x = x0; x <= x1; x++) {
		for (y = y0; y <= y1; y++) {
		    action({x:x, y:y});
		}
	    }
	}
    };
    
    //
    // The object that determines the position and rotation of elements of
    // a maze before drawing them
    //
    
    m.mazeGeometry = {
	at: function (ctx, loc, draw_func) {
	    ctx.save();
	    ctx.translate(22 + 40*loc.x, 22 + 40*loc.y);
	    draw_func(ctx);
	    ctx.restore();
	},
	obj_at: function (ctx, obj, draw_func, t) {
	    ctx.save();
	    ctx.translate(22 + 40*(obj.x + obj.vx*t), 22 + 40*(obj.y +obj.vy*t));
	    ctx.rotate((obj.dir + obj.rot*t)* Math.PI * 0.5);
	    draw_func(ctx);
	    ctx.restore();
	},
	hwall_at: function (ctx, loc, draw_func) {
	    ctx.save();
	    ctx.translate(22 + 40*loc.x, 2 + 40*loc.y);
	    draw_func(ctx);
	    ctx.restore();
	},
	vwall_at: function(ctx, loc, draw_func) {
	    ctx.save();
	    ctx.translate(2 + 40*loc.x, 22 + 40*loc.y);
	    ctx.rotate(Math.PI/2);
	    draw_func(ctx);
	    ctx.restore();
	}
    };
    
    //
    // The object that perform the painting of elements of a maze.
    //
    
    m.mazePainter = {
	paint_floors: function(ctx, maze) {
	    var self = this;
	    maze.loopFloors(function(loc, col) {
		self.geo.at(ctx, loc, function(ctx) {
		    self.draw.floor(ctx, col);
		});
	    });
	},
	paint_floor_drag: function(ctx, floor_drag) {
	    var self = this;
	    if (floor_drag.on) {
		floor_drag.loop(function(loc) {
		    self.geo.at(ctx, loc, function(ctx) {
			self.draw.floor(ctx, floor_drag.state);
		    });
		});
	    };
	},
	paint_shadow_walls: function(ctx, maze) {
	    var self = this;
	    maze.loopHWalls(function(loc) {
		self.geo.hwall_at(ctx, loc, self.draw.shadow_wall);
	    });
	    maze.loopVWalls(function(loc) {
		self.geo.vwall_at(ctx, loc, self.draw.shadow_wall);
	    });
	},
	paint_walls: function(ctx, maze) {
	    var self = this;
	    maze.loopHWalls(function(loc, w) {
		if (w) self.geo.hwall_at(ctx, loc, self.draw.wall);
	    });
	    maze.loopVWalls(function(loc, w) {
		if (w) self.geo.vwall_at(ctx, loc, self.draw.wall);
	    });
	},
	paint_wall_drag: function(ctx, wall_drag) {
	    var self = this, drag_draw;
	    if (wall_drag.on) {
		drag_draw = self.draw[wall_drag.state ? "wall" : "shadow_wall"];
		wall_drag.hloop(function(loc) { 
		    self.geo.hwall_at(ctx, loc, drag_draw);
		});
		wall_drag.vloop(function(loc) {
		    self.geo.vwall_at(ctx, loc, drag_draw);
		});
	    }
	},
	paint_objects: function(ctx, maze, t) {
	    var self = this;
	    if (t === undefined) {
		t = 0;
	    }
	    maze.loopObjects(function(obj) {
		if (t && obj.painting !== undefined) {
		    self.geo.at(ctx, obj, function(ctx) {
			ctx.scale(t, t);
			self.draw.floor(ctx, obj.painting);
		    });
		}
		self.geo.obj_at(ctx, obj, self.draw[obj.name], t);
	    });
	},
	paint_maze: function (canvas, maze, t) {
	    var ctx = $(canvas).getContext("2d");
	    this.paint_floors(ctx, maze);
	    this.paint_walls(ctx, maze);
	    this.paint_objects(ctx, maze, t);
	}
    };
    

    m.editor = {
	activate: function () {
	    this._active = true;
	},
	deactivate: function () {
	    this._active = false;
	},
	ev_canvas: function (ev) {
	    ev.preventDefault();
	    // Could use ev.offsetX/Y but for firefox
	    var ev_coord, x, y;
	    if (!this._active) {
		return;
	    }
	    ev_coord = getEventCoordinates(ev);
	    x = ev_coord.x;
	    y = ev_coord.y;
	    ev._x = Math.floor((x + 1) / 40);
	    ev._y = Math.floor((y + 1) / 40);
	    ev._loc = {x: ev._x, y: ev._y};
	    ev._wx = (x + 1) % 40 < 6;
	    ev._wy = (y + 1) % 40 < 6;
	    // Call the event handler of the tool.
	    var func = this.tool[ev.type];
	    if (func && func.call(this.tool, ev)) {
		this.paint();
	    }
	},
	setCanvas: function (canvas) {
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
			      "mouseout"].map(function (ev_type) {
				  return request.
				      event(canvas, ev_type).
				      success(ev_canvas).
				      send();
			      });
	},
	paint: function () {
	    var ctx = this._ctx;
	    var maze = this.maze;
	    var painter = this.painter;
	    painter.paint_floors(ctx, maze);
	    if (this.wall_floor_tool) {
		painter.paint_floor_drag(ctx, this.wall_floor_tool.floor_drag);
	    }
	    painter.paint_shadow_walls(ctx, maze);
	    painter.paint_walls(ctx, maze);
	    if (this.wall_floor_tool) {
		painter.paint_wall_drag(ctx, this.wall_floor_tool.wall_drag);
	    }
	    painter.paint_objects(ctx, maze);
	}
	,
	setTool: function (new_tool) {
	    this.tool.deactivate();
	    this.tool = new_tool;
	    new_tool.activate();
	},
	setWallFloorTool: function (wftool) {
	    this.wall_floor_tool = wftool;
	    this.tool = wftool;
	},
	setMaze: function(new_maze) {
	    this.maze = new_maze;
            this.paint();
	}
    };
    
    var wallFloorTool = toolWithWidget.specialise({
	specialise: function (spec) {
	    var obj = this.__proto__.specialise.call(this, spec);
	    obj.floor_drag = floorDrag.specialise({on: false});
	    obj.wall_drag = wallDrag.specialise({on: false});
	    spec.editor.setWallFloorTool(obj);
	    return obj;
	},
	drag: null,
	mousedown: function (ev) {
	    this.wall_drag.on = false;
	    this.floor_drag.on = false;
	    if (ev._wx && ev._wy) {
		return;
	    } else if (ev._wx) {
		this.drag = this.wall_drag;
		this.drag.state = 1 - this.editor.maze.getVWall(ev._loc);
		this.drag.horiz = 0;
		this.drag.vert = 1;
	    } else if (ev._wy) {
		this.drag = this.wall_drag;
		this.drag.state = 1 - this.editor.maze.getHWall(ev._loc);
		this.drag.horiz = 1;
		this.drag.vert = 0;
	    } else {
		this.drag = this.floor_drag;
		this.drag.state = (this.editor.maze.getFloorAt(ev._loc) + 1) % floorColors.length;
	    }
	    this.drag.x0 = ev._x;
	    this.drag.y0 = ev._y;
	    this.drag.x = ev._x;
	    this.drag.y = ev._y;
	    this.drag.on = true;
	    return true;
	},
	mousemove: function (ev) {
	    if (this.drag) {
		this.drag.x = ev._x;
		this.drag.y = ev._y;
		return true;
	    }
	    return false;
	},
	mouseup: function (ev) {
	    var maze = this.editor.maze;
	    var state = this.drag.state;
	    this.drag = null;
	    if (this.wall_drag.on) {
		this.wall_drag.hloop(function(loc) {
		    maze.setHWall(loc, state);
		});
		this.wall_drag.vloop(function(loc) {
		    maze.setVWall(loc, state);
		});
		this.wall_drag.on = false;
	    }
	    if (this.floor_drag.on) {
		this.floor_drag.loop(function(loc) {
		    maze.setFloorAt(loc, state);
		});
		this.floor_drag.on = false;
	    }
	    return true;
	},
	mouseout: function (ev) {
	    this.wall_drag.on = false;
	    this.floor_drag.on = false;
	    this.drag = null;
	    return true;
	}
    });
    
    var objectTool = toolWithWidget.specialise({
	mousedown: function (ev) {
	    if (ev._wx || ev._wy) {
		return false;
	    }
	    var new_obj = this.obj(ev._loc);
	    this.editor.maze.addObject(new_obj);
	    return true;
	}
    });

    var deleteObjectTool = toolWithWidget.specialise({
	mousedown: function (ev) {
	    if (ev._wx || ev._wy) {
		return false;
	    }
	    this.editor.maze.removeObjectAt(ev._loc);
	    return true;
	}
    });
    
    var rotateTool = toolWithWidget.specialise({
	mousedown: function (ev) {
	    var obj;
	    if (ev._wx || ev._wy) {
		return false;
	    }
	    obj = this.editor.maze.getObjectAt(ev._loc);
	    if (obj) {
		obj.dir = (obj.dir + 1) % 4;
		return true;
	    }
	    return false;
	}
    });
    
    var toolNames = ['paint', 'robot', 'flag', 'remove', 'rotate'];
    
    m.bindMazeTools = function(prefix, editor) {
	toolNames.loop(function(name) {
	    var el = $(prefix + name);
	    var widget = canvasSwitch(el, m.draw[name]);
	    var tool = tools[name].specialise({
		editor: editor,
		widget: widget
	    });
	    el.addEventListener("mousedown", function(ev) {
		ev.preventDefault();
		editor.setTool(tool);
	    }, false);
	});
    };
    
    m.draw = {
	robot: function (ctx) {
	    ctx.save();
	    ctx.fillStyle = "orange";
	    ctx.drawStyle = "black";
	    ctx.beginPath();
	    ctx.moveTo(-10, -10);
	    ctx.lineTo(10, 0);
	    ctx.lineTo(-10, 10);
	    ctx.closePath();
	    ctx.fill();
	    ctx.stroke();
	    ctx.beginPath();
	    ctx.moveTo(0, 5);
	    ctx.lineTo(10, 0);
	    ctx.lineTo(0, -5);
	    ctx.closePath();
	    ctx.fillStyle = "white";
	    ctx.fill();
	    ctx.stroke();
	    ctx.restore();
	},
	shadow_wall: function(ctx) {
	    ctx.save();
	    ctx.strokeStyle = "gray";
	    ctx.lineCap = "butt";
	    ctx.lineWidth = 2;
	    ctx.beginPath();
	    ctx.moveTo(-20, 0);
	    ctx.lineTo(20, 0);
	    ctx.stroke();
	    ctx.restore();
	},
	wall: function(ctx) {
	    ctx.save();
	    ctx.strokeStyle = "black";
	    ctx.lineCap = "round";
	    ctx.lineWidth = 3;
	    ctx.beginPath();
	    ctx.moveTo(-20, 0);
	    ctx.lineTo(20, 0);
	    ctx.stroke();
	    ctx.restore();
	},
	floor: function(ctx, col) {
	    ctx.save();
	    ctx.fillStyle = floorColors[col];
	    ctx.fillRect(-20, -20, 40, 40);
	    ctx.restore();
	},
	flag: function(ctx) {
	    ctx.strokeStyle = "black";
	    ctx.lineWidth = 1;
	    ctx.fillStyle = "#00FF00";
	    ctx.beginPath();
	    ctx.moveTo(-5, -15);
	    ctx.lineTo(15, -10);
	    ctx.lineTo(-5, -5);
	    ctx.closePath();
	    ctx.fill();
	    ctx.stroke();
	    ctx.lineWidth = 5;
	    ctx.strokeStyle = "black";
	    ctx.lineCap = "round";
	    ctx.beginPath();
	    ctx.moveTo(-5, -15);
	    ctx.lineTo(-5, 15);
	    ctx.stroke();
	    ctx.lineWidth = 3;
	    ctx.strokeStyle = "white";
	    ctx.lineCap = "round";
	    ctx.beginPath();
	    ctx.moveTo(-5, -15);
	    ctx.lineTo(-5, 15);
	    ctx.stroke();
	},
	remove: function(ctx) {
	    ctx.strokeStyle = "red";
	    ctx.lineWidth = 3;
	    ctx.beginPath();
	    ctx.moveTo(-10, 10);
	    ctx.lineTo(10, -10);
	    ctx.moveTo(-10, -10);
	    ctx.lineTo(10, 10);
	    ctx.stroke();
	},
	rotate: function(ctx) {
	    ctx.strokeStyle = "black";
	    ctx.lineWidth = 3;
	    ctx.beginPath();
	    ctx.arc(0, 0, 10, Math.PI*0.5, 0, false);
	    ctx.moveTo(5, -5);
	    ctx.lineTo(10, 0);
	    ctx.lineTo(15, -5);
	    ctx.stroke();
	}
    };
    
    // Need to define this below as it uses the draw object itself!
    m.draw.paint =  function() {
	var maze = m.genericMaze.fromJSON({
	    floors: [[0, 0, 1], [1, 2, 1], [2, 2, 2]],
	    hwalls: [[0, 0, 0], [1, 1, 0], [1, 0, 1], [0, 0, 0]],
	    vwalls: [[0, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
	    objects: []
	});
	var painter = m.mazePainter.specialise({
	    geo: m.mazeGeometry,
	    draw: m.draw
	});
	return function(ctx) {
	    ctx.setTransform(1, 0, 0, 1, 0, 0);
	    ctx.beginPath();
	    ctx.rect(5, 5, 30, 30);
	    ctx.clip();
	    ctx.scale(1/3, 1/3);
	    painter.paint_floors(ctx, maze);
	    painter.paint_walls(ctx, maze);
	};
    }();
    
    //
    // Objects in the maze
    //
    
    var mazeObject = {
	create: function (name, spec) {
	    if (!spec) {
		spec = {};
	    }
	    return mazeObject.specialise({
		name: name,
		x: spec.x || 0,
		y: spec.y || 0,
		dir: spec.dir || 0,
		rot: spec.rot || 0,
		vx: spec.vx || 0,
		vy: spec.vy || 0
	    });
	},
	copy: function () {
	    return mazeObject.create(this.name, this);
	},
	rest: function () {
	    this.vx = 0;
	    this.vy = 0;
	    this.rot = 0;
	    delete this.painting;
	},
	moveForward: function () {
	    switch (this.dir) {
	    case 0: this.vx = 1; this.vy = 0; break;
	    case 1: this.vx = 0; this.vy = 1; break;
	    case 2: this.vx = -1; this.vy = 0; break;
	    case 3: this.vx = 0; this.vy = -1; break;
	    }
	},
	turnLeft: function () {
	    this.rot = -1;
	},
	turnRight: function () {
	    this.rot = 1;
	},
	paint: function (col) {
	    this.painting = col;
	},
	toJSON: function () {
	    return {
		name: this.name,
		x: this.x,
		y: this.y,
		dir: this.dir
	    };
	},
	fromJSON: function (jsonObj) {
	    return mazeObject.create(jsonObj.name, jsonObj);
	}
    };
    
    var robotObject = function(spec) {
	return mazeObject.create("robot", spec);
    };
    
    var flagObject = function(spec) {
	return mazeObject.create("flag", spec);
    };
    
    var tools = {
	'paint': wallFloorTool,
	'remove': deleteObjectTool,
	'rotate': rotateTool,
	'flag': objectTool.specialise({obj: flagObject}),
	'robot': objectTool.specialise({obj: robotObject})
    };
});