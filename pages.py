#!/usr/bin/python

import settings
import sys
sys.path.append(settings.ROBO_PATH)

import web

try:
    import json
except ImportError:
    # For older Python - assuming django is installed
    from django.utils import simplejson as json

if settings.DEBUG:
    from time import sleep

web.config.debug = False

def webjsondata():
    return json.loads(web.data())

urls = (
    '/', 'root',
    '/json/', 'jsonfunc',
    )

app = web.application(urls, globals())

db = web.database(dbn="sqlite", db=settings.DB_PATH)
store = web.session.DBStore(db, "sessions")
session = web.session.Session(app, store)

def session_hook():
    web.ctx.session = session
    web.ctx.db = db

app.add_processor(web.loadhook(session_hook))

class root:
    def GET(self):
        raise web.redirect('/static/robo.html')


class jsonfunc:
    def GET(self):
        import remote.get as serverfunc
        i = web.input()
        f = getattr(serverfunc, i.func)
        args = json.loads(i.args)
        if settings.DEBUG:
            print "jsonGET %s %r" % (i.func, i.args)
        if not args:
            res = f()
        elif isinstance(args, list):
            res = f(*args)
        elif isinstance(args, dict):
            kwargs = dict((str(key), val) for (key, val) in args.iteritems())
            if (getattr(f, "checkuser", False) and
                getattr(web.ctx.session, "username", None) != kwargs["user"]):
                res = {"error": "INCONSISTENT_USER_DATA"}
            else:
                res = f(**kwargs)
        if settings.DEBUG:
            print "return", res
            if settings.SLOW_RESPONSE:
                sleep(settings.SLOW_RESPONSE)
        return json.dumps(res)
    def POST(self):
        import remote.post as serverfunc
        i = webjsondata()
        f = getattr(serverfunc, i['func'])
        args = i['args']
        if settings.DEBUG:
            print "jsonPOST %s %r" % (i['func'], args)
        if not args:
            res = f()
        elif isinstance(args, list):
            res = f(*args)
        elif isinstance(args, dict):
            kwargs = dict((str(key), val) for (key, val) in args.iteritems())
            if (getattr(f, "checkuser", False) and
                getattr(web.ctx.session, "username", None) != kwargs["user"]):
                res = {"error": "INCONSISTENT_USER_DATA"}
            else:
                res = f(**kwargs)
        if settings.DEBUG:
            print "return", res
            if settings.SLOW_RESPONSE:
                sleep(settings.SLOW_RESPONSE)
        return json.dumps(res)

# Uncomment this to use the fast-cgi server
# web.wsgi.runwsgi = lambda func, addr=None: web.wsgi.runfcgi(func, addr)

if __name__ == "__main__":
    app.run()
elif settings.SERVER_METHOD == "wsgi":
    application = app.wsgifunc()

