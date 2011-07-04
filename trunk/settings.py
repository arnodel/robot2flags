import os.path

ROBO_PATH = os.path.dirname(os.path.realpath(__file__))
DB_PATH = os.path.join(ROBO_PATH, "robo.db")
DEBUG = False
SLOW_RESPONSE = 0.5
SERVER_METHOD = "wsgi"
