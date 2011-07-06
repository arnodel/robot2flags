CREATE TABLE users (
       username TEXT PRIMARY KEY,
       pwd TEXT
);

CREATE TABLE mazes (
       id INTEGER PRIMARY KEY,
       title TEXT,
       description TEXT,
       owner REFERENCES users(username),
       data TEXT
);

CREATE TABLE published_mazes (
       id INTEGER PRIMARY KEY,
       owner REFERENCES users(username),
       title TEXT,
       description TEXT,
       date DATETIME,
       data TEXT,
       lowscore INTEGER,
       sumratings INTEGER,
       countratings INTEGER
);

CREATE TABLE usermazedata (
       id INTEGER PRIMARY KEY,
       user REFERENCES users(username),
       maze REFERENCES publishedmazes(id),
       rating INTEGER,
       score INTEGER,
       CONSTRAINT maze_user_constraint UNIQUE (maze, user)
);

CREATE TABLE saved_boards (
       id INTEGER PRIMARY KEY,
       title TEXT,
       user REFERENCES users(username),
       pubmaze REFERENCES publishedmazes(id),
       maze REFERENCES mazes(id),
       data TEXT
);

CREATE VIEW lowscores AS 
       SELECT maze, MIN(score) lowscore 
       FROM usermazedata
       GROUP BY maze;

CREATE VIEW mazeratings AS
       SELECT m.id AS maze,
              SUM(d.rating) AS sumratings,
              AVG(d.rating) AS avgrating,
              COUNT(d.rating) AS countratings
       FROM published_mazes m 
       LEFT JOIN usermazedata d 
       ON m.id=d.maze GROUP BY m.id;

CREATE VIEW rankings AS 
       SELECT d.user user,
              d.score score,
              d.maze maze,
	      (1.0 * l.lowscore / d.score) points
       FROM usermazedata d 
       JOIN lowscores l
       ON d.maze = l.maze;

CREATE VIEW overall_rankings AS
       SELECT user, sum(points) as points, count(*) as countmazes
       FROM rankings
       GROUP BY user;

CREATE VIEW published_data AS 
       SELECT m.id AS maze,
              m.title AS title,
              m.date AS pubdate,
              u.username AS user,
              m.owner AS author,
              l.lowscore AS lowscore,
              d.score AS score,
	      m.moderated_by as moderated_by,
	      
              r.sumratings AS sumratings,
              r.avgrating AS avgrating,
              r.countratings AS countratings 
       FROM published_mazes m 
       JOIN users u LEFT JOIN usermazedata d
       ON m.id = d.maze AND u.username = d.user
       LEFT JOIN lowscores l 
       ON m.id=l.maze 
       LEFT JOIN mazeratings r
       ON m.id = r.maze;

--- Alterations to add board saving facility

alter table usermazedata add column solution text;

--- Alterations to add moderating facility

alter table users add column moderator integer default 0;
alter table published_mazes add column moderated_by references users(username);
