
var request;

(function () {
    request = {
	capture: function (f) {
	    return captureRequest.specialise({
		request: this,
		capture: f
	    });
	},
	success: function (f) {
	    return successRequest.specialise({
		request: this,
		successAction: f
	    });
	},
	error: function (f) {
	    return errorRequest.specialise({
		request: this,
		errorAction: f
	    });
	},
	then: function (req) {
	    return compoundRequest.specialise({
		r1: this,
		r2: req
	    });
	},
	continue_if: function (f) {
	    return condRequest.specialise({
		request: this,
		condition: f
	    });
	},
	send: function (success, error) {
	    if (success === undefined) {
		success = nop;
	    }
	    if (error === undefined) {
		error = nop;
	    }
	    this._send(success, error);
	    return this;
	},
	//
	// Request objects
	//
	func: function (f) {
	    return request.specialise({_send: f});
	},
	event: function (target, type) {
	    return eventRequest.specialise({
		target: $(target),
		eventType: type
	    });
	},
	timeout: function (time) {
	    return timeoutRequest.specialise({time: time});
	},
	interval: function (time) {
	    return intervalRequest.specialise({time: time})
	},
	jsonPOST: function (url, args) {
	    return jsonPostRequest.specialise({url: url, args: args});
	},
	jsonGET: function (url, args) {
	    return jsonGetRequest.specialise({url: url, args:args});
	}
    };

    var successRequest = request.specialise({
	_send: function (success, error) {
	    var self = this;
	    this.request.send(function () {
		self.successAction.apply(this, arguments);
		return success.apply(this, arguments);
	    }, error);
	},
	abort: function () {
	    this.request.abort();
	}
    });

    var errorRequest = request.specialise({
	_send: function (success, error) {
	    var self = this;
	    this.request.send(success, function () {
		self.errorAction.apply(this, arguments);
	    });
	},
	abort: function () {
	    this.request.abort();
	}
    });

    var condRequest = request.specialise({
	_send: function (success, error) {
	    var self = this;
	    this.request.send(function () {
		if (self.condition.apply(this, arguments)) {
		    return success.apply(this, arguments);
		}
	    }, error);
	},
	abort: function () {
	    this.request.abort();
	}
    });

    var nop = function () {};

    var compoundRequest = request.specialise({
	_send: function (success, error) {
	    var self = this;
	    this.current = this.r1;
	    this.r1.send(function (response) {
		self.current = self.r2;
		if (typeof self.r2 === "function") {
		    self.current = self.r2()
		}
		else {
		    self.current = self.r2
		}
		return self.current.send(success, error);
	    }, error);
	},
	abort: function () {
	    if (this.current) {
		this.current.abort();
	    }
	}
    });

    var jsonPostRequest = request.specialise({
	_send: function (success, error) {
	    var args = this.args;
	    if (typeof args === "function") {
		args = args();
	    }
	    this.client = jsonpost(this.url, args)(success, error);
	},
	abort: function () {
	    if (this.client) {
		this.client.abort();
		delete this.client;
	    }
	}
    });

    var jsonGetRequest = request.specialise({
	_send: function (success, error) {
	    var args = this.args;
	    if (typeof args === "function") {
		args = args();
	    }
	    this.client = jsonget(this.url, args)(success, error);
	},
	abort: function () {
	    if (this.client) {
		this.client.abort();
		delete this.client;
	    }
	}
    });

    var timeoutRequest = request.specialise({
	_send: function (success, error) {
	    this.timeout = setTimeout(success, this.time);
	},
	abort: function () {
	    if (this.timeout) {
		clearTimeout(this.timeout);
		delete this.timeout;
	    }
	}
    });

    var intervalRequest = request.specialise({
	_send: function (success, error) {
	    this.interval = setInterval(success, this.time);
	},
	abort: function () {
	    if (this.interval) {
		clearInterval(this.interval);
		delete this.interval;
	    }
	}
    });

    var eventRequest = request.specialise({
	_send: function (success, error) {
	    this.listener = success;
	    this.target.addEventListener(this.eventType, success, false);
	},
	abort: function () {
	    this.target.removeEventListener(this.listener);
	}
    });
})();
