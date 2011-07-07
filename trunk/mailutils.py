import web
import settings

body_footer = """
-- 
Robot2flags
If you have suggestions, questions or problems, email %s
""" % (settings.EMAIL_ADDRESS)

class Mail(object):
    def __init__(self, user, email, subject, body):
        self.user = user
        self.email = email
        self.subject = subject
        self.body = body
    def send(self):
        subject = "[robot2flags] " + self.subject
        body = "Dear %s,\n%s\n%s" % (self.user, self.body, body_footer)
        web.sendmail(settings.EMAIL_ADDRESS, self.email, subject, body)
