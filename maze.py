try:
    from collections import defaultdict
except:
    class defaultdict(dict):
        def __init__(self, default_factory=None, *a, **kw):
            if (default_factory is not None and
                not hasattr(default_factory, '__call__')):
                raise TypeError('first argument must be callable')
            dict.__init__(self, *a, **kw)
            self.default_factory = default_factory
        def __getitem__(self, key):
            try:
                return dict.__getitem__(self, key)
            except KeyError:
                return self.__missing__(key)
        def __missing__(self, key):
            if self.default_factory is None:
                raise KeyError(key)
            self[key] = value = self.default_factory()
            return value
        def __reduce__(self):
            if self.default_factory is None:
                args = tuple()
            else:
                args = self.default_factory,
            return type(self), args, None, None, self.items()
        def copy(self):
            return self.__copy__()
        def __copy__(self):
            return type(self)(self.default_factory, self)
        def __deepcopy__(self, memo):
            import copy
            return type(self)(self.default_factory,
                              copy.deepcopy(self.items()))
        def __repr__(self):
            return 'defaultdict(%s, %s)' % (self.default_factory,
                                            dict.__repr__(self))

RED, YELLOW, BLUE = 0, 1, 2

def enum_matrix(mat):
    for y, row in enumerate(mat):
        for x, val in enumerate(row):
            yield x, y, val

class Location(object):
    def __init__(self, x, y):
        self.x = x
        self.y = y

def same_location(a, b):
    return a.x == b.x and a.y == b.y

#
# Maze stuff
#

class Maze(object):
    @classmethod
    def fromJSON(cls, json_maze):
        maze = Maze()
        maze.height = len(json_maze["floors"])
        maze.width = len(json_maze["floors"][0])
        maze.floors = json_maze["floors"]
        maze.hwalls = json_maze["hwalls"]
        maze.vwalls = json_maze["vwalls"]
        maze.objects = []
        maze.obj_count = defaultdict(int)
        maze.costs = json_maze.get("costs", {"chip": 10, "step": 1})
        for json_obj in json_maze["objects"]:
            maze.add_object(MazeObject.fromJSON(json_obj))
        return maze

    # object management methods

    def add_object(self, obj):
        self.remove_object_at(obj)
        self.objects.append(obj)
        self.obj_count[obj.name] += 1

    def remove_object_at(self, loc):
        for i, obj in enumerate(self.objects):
            if same_location(obj, loc):
                del self.objects[i]
                self.obj_count[obj.name] -= 1

    def get_object_at(self, loc):
        for obj in self.objects:
            if same_location(obj, loc):
                return obj

    # Floor methods

    def get_floor_at(self, loc):
        return self.floors[loc.y][loc.x]

    def set_floor_at(self, loc, val):
        self.floors[loc.y][loc.x] = val

    # Wall methods

    def get_vwall_at(self, loc):
        return self.vwalls[loc.y][loc.x]

    def set_vwall_at(self, loc, val):
        self.vwalls[loc.y][loc.x] = val

    def get_hwall_at(self, loc):
        return self.hwalls[loc.y][loc.x]

    def set_hwall_at(self, loc, val):
        self.hwalls[loc.y][loc.x] = val

    def facing_wall(self, obj):
        if obj.dir % 2:
            return self.hwalls[obj.y + (obj.dir == 1)][obj.x]
        else:
            return self.vwalls[obj.y][obj.x + (obj.dir == 0)]

    # Methods to run the maze

    def resolve_conflicts(self, t):
        obj_hash = {}
        for obj in self.objects:
            i = (obj.x + obj.vx*t), (obj.y + obj.vy*t)
            obj1 = obj_hash.get(i)
            if obj1:
                if obj1.name > obj.name:
                    obj, obj1 = obj1, obj
                if obj1.name == "flag" and obj.name == "robot":
                    obj1.kill = True
                    obj_hash[i] = obj
                else:
                    raise UnresolvedConflict(obj.name, obj1.name)
            else:
                obj_hash[i] = obj

    def kill_dead_objects(self):
        new_objects = []
        for obj in self.objects:
            if obj.kill:
                self.obj_count[obj.name] -= 1
            else:
                new_objects.append(obj)
        self.objects = new_objects

    def update_objects(self):
        for obj in self.objects:
            if obj.painting is not None:
                self.set_floor_at(obj, obj.painting)
            obj.x += obj.vx
            obj.y += obj.vy
            if not(0 <= obj.x < self.width and 0 <= obj.y < self.height):
                obj.kill = True
            obj.dir = (obj.dir + obj.rot) % 4
            obj.rest()
            
class MazeObject(object):
    def __init__(self, name, x=0, y=0, dir=0, rot=0, vx=0, vy=0):
        self.name = name
        self.x = x
        self.y = y
        self.dir = dir
        self.rot = rot
        self.vx = vx
        self.vy = vy
        self.painting = None
        self.kill = False
    
    @classmethod
    def fromJSON(cls, json_obj):
        json_obj = dict((str(k), v) for k, v in json_obj.iteritems())
        return cls(**json_obj)
        
    def rest(self):
        self.vx = 0
        self.vy = 0
        self.rot = 0
        self.painting = None

    def move_forward(self):
        self.vx, self.vy = [(1, 0), (0, 1), (-1, 0), (0, -1)][self.dir]

    def turn_left(self):
        self.rot = -1

    def turn_right(self):
        self.rot = 1

    def paint(self, col):
        self.painting = col

