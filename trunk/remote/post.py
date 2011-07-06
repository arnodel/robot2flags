import web
import time

try:
    import json
except ImportError:
    # For older Python - assuming django is installed
    from django.utils import simplejson as json

try:
    import hashlib
except ImportError:
    # For older Python
    import md5 as hashlib

import datetime
from decorators import checkuser
from maze import Maze, CircuitBoard, run_maze, MazeRunError

def hashpwd(pwd):
    return hashlib.md5(pwd).hexdigest()
  
def login(username, pwd):
    r = web.ctx.db.select(
        "users",
        {"username": username, "pwd": hashpwd(pwd)},
        where="username=$username AND pwd=$pwd")
    if r:
        for row in r:
            moderator = row.moderator
        web.ctx.session.username = username
        web.ctx.session.moderator = moderator;
        return {"username": username, "moderator": moderator}
    else:
        return {"error": "INCORRECT_CREDENTIALS"}

def logout():
    if hasattr(web.ctx.session, "username"):
        del web.ctx.session.username
    if hasattr(web.ctx.session, "moderator"):
        del web.ctx.session.moderator
    return {"username": None}

def register(username, pwd):
    r = web.ctx.db.select("users",
        {"username": username},
        where="username=$username")
    if r:
        # User exists
        return {"error": "USERNAME_EXISTS"}
    # OK, create user
    pwd = hashpwd(pwd)
    web.ctx.db.insert("users", username=username, pwd=pwd)
    web.ctx.session.username = username
    return {"username": username}

@checkuser
def savemaze(id, user, title, description, data):
    #if user != web.ctx.session.username:
    #    return {"error": "user inconsistency"}
    if id:
        r = web.ctx.db.where("mazes", id=id)
        try:
            maze_owner = r[0].owner
        except IndexError:
            return {"error": "INCORRECT_MAZE_ID"}
        if maze_owner != user:
            return {"error": "USER_DOES_NOT_OWN_MAZE"}
        web.ctx.db.update(
            "mazes", vars={"id":id}, where="id=$id",
            title=title, description=description, data=data
        )
    else:
        id = web.ctx.db.insert(
            "mazes",
            owner=user, title=title, description=description, data=data
        )
    return {"id": id}

@checkuser
def deletemaze(id, user):
    n = web.ctx.db.delete("mazes",
        where="id=$id AND owner=$user",
        vars={"id": id, "user": user}
    )
    if n:
        return {}
    else:
        return {"error": "CANNOT_DELETE_MAZE"}

@checkuser
def publishmaze(id, user):
    r = web.ctx.db.where("mazes", id=id)
    try:
        row = r[0]
    except IndexError:
        return {"error": "INCORRECT_MAZE_ID"}
    if row.owner != user:
        return {"error": "USER_DOES_NOT_OWN_MAZE"}
    id = web.ctx.db.insert("published_mazes",
                      title=row.title,
                      description=row.description,
                      owner=user,
                      date=datetime.datetime.now(),
                      data=row.data)
    return {id: id}

@checkuser
def setrating(mazeid, user, rating):
    n = web.ctx.db.update("usermazedata", vars={"id":mazeid, "user":user},
                          where="maze=$id AND user=$user",
                          rating=rating)
    if n == 0:
        return {"error": "UNSOLVED_MAZE"}
    else:
        r = web.ctx.db.query(
            """SELECT SUM(rating) as sumratings, COUNT(rating) as countratings
            FROM usermazedata
            WHERE maze=$id""", vars={"id": mazeid})
        vals = r[0]
        r = web.ctx.db.update("published_mazes", vars={"id": mazeid},
                              where="id=$id",
                              sumratings=vals.sumratings,
                              countratings=vals.countratings)
        return {}

