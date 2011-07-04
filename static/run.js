//
// robo.run
//
// This module implements the maze player, given a maze and a circuit board

module.register("robo.run", function (m) {
    
    var Thread = {
	resetLoc: function() {
	    this.loc = this.board.start;
	},
	step: function() {
	    var chip = this.board.getChip(this.loc);
	    var chiploc = this.loc;
	    var trtype = chip.run(this);
	    var tr = this.board.getTransition(trtype, this.loc);
	    if (tr) {
		this.loc = tr.end;
	    } else {
		this.resetLoc();
	    }
	    return {chip: chip, loc: chiploc, tr: tr, tp: trtype};
	}
    };
		   
    var drawStep = function(ctx) {
	ctx.strokeStyle = "black";
	ctx.fillStyle = "black";
	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(-10, -10);
	ctx.lineTo(-10, 10);
	ctx.lineTo(5, 0);
	ctx.closePath();
	ctx.fill();
	//ctx.stroke();
	ctx.beginPath();
	ctx.arc(10, 0, 3, 0, Math.PI*2, true);
	ctx.fill();
    };

    var drawPlay = function(ctx) {
	ctx.strokeStyle = "black";
	ctx.fillStyle = "black";
	ctx.lineWidth = 3;
	ctx.lineCap = "round";
	ctx.beginPath();
	ctx.moveTo(-10, -10);
	ctx.lineTo(-10, 10);
	ctx.lineTo(5, 0);
	ctx.closePath();
	ctx.fill();
    };
    
    var drawPause = function(ctx) {
	ctx.fillStyle = "black";
	ctx.fillRect(-10, -10, 5, 20);
	ctx.fillRect(0, -10, 5, 20);
    };
    
    var drawRestart = function(ctx) {
	ctx.strokeStyle = "black";
	ctx.fillStyle = "black";
	ctx.lineWidth = 1;
	//ctx.lineCap = "";
	ctx.beginPath();
	ctx.moveTo(15, -10);
	ctx.lineTo(15, 10);
	ctx.lineTo(5, 0);
	ctx.closePath();
	ctx.moveTo(5, -10);
	ctx.lineTo(5, 10);
	ctx.lineTo(-5, 0);
	ctx.closePath();
	ctx.fill();
	ctx.fillRect(-10, -10, 5, 20);
    };
    
    var drawSpeedCtrl = function (ctx, x) {
	ctx.save();
	ctx.clearRect(0, 0, 80, 40);
	ctx.strokeStyle = "black";
	ctx.fillStyle = "gray";
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(0, 20);
	ctx.lineTo(x, 20);
	ctx.lineTo(x, 20 - x/2);
	ctx.closePath();
	ctx.fill();
	ctx.beginPath();
	ctx.moveTo(0, 20);
	ctx.lineTo(40, 20);
	ctx.lineTo(40, 0);
	ctx.closePath();
	ctx.stroke();
	ctx.restore();
    };
    
    var highlightSteps = function (board, painter, ctx, steps) {
	painter.paintBackground(ctx, board);
	painter.paintTransitions(ctx, board);
	steps.loop(function (data) {
	    if (data.tr) {
		painter.highlightTransition(ctx, data.tp, data.tr);
	    }
	});
	painter.paintChips(ctx, board);
	steps.loop(function (data) {
	    painter.highlightChip(ctx, data.chip, data.loc);
	});			 	
    };

    m.mazeRun = {
	startMaze: null,
	mazeCanvas: null,
	painter: null,
	board: null,
	boardpainter: null,
	boardcanvas: null,
	dt: 0.05,
	ms: 50,
	time: 0,
	_stepping: false,
	_maze: null,
	setMazeCanvas: function (canvas) {
	    canvas = $(canvas);
	    this.mazeCanvas = canvas;
	    this._ctx = canvas.getContext("2d");
	},
	setBoardCanvas: function (canvas) {
	    canvas = $(canvas);
	    this.boardCanvas = canvas;
	    this._boardCtx = canvas.getContext("2d");
	},
	setMaze: function(new_maze) {
	    this.startMaze = new_maze;
	},
	restart: function() {
	    var self = this;
	    var robotindex = null;
	    if (this._stepping) {
		this._stepping = false;
		// Give the stepping a chance to stop.
		setTimeout(this.bind("restart"), this.ms + 10);
		return;
	    }
	    this._maze = this.startMaze.copy();
	    this.startMaze.loopObjects(function (obj, i) {
		if (obj.name === "robot") {
		    robotindex = i;
		}
	    });
	    this.time = 0;
	    if (robotindex === null) {
		alert("no robot");
	    }
	    this._thread = Thread.specialise({
		board: this.board,
		maze: this._maze,
		obj: this._maze._objects[robotindex]
	    });
	    this._thread.resetLoc();
	    this.paint();
	    this.paintBoard();
	    this.boardpainter.paintAll(this._boardCtx, this.board);
	},
	paint: function (t) {
	    var painter = this.painter;
	    var ctx = this._ctx;
	    var maze = this._maze;
	    painter.paint_floors(ctx, maze);
	    painter.paint_shadow_walls(ctx, maze);
	    painter.paint_walls(ctx, maze);
	    painter.paint_objects(ctx, maze, t);
	},
	paintBoard: function () {
	    this.boardpainter.paintAll(this._boardCtx, this.board);
	},
	step: function (callback) {
	    var i;
	    var stepInfo;
	    var steps = [];
	    var maze = this._maze;
	    if (!this._stepping) {
		this.paintBoard();
		if (!maze.getCount("flag")) {
		    if (this.onWin) {
			this.onWin();
		    }
		    return callback("win");
		}
		if (!maze.getCount("robot")) {
		    if (this.onLose) {
			this.onLose();
		    }
		    return callback("lose");
		}
		this._stepping = true;
		for (i = 0;; i++) {
		    if (i > 100) {
			this.onBusy && this.onBusy();
			return callback("busy");
		    }
		    stepInfo = this._thread.step();
		    steps.push(stepInfo);
		    if (stepInfo.chip.time) {
			highlightSteps(
			    this.board, this.boardpainter,
			    this._boardCtx, steps
			)
			return this.stepStep(0, callback);
		    }
		}
	    }
	},
	stepStep: function (t, callback) {
	    var self = this;
	    var maze = this._maze
	    if (t >= 1) {
		this.time += 1;
		maze.updateObjects();
		maze.resolveConflicts(0);
		maze.killDeadObjects();
		this.paint(1);
		if (!this._stepping) {
		    return;
		}
		this._stepping = false;
		if (callback) {
		    return callback("step");
		}
	    }
	    this.paint(t);
	    var t1 = t + this.dt;
	    if (t < 0.5 && t1 >= 0.5) {
		maze.resolveConflicts(0.5);
		maze.killDeadObjects();
	    }
	    if (this._stepping) {
		setTimeout(function() {
		    self.stepStep(t1, callback)
		}, this.ms);
	    }
	}	
    };

    m.runButtons = function(prefix, run, boardEditor) {
	var playing = false;
	var restartButton = canvasButton(prefix + "start", drawRestart, function(btn) {
	    playing = false;
	    btn.deactivate();
	    run.restart();
	    stepButton.activate();
	    playButton.activate();
	    boardEditor.activate();
	});
	var stepButton = canvasButton(prefix + "step", drawStep, function(btn) {
	    btn.deactivate();
	    boardEditor.deactivate();
	    playButton.deactivate();
	    restartButton.activate();
	    run.step(function(outcome) {
		if (outcome === "step") {
		    btn.activate();
		    playButton.activate();
		}
		else {
		    alert(outcome);
		}
	    });
	});
	var playButton = canvasButton(prefix + "play", drawPlay, function(btn) {
	    if (playing) {
		playing = false;
		btn.deactivate();
		return;
	    }
	    boardEditor.deactivate();
	    playing = true;
	    btn.customDraw(drawPause);
	    stepButton.deactivate();
	    restartButton.activate();
	    var carry_on = function(outcome) {
		if (!playing) {
		    btn.activate();
		    stepButton.activate();
		    return
		}
		if (outcome === "step") {
		    run.step(carry_on);
		} else {
		    btn.deactivate();
		    playing = false;
		}
	    };
	    carry_on("step");
	});
	var speedCtrl = canvasSlide.specialise({
	    draw: drawSpeedCtrl,
	    min: Math.log(0.01),
	    max: Math.log(0.5),
	    curVal: Math.log(0.05),
	    action: function (x) { run.dt = Math.exp(x); },
	    canvas: $(prefix + "speed"),
	    active: true
	}).init();
	
	return {
            restart: restartButton,
	    play: playButton,
	    step: stepButton
	}
    };
});