#
# Circuit board stuff
#

class Chip(object):
    def __init__(self, name, run, is_test=False, time=0):
        self.name = name
        self.run = run
        self.is_test = is_test
        self.time = time

def run_nochip(state):
    return 0

def run_wallp(state):
    return "NY"[state.maze.facing_wall(state.obj)]

def run_move(state):
    if not state.maze.facing_wall(state.obj):
        state.obj.move_forward()
    return 0

def run_left(state):
    state.obj.turn_left()
    return 0

def run_right(state):
    state.obj.turn_right()
    return 0

def run_start(state):
    return 0

def run_paintRed(state):
    state.obj.paint(RED)
    return 0

def run_paintYellow(state):
    state.obj.paint(YELLOW)
    return 0

def run_paintBlue(state):
    state.obj.paint(BLUE)
    return 0

def run_redp(state):
    return "NY"[state.maze.get_floor_at(state.obj) == RED]

def run_yellowp(state):
    return "NY"[state.maze.get_floor_at(state.obj) == YELLOW]

def run_bluep(state):
    return "NY"[state.maze.get_floor_at(state.obj) == BLUE]

chip_data = (
    ("nochip", {}),
    ("start", {}),
    ("move", {"time": 1}),
    ("left", {"time": 1}),
    ("right", {"time": 1}),
    ("paintRed", {"time": 1}),
    ("paintYellow", {"time": 1}),
    ("paintBlue", {"time": 1}),
    ("wallp", {"is_test": True}),
    ("redp", {"is_test": True}),
    ("yellowp", {"is_test": True}),
    ("bluep", {"is_test": True})
)
    
chips = dict((name, Chip(name, globals()["run_"+name], **prop))
             for name, prop in chip_data)

no_chip = chips["nochip"]

class TransObject(object):
    def __init__(self, x, y):
        self.start = Location(x, y)
        self.end = Location(x, y)
        
def translate(t, x, y):
    tr = TransObject(x, y)
    if (t == "E"):
        tr.end.x += 1
        tr.orient = 0
    elif t == "W":
        tr.end.x -= 1
        tr.orient = 2
    elif t == "N":
        tr.end.y -= 1
        tr.orient = 3
    elif t == "S":
        tr.end.y += 1
        tr.orient = 1
    else:
        return None
    return tr

class CircuitBoard(object):
    def __init__(self, width=9, height=9):
        self.chips = [[no_chip]*width for _ in range(height)]
        self.transitions = {
            0: [[0]*width for _ in range(height)],
            "Y": [[0]*width for _ in range(height)],
            "N": [[0]*width for _ in range(height)]
        }
    
    @classmethod
    def fromJSON(cls, json_board):
        board = CircuitBoard(json_board["width"], json_board["height"])
        for data in json_board["chips"]:
            board.chips[data["y"]][data["x"]] = chips[data["chip"]]
            if data["chip"] == "start":
                board.start = Location(data["x"], data["y"])
        for data in json_board["transitions"]:
            board.transitions[data["type"]][data["y"]][data["x"]] = data["dir"]
        return board

    def cost(self, chip_prices=None, trans_prices=None):
        cost = 0
        if chip_prices:
            default = chip_prices.get("chip", 0)
            for x, y, chip in enum_matrix(self.chips):
                if chip.name != "nochip":
                    cost += chip_prices.get(chip.name, default)
        if trans_prices:
            raise NotImplemented
        return cost

    def get_chip(self, loc):
        return self.chips[loc.y][loc.x]

    def get_transition(self, val, loc):
        return translate(self.transitions[val][loc.y][loc.x], loc.x, loc.y)

#
# Running the maze with a circuit board
#

class Thread(object):
    def __init__(self, board, maze, obj):
        self.board = board
        self.maze = maze
        self.obj = obj
        self.reset_loc()
    
    def reset_loc(self):
        self.loc = self.board.start

    def step(self):
        chiploc = self.loc
        chip = self.board.get_chip(chiploc)
        trtype = chip.run(self)
        tr = self.board.get_transition(trtype, chiploc)
        if tr:
            self.loc = tr.end
        else:
            self.reset_loc()
        return chip.time

class MazeRunError(Exception):
    pass

class MazeRun(object):
    def __init__(self, maze, board):
        self.maze = maze
        self.board = board
        for i, obj in enumerate(maze.objects):
            if obj.name == "robot":
                robotindex = i
                break
        else:
            raise NoRobot
        self.thread = Thread(board, maze, obj)

    def step(self):
        maze = self.maze
        if not maze.obj_count["robot"]:
            raise MazeRunError("dead robot")
        dt = self.thread.step()
        if dt:
            maze.resolve_conflicts(0.5)
            maze.kill_dead_objects()
            maze.update_objects()
            maze.resolve_conflicts(0)
            maze.kill_dead_objects()
        return dt

def run_maze(maze, board):
    run = MazeRun(maze, board)
    t = 0
    instant_steps = 0
    while True:
        if instant_steps > 100:
            raise MazeRunError("busy loop")
        dt = run.step()
        if dt:
            t += 1
            instant_steps = 0
        else:
            instant_steps += 1
        if not maze.obj_count["flag"]:
            return t
        if t > 1000:
            raise MazeRunError("Too many steps")
