var init = function() {
    // Maze / maze editor initialisation
    var mazeCanvas = $("maze-canvas");
    var maze = robo.maze.genericMaze.create(10, 10);
    var painter = robo.maze.mazePainter.specialise({
	geo: robo.maze.mazeGeometry,
	draw: robo.maze.draw
    });
    var mazeEditor = robo.maze.editor.specialise();
    mazeEditor.painter = painter;
    mazeEditor.setCanvas(mazeCanvas);
    mazeEditor.setMaze(maze);
    robo.maze.bindMazeTools('mazetool-', mazeEditor);

    // Circuit board / board editor initialisation
    var boardCanvas = $("board-canvas");
    var board = robo.prog.circuitBoard.create(9, 8);
    var boardeditor = robo.prog.boardEditor.specialise({
	board: board
    });
    boardeditor.setCanvas("board-canvas");
    boardeditor.setBoardtools("boardtools");
    robo.prog.bindBoardTools("boardtool-", boardeditor);

    // Maze player initialisation
    var run = robo.run.mazeRun.specialise({
	startMaze: maze,
	painter: painter,
	board: board,
	boardpainter: boardeditor.painter,
    });
    run.setMazeCanvas(mazeCanvas);
    run.setBoardCanvas(boardCanvas);
    var run_btns = robo.run.runButtons("run-", run, boardeditor);

    // User details
    var user = {username: null};

    // State object

    var roboStateSpace = stateSpace.specialise().init();
    roboStateSpace.addAxis("user", ["anonymous", "logged-on"]);
    roboStateSpace.addAxis("maze", ["new", "saved", "unmoderated", "published"]);
    roboStateSpace.addAxis("leftPanel", [
	"help", "preview", "preview-loading", "edit", "run", "rankings"
    ]);
    roboStateSpace.addAxis("rightPanel", [
	"news", "board", "mymazes", "pubmazes", "rankings"
    ]);

    var roboState = mutableState.specialise({
	space: roboStateSpace,
	initialState: {
	    user: "anonymous",
	    maze: "new",
	    leftPanel: "help",
	    rightPanel: "pubmazes"
	}
    });

    //
    // JSON requests
    //

    var JR = {
	//
	// POST requests
	//
	publishMaze: function () {
	    return request.jsonPOST("publishmaze", {
		id: mazeInfo.info.id,
		user:user.username
	    });
	},
	saveMaze: function () {
	    return request.jsonPOST("savemaze", {
		data: JSON.stringify({maze: maze}),
		id: mazeInfo.info.id,
		user: user.username,
		title: mazeInfo.info.title,
		description: mazeInfo.info.description
	    });
	},
	deleteMaze: function () {
	    return request.jsonPOST("deletemaze", {
		id: mazeInfo.info.id,
		user: user.username
	    });
	},
	setRating: function () {
	    return request.jsonPOST("setrating", {
		rating: eval($("rating-form").rating.value),
		user: user.username,
		mazeid: mazeInfo.info.id
	    });
	},
	submitScore: function () {
	    return request.jsonPOST("submitscore", {
		mazeid: mazeInfo.info.id,
		user: user.username,
		score: mazeInfo.info.score,
		solution: JSON.stringify(board)
	    });
	},
	saveWorkingBoardOld: function () {
	    return request.jsonPOST("saveworkingboard", {
		user: user.username,
		board: JSON.stringify(board)
	    });
	},
	saveWorkingBoard: function () {
	    var args = {
		user: user.username,
		board: JSON.stringify(board),
		title: "working board"
	    };
	    args[mazeInfo.info.type] = mazeInfo.info.id;
	    return request.jsonPOST("saveboard", args);
	},
	moderateMaze: function () {
	    return request.jsonPOST("moderate", {
		user: user.username,
		mazeid: mazeInfo.info.id,
		decision: $("moderate-decision").value,
		comment: $("moderate-comment").value
	    });
	},
	setUserEmail: function (email) {
	    return request.jsonPOST("setemail", {
		user: user.username,
		email: email
	    });
	},
	//
	// GET requests
	//
	mazeList: function () {
	    return request.jsonGET("mazelist", {});
	},
	getMaze: function (mazeId) {
	    return request.jsonGET("getmaze", {id: mazeId});
	},
	publishedMazeList: function () {
	    return request.jsonGET("publishedmazelist", {});
	},
	getPublishedMaze: function (pubmazeId) {
	    return request.jsonGET("getpublishedmaze", {id: pubmazeId});
	},
	rankings: function (pubmazeId) {
	    return request.jsonGET("rankings", {id: mazeInfo.info.id});
	},
	overallRankings: function () {
	    return request.jsonGET("overallrankings", {});
	},
	getWorkingBoardOld: function () {
	    return request.jsonGET("getworkingboard", {user: user.username});
	},
	getWorkingBoard: function () {
	    var args = {
		user: user.username,
		title: "working board"
	    };
	    args[mazeInfo.info.type] = mazeInfo.info.id;
	    return request.jsonGET("getboard", args);
	},
	getSolution: function () {
	    return request.jsonGET("getsolution", {
		user: user.username,
		mazeid: mazeInfo.info.id
	    });
	}
    };
    
    //
    // Loading and error reporting
    //

    var loadingMsg = function (el, msg) {
	$(el).innerHTML="<div class=\"loading-msg\">" + MSG.getOwn(msg, msg) + "</div>";
    };
    
    var errorMsg = function (el) {
	return function (err) {
	    $(el).innerHTML= (
		"<div class=\"error-msg\">" 
		    + MSG.getOwn(err.error, err.error)
		    + "</div>"
	    );
	};
    };

    //
    // Dialog boxes
    //

    var errorAlert = function(res) {
	alert("ERROR: " + MSG.getOwn(res.error, res.error));
    };

    var successAlert = function(msg) {
	return function () {
	    alert("SUCCESS: " + MSG.getOwn(msg, msg));
	};
    };

    var confirmDialog = function(msg) {
	return function () {
	    return confirm(MSG.getOwn(msg, msg));
	};
    };

    //
    // Set sorting button for published mazes
    //

    var sortPubMazeList = function (key) {
	pubMazeList.sort(key);
	$("sort-pubmaze-by-" + key).
	    parentNode.
	    appendChild($("sort-pubmaze-flag"));
	$("sort-pubmaze-flag").innerHTML = pubMazeList.reversed ?
	    "&uarr;" : "&darr;";
	updatePubMazeList();
    };

    [
	"author", "title", "lowscore", "points", "avgrating", "pubdate"
    ].loop(function (key) {
	request.
	    event($("sort-pubmaze-by-" + key), "click").
	    success(function () {
		sortPubMazeList(key);
	    }).
	    send();
    });

    //
    // Maze canvas show / hide functions
    //

    var showMaze = function () {
	showBlock("maze-container");
    };
    var hideMaze = function () {
	hideElement("maze-container");
    };

    //
    // Right panel
    //

    var rightPanel = pane.specialise({
	showBoard: function () {
	    this.
		setTitle(MSG.CIRCUIT_BOARD_EDITOR).
		setContent("board");
	},
	showMyMazes: function () {
	    this.
		setTitle(MSG.MAZES).
		setContent("browse-mazes");
	    loadingMsg("mazelist", "LOADING_MAZES");
	    mazeList.load().
		success(updateMazeList).
		error(errorMsg("mazelist")).
		send();
	},
	showPubMazes: function () {
	    this.
		setTitle(MSG.PUBLISHED_MAZES).
		setContent("browse-pubmazes");
	    loadingMsg("pubmazelist", "LOADING_PUBMAZES");
	    pubMazeList.load().
		success(function () {
		    sortPubMazeList("title");
		}).
		error(errorMsg("pubmazelist")).
		send();
	},
	showRankings: function () {
	    this.
		setTitle(MSG.OVERALL_RANKINGS).
		setContent("overall");
	    loadingMsg("overall-table", "LOADING_OVERALL_RANKINGS");
	    if (this.rankingsRequest) {
		this.rankingsRequest.abort();
	    }
	    this.rankingsRequest = JR.overallRankings().
		success(function(lst) {
		    $("overall-table").innerHTML = "";
		    lst.loop(function (data, i) {
			var row = tr(
			    {
				"class": (i % 2) ? "row-even" : "row-odd"
			    },
			    td({"class":"col-rankings-rank"}, (i + 1).toString()),
			    td({"class":"col-rankings-user"}, data.user),
			    td({"class":"col-rankings-points"}, data.points.toFixed(3)),
			    td({"class":"col-rankings-nsolved"}, data.countmazes.toString())
			);
			$("overall-table").appendChild(row);
		    });
		}).
		error(errorMsg("overall-table")).
		send();
	},
	showNews: function () {
	    this.
		setTitle(MSG.NEWS).
		setContent("news");
	}
    }).init("right-panel");

    roboStateSpace.addEnterAction({rightPanel: "board"}, function () {
	rightPanel.showBoard();
    });

    roboStateSpace.addEnterAction({rightPanel: "mymazes"}, function () {
	rightPanel.showMyMazes();
    });
    roboStateSpace.addLeaveAction({rightPanel: "mymazes"}, function () {
	mazeList.abortLoad();
    });

    roboStateSpace.addEnterAction({rightPanel: "pubmazes"}, function () {
	rightPanel.showPubMazes();
    });
    roboStateSpace.addLeaveAction({
	rightPanel: "pubmazes"
    }, {
	user: "logged-on"
    }, function () {
	console.debug("here");
	rightPanel.showPubMazes();
    });
    roboStateSpace.addLeaveAction({rightPanel: "pubmazes"}, function () {
	pubMazeList.abortLoad();
    });

    roboStateSpace.addEnterAction({rightPanel: "rankings"},  function () {
	rightPanel.showRankings();
    });
    roboStateSpace.addLeaveAction({rightPanel: "rankings"}, function () {
	if (rightPanel.rankingsRequest) {
	    rightPanel.rankingsRequest.abort();
	}
    });

    roboStateSpace.addEnterAction({rightPanel: "news"}, function () {
	rightPanel.showNews();
    });

    //
    // Right panel buttons
    //

    request.
	event("browsemy-button", "click").
	success(function () {
	    if (user.username) {
		roboState.mutate({rightPanel: "mymazes"});
	    }
	}).
	send();

    request.
	event("browsepub-button", "click").
	success(function () {
	    roboState.mutate({rightPanel: "pubmazes"});
	}).
	send();

    request.
	event("news-button", "click").
	success(function () {
	    roboState.mutate({rightPanel: "news"});
	}).
	send();

    request.
	event("overall-button", "click").
	success(function () {
	    roboState.mutate({rightPanel: "rankings"});
	}).
	send();

    //
    // Left panel
    //

    var leftPanel = pane.specialise({
	newMaze: function () {
	    mazeInfo.reset();
	    maze = robo.maze.genericMaze.create(10, 10);
	    mazeEditor.setMaze(maze);
	    mazeEditor.activate();
	    mazeEditor.paint();
	    roboState.mutate({leftPanel: "edit"});
	}
    }).init("left-panel");

    roboStateSpace.addEnterAction({leftPanel: "help"}, function () {
	leftPanel.
	    setTitle(MSG.HELP).
	    setContent("help");
	hideMaze();
    });

    roboStateSpace.addEnterAction({leftPanel: "preview"}, function () {
      	leftPanel.
	    setTitle(MSG.MAZE_PREVIEW).
	    setContent("previewmaze");
	mazeEditor.deactivate();
	$("preview-title").innerHTML = mazeInfo.info.title;
	$("preview-description").innerHTML = mazeInfo.info.description;
	showMaze();
    });

    roboStateSpace.addEnterAction({leftPanel: "preview-loading"}, function () {
	leftPanel.
	    setTitle(MSG.MAZE_PREVIEW).
	    setContent("loadingmaze");
	hideMaze();
    });
    roboStateSpace.addLeaveAction({leftPanel: "preview-loading"}, function () {
	mazeInfo.abortLoad();
    });

    roboStateSpace.addEnterAction({leftPanel: "edit"}, function () {
	leftPanel.
	    setTitle(MSG.MAZE_EDITOR).
	    setContent("editmaze");
        $("mazeinfo-form").title.value = mazeInfo.info.title;
        $("mazeinfo-form").description.value = mazeInfo.info.description;
	$("mazeinfo-form").chipcost.value = maze.costs.chip;
	$("mazeinfo-form").stepcost.value = maze.costs.step;
	mazeEditor.activate();
	showMaze();
    });

    roboStateSpace.addEnterAction({leftPanel: "run"}, function () {
	leftPanel.
	    setTitle(MSG.MAZE_PLAYER).
	    setContent("runmaze");
	$("maze-title").innerHTML = mazeInfo.info.title;
	$("maze-description").innerHTML = mazeInfo.info.description;
	$("maze-chipcost").innerHTML = maze.costs.chip;
	$("maze-stepcost").innerHTML = maze.costs.step;
	/*if (mazeInfo.info.type === "pubmaze" && user.username) {
	    showBlock("rating-score");
	    $("lowscore").innerHTML = mazeInfo.info.score || "none";
	    $("rating-form").rating.value = mazeInfo.info.rating || "null";
	}
	else {
	    hideElement("rating-score");
	}*/
	mazeEditor.deactivate();
	showMaze();
    });

    roboStateSpace.addEnterAction({leftPanel: "rankings"}, function () {
	leftPanel.
	    setTitle(MSG.MAZE_RANKINGS).
	    setContent("rankings");
	hideMaze();
	loadingMsg("rankings-table", "LOADING_RANKINGS");
	JR.rankings().
	    success(function(lst) {
		$("rankings-table").innerHTML = "";
		lst.loop(function (data, i) {
		    var row = tr(
			{
			    "class": (i % 2) ? "row-even" : "row-odd"
			},
			td({"class":"col-rankings-rank"}, (i + 1).toString()),
			td({"class":"col-rankings-user"}, data.user),
			td({"class":"col-rankings-score"}, data.score.toString()),
			td({"class":"col-rankings-points"}, data.points.toFixed(3))
		    );
		    $("rankings-table").appendChild(row);
		});
	    }).
	    error(errorMsg("rankings-table")).
	    send();
    });

    roboStateSpace.addLeaveAction({leftPanel: "rankings"}, function () {
	// TODO: abort rankings request
    });

    //
    // Left panel buttons
    //

    request.
	event("help-button", "click").
	success(function () {
	    roboState.mutate({leftPanel: "help"});
	}).
	send();

    request.
	event("new-button", "click").
	success(leftPanel.newMaze).
	send();

    request.
	event("edit-button", "click").
	success(function () {
	    if (mazeInfo.info.type === "pubmaze") {
		return;
	    }
	    roboState.mutate({leftPanel: "edit"});
	    mazeEditor.setMaze(maze);
	    mazeEditor.activate();
	    mazeEditor.paint();
	}).
	send();

    request.
	event("play-button", "click").
	success(function() {
	    if (maze.getCount("robot") !== 1) {
		alert("need exactly one robot for now.");
		return;
	    }
	    roboState.mutate({leftPanel: "run", rightPanel: "board"});
	    run.setMaze(maze);
	    run.restart();
	    mazeEditor.deactivate();
	    run_btns.restart.deactivate();
	    run_btns.step.activate()
	    run_btns.play.activate();
	    boardeditor.activate();
	    hideElement("publish-button");
	}).
	send();

    request.
	event("rankings-button", "click").
	success(function() {
	    if (mazeInfo.info.type !== "pubmaze") {
		return;
	    }
	    roboState.mutate({leftPanel: "rankings"});
	}).
	send();
    
    //
    // Maze moderation
    //
    
    request.
	event("moderate-submit", "click").
	continue_if(function () {
	    if ($("moderate-decision").value === "NONE" || !$("moderate-comment").value) {
		errorAlert({'error': 'SELECT_DECISION_AND_WRITE_COMMENT'})
		return false;
	    }
	    return true;
	}).
	then(JR.moderateMaze).
	success(function (result) {
	    switch (result.status) {
	    case "ACCEPT":
		roboState.mutate({maze: "published"});
		successAlert("MAZE_ACCEPTED")();
		break;
	    case "REJECT":
		leftPanel.newMaze();
		successAlert("MAZE_REJECTED")();
		break
	    case "IMPROVE":
		leftPanel.newMaze();
		successAlert("IMPROVEMENT_REQUESTED")();
		break
	    }
	    pubMazeList.load().
		success(updatePubMazeList).
		send();
	}).
	error(errorAlert).
	send();
    
    //
    // Callback functions called when playing a maze and an outcome has
    // been reached.
    //

    run.onWin = function () {
	if (user.username && mazeInfo.info.type === "maze") {
	    showBlock("publish-button");
	}
	var score = board.cost(maze.costs) + run.time*maze.costs.step;
	mazeInfo.info.score = score;
	if (user.username && mazeInfo.info.type === "pubmaze") {
	    JR.submitScore().
		success(function (res) {
		    alert("You scored " + score +
			  (res.lowscore ? ". This is a new lowscore!" : ".") +
			  (res.user_lowscore ? " This is a new personal lowscore!":"")
			 );
		    if (res.user_lowscore) {
			mazeInfo.info.score = score;
			$("lowscore").innerHTML = score;
		    }
		}).
		error(errorAlert).
		send();
	}
	else {
	    alert ("You scored " + score);
	}
    };

    run.onLose = function () {
	alert("You lose!");
    };

    run.onBusy = function () {
	alert("You are stuck in a loop!");
    }

    //
    // Publish button
    //

    request.
	event("publish-button", "click").
	continue_if(confirmDialog("CONFIRM_PUBLISH")).
	then(function () { return mazeInfo.save_maze(); }).
	then(JR.publishMaze).
	error(errorAlert).
	success(successAlert("MAZE_PUBLISHED")).
	send();

    //
    // Delete maze button
    //

    request.
	event("delete-maze-button", "click").
	continue_if(confirmDialog("CONFIRM_DELETE")).
	then(JR.deleteMaze).
	success(function () {
	    roboState.mutate({leftPanel: "help", rightPanel: "mymazes"});
	}).
	error(errorAlert).
	send();

    //
    // Save working board button
    //

    request.
	event("save-board-button", "click").
	continue_if(function () { return user.username; }).
	continue_if(confirmDialog("CONFIRM_SAVE_WORKING_BOARD")).
	then(JR.saveWorkingBoard).
	error(errorAlert).
	success(successAlert("WORKING_BOARD_SAVED")).
	send();

    //
    // Load working board button
    //

    request.
	event("load-board-button", "click").
	continue_if(confirmDialog("CONFIRM_LOAD_WORKING_BOARD")).
	then(JR.getWorkingBoard).
	success(function (data) {
	    board.fromJSON(JSON.parse(data));
	    boardeditor.paint();
	}).
	error(errorAlert).
	send();

    //
    // Load solution button
    //

    request.
	event("load-solution-button", "click").
	continue_if(confirmDialog("CONFIRM_LOAD_SOLUTION")).
	then(JR.getSolution).
	success(function (data) {
	    board.fromJSON(JSON.parse(data));
	    boardeditor.paint();
	}).
	send();

    //
    // Rating control
    //

    request.
	event($("rating-form").rating, "change").
	continue_if(function () {
	    return user.username && mazeInfo.info.score;
	}).
	then(JR.setRating).
	success(successAlert("RATING_UPDATED")).
	send();

    //
    // Maze info controls
    //

    request.
	event($("mazeinfo-form").title, "change").
	success(function (ev) {
	    mazeInfo.info.title = ev.target.value;
	}).
	send();

    request.
	event($("mazeinfo-form").description, "change").
	success(function (ev) {
	    mazeInfo.info.description = ev.target.value;
	}).
	send();
    
    request.
	event($("mazeinfo-form").chipcost, "change").
	success(function (ev) {
	    maze.costs.chip = parseInt(ev.target.value);
	}).
	send();

    request.
	event($("mazeinfo-form").stepcost, "change").
	success(function (ev) {
	    maze.costs.step = parseInt(ev.target.value);
	}).
	send();
    
    //
    // user management
    //

    function draw_userinfo(register) {
	if (user.error) {
            $("userinfo-error").style.display = "inline";
            $("userinfo-error").innerHTML = user.error;
            user.error = null;
	}
	else {
            $("userinfo-error").style.display = "none";
	}
	if (register) {
            $("userinfo-login").style.display = "none";
            $("userinfo-register").style.display = "block";
            $("userinfo-info").style.display = "none";
	}
	else if (user.username) {
            $("userinfo-login").style.display = "none";
            $("userinfo-register").style.display = "none";
            $("userinfo-info").style.display = "block";
            $("userinfo-username").innerHTML = user.username;
	}
	else {
            $("userinfo-login").style.display = "block";
            $("userinfo-register").style.display = "none";
            $("userinfo-info").style.display = "none";
	}
    }

    function init_userinfo() {
	var loginform = $("login-form");
	var registerform = $("register-form");

	request.
	    event(loginform, "submit").
	    success(function(ev) {
		ev.preventDefault();
		jsonPOST("login", {
		    username: loginform.username.value,
		    pwd: loginform.pwd.value
		}, function(res) {
		loginform.reset();
                    user = res;
		    if (user.username) {
			roboState.mutate({user: "logged-on"});
		    }
                    draw_userinfo();
		});
	    }).
	    send();

	request.
	    event("logout-button", "click").
	    success(function(ev) {
		ev.preventDefault();
		document.location.reload();
		/*jsonPOST("logout", null, function(res) {
		  user = res;
		  draw_userinfo();
		  rightPanel.showList();
		  leftPanel.showPreview();
		  });*/
	    }).
	    send();
	
	request.
	    event("setemail-button", "click").
	    success(function (ev) {
		ev.preventDefault();
		var email = prompt("Please enter your email address.  An email will be sent to this address for confirmation.");
		if (email) {
		    JR.setUserEmail(email).send();
		}
	    }).
	    send();
	
	request.
	    event(registerform, "submit").
	    success(function(ev) {
		ev.preventDefault();
		jsonPOST("register", {
		    username:registerform.username.value,
		    pwd:registerform.pwd.value
		}, function(res) {
		    registerform.reset();
		    user = res;
		    draw_userinfo(res);
		});
	    }).
	    send();

	request.
	    event("register-button", "click").
	    success(function(ev) {
		ev.preventDefault();
		draw_userinfo(true);
	    }).
	    send();

	request.
	    event("login-button", "click").
	    success(function(ev) {
		ev.preventDefault();
		draw_userinfo();
	    }).
	    send();
    }

    //
    // Maze management
    //

    var mazeTypeState = state.specialise().init();

    roboStateSpace.addEnterAction({
	user: "anonymous"
    }, function () {
	hideElement("load-board-button",
		    "save-board-button",
		    "delete-maze-button",
		    "load-solution-button",
		    "rating-score",
		    "moderate");
    });

    roboStateSpace.addEnterAction({
	user: "logged-on",
	maze: "saved"
    }, function () {
	showBlock("load-board-button",
		  "save-board-button",
		  "delete-maze-button");
    });
    roboStateSpace.addLeaveAction({
	user: "logged-on",
	maze: "saved"
    }, function () {
	hideElement("load-board-button",
		    "save-board-button",
		    "delete-maze-button");
    });


    roboStateSpace.addEnterAction({
	maze: "published"
    }, function () {
	$("lowscore").innerHTML = mazeInfo.info.score || "none";
	$("rating-form").rating.value = mazeInfo.info.rating || "null";
    });
    roboStateSpace.addEnterAction({
	maze: "published",
	user: "logged-on"
    }, {
	user: "logged-on"
    }, function () {
	mazeInfo.load_pubmaze(mazeInfo.info.id).send();
    });
    roboStateSpace.addEnterAction({
	user: "logged-on",
	maze: "published"
    }, function () {
	showBlock("load-board-button",
		  "save-board-button",
		  "load-solution-button",
		  "rating-score");
    });
    roboStateSpace.addLeaveAction({
	user: "logged-on",
	maze: "published"
    }, function () {
	hideElement("load-board-button",
		    "save-board-button",
		    "load-solution-button",
		    "rating-score");
    });

    roboStateSpace.addEnterAction({
	maze: "unmoderated"
    }, function () {
	if (user.moderator) {
	    showBlock("moderate");
	}
    });

    roboStateSpace.addLeaveAction({
	maze: "unmoderated"
    }, function () {
	hideElement("moderate");
    });
    
    var mazeInfo = {
	info: {type: "maze", title:"", description:"", id:null},
	reset: function () {
	    this.info = {type: "maze", title:"", description:"", id:null};
	    roboState.mutate({maze: "new"});
	},
	load_maze: function (maze_id) {
	    var self = this;
	    this.abortLoad();
	    this.loadRequest = JR.getMaze(maze_id).
		error(errorAlert).
		success(function (info) {
		    var mazedata = JSON.parse(info.data);
		    maze = robo.maze.genericMaze.fromJSON(mazedata.maze);
		    info.type = "maze";
		    self.info = info;
		    delete self.loadRequest;
		    roboState.mutate({maze:"saved"});
		});
	    return this.loadRequest;
	},
	save_maze: function (success, error) {
	    var self = this;
	    var save_args = {};
	    var mazeinfo = this.info;
	    var validate = function (success, error) {
		if (!user.username) {
		    return error("You must log in to save a maze");
		}
		else if (!mazeinfo.title) {
		    return error("You must give the maze a title");
		}
		else if (!mazeinfo.description) {
		    return error("You must give the maze a description");
		}
		else if (mazeinfo.type === "pubmaze") {
		    return error("You cannot save a published maze");
		}
		mazeinfo.owner = user.username;
		return success();
	    };
	    return request.
		func(validate).
		then(JR.saveMaze).
		success(function (res) {
                    mazeinfo.id = res.id;
		    roboState.mutate({maze: "saved"});
		});
	},
	load_pubmaze: function (pubmaze_id) {
	    var self = this;
	    this.abortLoad();
	    this.loadRequest = JR.getPublishedMaze(pubmaze_id).
		error(errorAlert).
		success(function (info) {
		    var mazedata = JSON.parse(info.data);
		    maze = robo.maze.genericMaze.fromJSON(mazedata.maze);
		    info.type = "pubmaze";
		    self.info = info;
		    delete self.loadRequest;
		    if (info.moderated_by) {
			roboState.mutate({maze: "published"});
		    } else {
			roboState.mutate({maze: "unmoderated"});
		    }
		});
	    return this.loadRequest;
	},
	abortLoad: function () {
	    if (this.loadRequest) {
		this.loadRequest.abort();
		delete self.loadRequest;
	    }
	},
	setup_maze: function () {
	    var mazeinfo = this.info;
	    painter.paint_maze(mazeCanvas, maze);
	    roboState.mutate({leftPanel: "preview"});
	}
    };

    //
    // List of all personal mazes
    //

    var mazeList = {
	list: [],
	load: function () {
	    var self = this;
	    this.abortLoad();
	    this.loadRequest = JR.mazeList().
		success(function (res) {
		    self.list = res;
		});
	    return this.loadRequest;
	},
	abortLoad: function () {
	    if (this.loadRequest) {
		this.loadRequest.abort();
		delete this.loadRequest;
	    }
	}
    };

    var updateMazeList = function () {
	var rowid = function(info) { return "mazerow-" + info.id; };
	var btnid = function(info) { return "mazebtn-" + info.id; };
	$("mazelist").innerHTML = "";
	mazeList.list.loop(function(info, i) {
	    var edit_btn = span(
		{"class":"button", id:btnid(info)},
		info.title
	    );
	    var row = tr(
		{
		    "class": i % 2 ? "row-even" : "row-odd",
		    id: rowid(info)
		},
	        td({"class":"col-maze-title"}, edit_btn),
		td({"class":"col-maze-author"}, info.owner),
		td({"class":"col-maze-description"}, info.description)
	    );
	    $("mazelist").appendChild(row);

	    request.
		event(edit_btn, "click").
		success(function(ev) {
		    var currowid = mazeInfo.info.rowid;
		    if (currowid && mazeInfo.info.type === "maze") {
			removeClass(currowid, "selected-maze");
		    }
		    addClass(rowid(info), "selected-maze");
		    roboState.mutate({leftPanel: "preview-loading"});
		}).
		then(mazeInfo.load_maze(info.id)).
		success(function () {
		    mazeInfo.setup_maze();
		    mazeInfo.info.rowid = rowid(info);
		}).
		send();
        });
	if (mazeInfo.info.rowid && mazeInfo.info.type === "maze") {
	    addClass(mazeInfo.info.rowid, "selected-maze");
	}
    };

    //
    // List of all published mazes
    //

    var pubMazeList = {
	list: [],
	sortKey: null,
	reversed: false,
	load: function () {
	    var self = this;
	    this.sortKey = null;
	    this.reversed = false;
	    this.abortLoad();
	    this.loadRequest = JR.publishedMazeList().
		success(function (res) {
		    self.list = res;
		});
	    return this.loadRequest;
	},
	abortLoad: function () {
	    if (this.loadRequest) {
		this.loadRequest.abort();
		delete this.loadRequest;
	    }
	},
	sort: function (key) {
	    if (key === this.sortKey) {
		this.list.reverse();
		this.reversed = !this.reversed;
		return;
	    }
	    this.list.sort(keyCmp(key))
	    this.sortKey = key;
	    this.reversed = false;
	}
    };

    var updatePubMazeList = function () {
	var rowid = function(info) { return "pubmazerow-" + info.maze; };
	var btnid = function(info) { return "pubmazebtn-" + info.maze; };
	$("pubmazelist").innerHTML = "";
	pubMazeList.list.loop(function(info, i) {
	    var edit_btn = span({
		"class": info.moderated_by ? "button" : "button-attn",
		 id:btnid(info)
	    },info.title);
	    var rating = info.avgrating ? info.avgrating.toFixed(1) : "-";
	    var lowscore = info.lowscore ? info.lowscore.toString() : "-";
	    var score = info.score ? info.score.toString() : "-";
	    var pubdate = info.pubdate.split(" ", 1)[0];
	    var points = info.score ? info.lowscore / info.score : 0;
	    var row = tr(
		{
		    "class": i % 2 ? "row-even" : "row-odd",
		    id: rowid(info)
		},
	        td({"class":"col-maze-title"}, edit_btn),
		td({"class":"col-maze-author"}, info.author),
		td({"class":"col-maze-lowscore"}, lowscore),
		td({"class":"col-maze-score"}, points ? points.toFixed(3): "-"),
		td({"class":"col-maze-avgrating"}, rating),
		td({"class":"col-maze-pubdate"}, pubdate)
	    );
	    info.points = points;
	    $("pubmazelist").appendChild(row);

	    request.
		event(edit_btn, "click").
		success(function(ev) {
		    var currowid = mazeInfo.info.rowid;
		    if (currowid && mazeInfo.info.type === "pubmaze") {
			removeClass(currowid, "selected-maze");
		    }
		    addClass(rowid(info), "selected-maze");
		    roboState.mutate({leftPanel: "preview-loading"});
		}).
		then(mazeInfo.load_pubmaze(info.maze)).
		success(function () {
		    mazeInfo.setup_maze();
		    mazeInfo.info.rowid = rowid(info);
		}).
		send();
        });
	if (mazeInfo.info.rowid && mazeInfo.info.type === "pubmaze") {
	    addClass(mazeInfo.info.rowid, "selected-maze");
	}
    };

    function init_mazeinfo() {
	var form = $("mazeinfo-form");

	request.
	    event(form, "submit").
	    success(function(ev) {
		ev.preventDefault();
		mazeInfo.save_maze().
		    error(errorAlert).
		    success(successAlert("MAZE_SAVED")).
		    send();
	    }).
	    send();
    }

    init_userinfo();
    init_mazeinfo();
    jsonPOST("logout", null, function(res) {
	user = res;
	draw_userinfo();
	roboState.init();
    });
};
