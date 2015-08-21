// include the underscore framework
var underscore = require('underscore');
// include https
var https = require('https');
// include the built-in node's Oauth
var OAuth = require('oauth').OAuth;
// Load http
var http = require('http');
var request = require('request');

// Ready?
module.exports = function (app, passport) {
    // ==============================================================================
    // LINKEDIN AUTHORIZATION ROUTE
    // Description: Setting up a valid oauth and ask for request token from LinkedIn
    // Return : Get back oauth token from LinkedIn
    // ==============================================================================
    app.get('/linkedin/verification', function (req, res) {
        // Set up the callback route
        var LinkedInCallBack = "http://" + req.headers.host + "/linked/signin-linkedin";
        // Set up the request token of what kind information the server wants to get from LinkedIn
        var getRequestTokenUrl = "https://api.linkedin.com/uas/oauth/requestToken?scope=r_basicprofile+r_emailaddress";
        // Using the Oauth to create new oath with information
        var oa = new OAuth(getRequestTokenUrl,
                           "https://api.linkedin.com/uas/oauth/accessToken",
                           config.linkedin.app_id,
                           config.linkedin.app_secret,
                           "1.0",
                           LinkedInCallBack + (req.param('action') && req.param('action') != "" ? "?action=" + querystring.escape(req.param('action')) : ""),
                           "HMAC-SHA1");
        // Sending the oath and asked for oauth token, secret
        oa.getOAuthRequestToken(function (error, oauth_token, oauth_token_secret, results) {
            // Throw error if there is any
            if (error) {
                console.log('error');
            }
            else {
                // Save the oa, oauth token and secret for later use in the session
                req.session.oa = oa;
                req.session.oauth_token = oauth_token;
                req.session.oauth_token_secret = oauth_token_secret;
                // Redirect back to linkedin with the oauth token got back from the above request
                res.redirect("https://www.linkedin.com/uas/oauth/authorize?oauth_token=" + oauth_token);
            }
        })
    });

    // ========================================================================================================
    // LINKEDIN SIGNED-IN CALLBACK
    // Description: Trigger after user logged in with LinkedIn and will asked for access token from LinkedIn
    // Return : Access token and access token secret so we could use those to verified and get info later
    // ========================================================================================================
    app.get('/linked/signin-linkedin', function (req, res) {
        // Save the oath verifier
        req.session.oauth_verifier = req.query.oauth_verifier;
        // Create new oath using the information that we saved in the session
        var oa = new OAuth(req.session.oa._requestUrl,
                                          req.session.oa._accessUrl,
                                          req.session.oa._consumerKey,
                                          req.session.oa._consumerSecret,
                                          req.session.oa._version,
                                          req.session.oa._authorize_callback,
                                          req.session.oa._signatureMethod);
        // Asking LinkedIn to provided us the access token
        oa.getOAuthAccessToken(req.session.oauth_token, req.session.oauth_token_secret, req.param('oauth_verifier'),
                                function (error, oauth_access_token, oauth_access_token_secret, results) {
            if (error) {
                console.log('error');
            }
            else {
                // Save access token and secret in the session for later use
                req.session.oauth_access_token = oauth_access_token;
                req.session.oauth_access_token_secret = oauth_access_token_secret;
                // Redirect to the success route
                res.redirect((req.param('action') && req.param('action') != "") ? req.param('action') : "/success/linkedin_track");
            }
        });

    });

    // ==================================================================================================================================
    // LINKEDIN SUCCEDDED CALLBACK
    // Description: With collected information, we will now ask for profiler's information and verify user already existed or new if not
    // Return: Success message or error message
    // ==================================================================================================================================
    app.get('/success/linkedin_track', function (req, res) {
        // Create new oauth from collected information from the session
        var oa = new OAuth(req.session.oa._requestUrl,
                                          req.session.oa._accessUrl,
                                          req.session.oa._consumerKey,
                                          req.session.oa._consumerSecret,
                                          req.session.oa._version,
                                          req.session.oa._authorize_callback,
                                          req.session.oa._signatureMethod);
        // Get the profiler's information now
        oa.getProtectedResource("http://api.linkedin.com/v1/people/~:(id,public-profile-url,picture-url,last-name,first-name,email-address,site-standard-profile-request)?format=json",
                                "GET",
                                req.session.oauth_access_token,
                                req.session.oauth_access_token_secret, function (error, data, response) {
            // Parse the data
            var _linkedinResData = JSON.parse(data);
            // If there is an email address
            if (_linkedinResData.emailAddress) {
                // Find the user in the database
                User.findOne({ 'email': _linkedinResData.emailAddress }, function (err, user) {
                    // If the user found here
                    if (user) {
                        console.log("User Existed");
                        res.end();
                    } else {
                        // Creating new user here
                        var newUser = new User();
                        newUser.email = _linkedinResData.emailAddress;
                        newUser.password = "";
                        newUser.fullname = _linkedinResData.firstName + " " + _linkedinResData.lastName;
                        newUser.verifytype = "LinkedIn";
                        newUser.linkedinid = _linkedinResData.id;
                        newUser.profileimage = _linkedinResData.pictureUrl;
                        newUser.save(function (err , savedUser) {
                            if (err) { throw err }
                            else {
                                console.log("YAY");
                                res.end();
                            }
                        });
                    }
                });
            } else {
                console.log("ERROR");
                res.end();
            }
        });
    });

};

