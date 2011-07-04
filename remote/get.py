import web
from decorators import checkuser

def mazelist():
    fields = "id", "title", "owner", "description"
    try:
        user = web.ctx.session.username
    except AttributeError:
        return []
    r = web.ctx.db.where("mazes",
            what="id, title, owner, description", owner=user)
    return [dict(s) for s in r]

def getmaze(id):
    fields = "id", "title", "description", "owner", "data"
    r = web.ctx.db.where("mazes", id=id)
    if not r:
        return {"error": "INCORRECT_MAZE_ID"}
    for l in r:
        return dict(l)

def publishedmazelist():
    user = getattr(web.ctx.session, "username", "anon")
    r = web.ctx.db.where("published_data", user=user)
    return [dict(s) for s in r]

def getpublishedmaze(id):
    fields = "id", "title", "description", "owner", "data"
    r = web.ctx.db.select("published_mazes", {"id": id},
            what=",".join(fields),
            where="id=$id")
    if not r:
        return {"error": "INCORRECT_MAZE_ID"}
    for l in r:
        res = dict(l)
    user = getattr(web.ctx.session, "username", "anon")
    r = web.ctx.db.where("usermazedata", user=user, maze=id,
                         what="score, rating")
    for l in r:
        res.update(l)
    return res

def rankings(id):
    r = web.ctx.db.where("rankings", maze=id, order="points DESC")
    return [dict(l) for l in r]

def overallrankings():
    r = web.ctx.db.select("overall_rankings", order="points DESC")
    return [dict(l) for l in r]

#@checkuser
#def getworkingboard(user):
#    r = web.ctx.db.where("users", what="working_board", username=user)
#     for l in r:
#        board = l["working_board"]
#        if board:
#            return board
#    return {"error": "couldn't retrieve working board"}

@checkuser
def getsolution(user, mazeid):
    r = web.ctx.db.where("usermazedata",
        user=user,
        maze=mazeid,
        what="solution"
    )
    for l in r:
        return l["solution"]
    return {"error": "INCONSISTENT_USER_MAZE_DATA"}

@checkuser
def getboard(user, title, maze=None, pubmaze=None):
    where="user=$user AND title=$title"
    if maze:
        where += " AND maze=$maze"
    elif pubmaze:
        where += " AND pubmaze=$pubmaze"
    else:
        return {"error": "NO_MAZE_OR_PUBMAZE_ID"}
    r = web.ctx.db.select("saved_boards", vars=locals(),
                          where=where, what="data")
    for l in r:
        return l["data"]
    return {"error": "BOARD_DOES_NOT_EXIST"}