@checkuser
def submitscore(mazeid, user, score, solution=None):
    r = web.ctx.db.where("published_mazes", what="lowscore,data", id=mazeid)
    try:
        row = r[0]
    except IndexError:
        return {"error": "INCORRECT_MAZE_ID"}
    lowscore = row.lowscore
    maze_data = json.loads(row.data)
    maze = Maze.fromJSON(maze_data["maze"])
    board = CircuitBoard.fromJSON(json.loads(solution))
    # check that solution is valid
    try:
        time = run_maze(maze, board)
    except MazeRunError, e:
        return {"error": e.args[0]}
    server_score = board.cost(maze.costs) + time*maze.costs["step"]
    if score != server_score:
        return {"error": "INCONSISTENT_SCORES"}
    r = web.ctx.db.where("usermazedata", what="score", user=user, maze=mazeid)
    try:
        user_lowscore = r[0].score
    except IndexError:
        web.ctx.db.insert("usermazedata",
            user=user,
            maze=mazeid,
            score=score,
            solution=solution
        )
        return {
            "user_lowscore": True,
            "lowscore": lowscore is None or score < lowscore
        }
    if user_lowscore is None or score < user_lowscore:
        web.ctx.db.update("usermazedata", vars={"id":mazeid, "user":user},
            where="maze=$id AND user=$user",
            score=score,
            solution=solution
        )
    if lowscore is None or score < lowscore:
        web.ctx.db.update("published_mazes", vars={"id":mazeid},
            where="id=$id",
            lowscore=score,
        )
    return {
        "user_lowscore": score < user_lowscore,
        "lowscore": lowscore is None or score < lowscore
    }
       
@checkuser
def saveworkingboard(user, board):
    count = web.ctx.db.update("users", vars={"user":user},
        where="username=$user",
        working_board=board
    )
    if count == 1:
        return {}
    else:
        return {"error": "DATABASE_ERROR"}

@checkuser
def saveboard(user, board, title, maze=None, pubmaze=None):
    where = "user=$user AND title=$title"
    if maze is not None:
        where += " AND maze=$maze"
    elif pubmaze is not None:
        where += " AND pubmaze=$pubmaze"
    else:
        return {"error": "NO_MAZE_OR_PUBMAZE_ID"}
    count = web.ctx.db.update("saved_boards",
        vars=locals(),
        where=where,
        data=board
    )
    if count:
        return {}
    web.ctx.db.insert("saved_boards",
        user=user,
        title=title,
        data=board,
        maze=maze,
        pubmaze=pubmaze
    )
    return {}

@checkuser
def moderate(user, mazeid, decision, comment):
    if not web.ctx.session.moderator:
        return {"error": "USER_MUST_BE_MODERATOR"}
    r = web.ctx.db.where("published_mazes", id=mazeid)
    # Return error if maze has already been moderated or removed
    for row in r:
        if row.moderated_by is None:
            break
    else:
        return {"error": "MAZE_ALREADY_MODERATED"}
    maze_info = dict(row)
    if decision == "ACCEPT":
        r = web.ctx.db.update("published_mazes",
                vars={"id": mazeid},
                where="id=$id",
                moderated_by=web.ctx.session.username)
    elif decision == "REJECT" or decision == "IMPROVE":
        r = web.ctx.db.delete("published_mazes", 
                vars={"id": mazeid},
                where="id=$id")
    if not r:
        return {"error": "MAZE_ALREADY_MODERATED"}
    return {"status": decision}

@checkuser
def setemail(user, email):
    # Create a randomish token
    token = hashlib.md5(str(time.time())).hexdigest()
    print "token", token
    web.ctx.db.insert("email_tokens",
                   token=token,
                   user=user,
                   email=email)
    token_addr = web.ctx.home + "/confirm/?token=" + token
    web.sendmail('arno@marooned.org.uk', [email], '[robot2flags] Request to link email to account',
"""Hi,

It appears you have requested to link your robot2flags account '%s'
to this email address (%s).

To confirm, follow this link:

    %s

You can safely ignore this message if you have not made this request.

Please email arno@marooned.org.uk if you have problems or queries.
""" % (user, email, token_addr))
    return {"status": "OK"}