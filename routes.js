var passport = require('passport');
var Account = require('./models/account');

module.exports = function (app) {
    
  app.get('/', function (req, res) {
      res.render('home.jade', { user : req.user });
  });

  
};


