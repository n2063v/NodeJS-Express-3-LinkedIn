// server.js

// set up ======================================================================
// get all the tools we need
var express = require('express');
var app      = express();
var port     = process.env.PORT || 5858;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var configDB = require('./config/database.js');

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

app.configure(function() {

	// set up our express application
	app.use(express.logger('dev')); // log every request to the console
    app.use(express.cookieParser());
    app.use(express.bodyParser()); // get information from html forms
    app.set('view engine', 'ejs'); // set up ejs for templating
    app.use('/assets', express.static('assets'));
    app.use('/Scripts', express.static('Scripts'));
    app.set('view options', { pretty: true }); // set up ejs for templating


    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        next();
    });

    //app.use(express.favicon("public/images/favicon.ico"));
    app.use(passport.initialize());
    app.use(passport.session()); // persistent login sessions
    app.use(flash());

});

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
app.listen(port);
console.log('In Development On ' + port);
