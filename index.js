var path         = require('path')
  , http         = require('http')
  , express      = require('express')
  , socket       = require('socket.io')
  , httpRoutes   = require('./routes/http')
  , socketRoutes = require('./routes/socket')
  , GameStore    = require('./lib/GameStore');
  
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy; 
  

var app    = express()
  , server = http.createServer(app)
  , io     = socket.listen(server);
  
//app.use(express.logger());
//app.use(express.bodyParser());
//app.use(express.methodOverride());
//app.use(express.cookieParser('your secret here'));
//app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
//app.use(app.router);
//app.use(express.static(path.join(__dirname, 'public')));


app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// passport config
var Account = require('./models/account');
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect('mongodb://localhost/passport_local_mongoose');

var DB = new GameStore();

var cookieParser = express.cookieParser('I wish you were an oatmeal cookie')
  , sessionStore = new express.session.MemoryStore();

// Settings
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// Middleware
app.use(express.favicon(__dirname + '/public/img/favicon.ico'));
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(cookieParser);
app.use(express.session({ store: sessionStore }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(app.router);
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/register', function(req, res) {
      res.render('register', { });
  });

  app.post('/register', function(req, res) {
      Account.register(new Account({ username : req.body.username , email : req.body.email }), req.body.password, function(err, account) {
          if (err) {
            return res.render("register", {info: "Sorry. That username already exists. Try again."});
          }

          passport.authenticate('local')(req, res, function () {
            res.redirect('/');
          });
      });
  });

  app.get('/login', function(req, res) {
      res.render('login', { user : req.user });
  });

  app.post('/login', passport.authenticate('local'), function(req, res) {
      res.redirect('/');
  });

  app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
  });
  
  


  
  app.get('/ping', function(req, res){
      res.send("pong!", 200);
  });
  
app.get('/learn', function(req, res){
    res.render('learn.jade');
});
app.get('/train', function(req, res){
    res.render('train.jade');
});
app.get('/settings', function(req, res){
    res.render('settings.jade');
});
app.get('/account', function(req, res){
    res.render('account.jade');
});
app.get('/dashboard', function(req, res){
    res.render('dashboard.jade');
});
app.get('/help', function(req, res){
    res.render('help.jade');
});
app.get('/contact', function(req, res){
    res.render('contact.jade');
});
app.get('/profile', function(req, res){
    res.render('profile.jade');
});

app.get('/login', function(req, res){
    res.render('login.jade');
});

/*
 * Only allow socket connections that come from clients with an established session.
 * This requires re-purposing Express's cookieParser middleware in order to expose
 * the session info to Socket.IO
 */
io.set('authorization', function (handshakeData, callback) {
  cookieParser(handshakeData, {}, function(err) {
    if (err) return callback(err);
    sessionStore.load(handshakeData.signedCookies['connect.sid'], function(err, session) {
      if (err) return callback(err);
      handshakeData.session = session;
      var authorized = (handshakeData.session) ? true : false;
      callback(null, authorized);
    });
  });
});

// Attach routes
httpRoutes.attach(app, DB);
socketRoutes.attach(io, DB);

// And away we go
server.listen(app.get('port'), function(){
  console.log('Socket.IO Chess is listening on port ' + app.get('port'));
});
