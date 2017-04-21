var express = require('express');
var app = express();
var OAuth = require('oauth');
var cookieParser = require('cookie-parser')

var client_id = 'e679466c41d0250560af8b7811fb0cae60471e8e30fa335a07fa6e19594fbd30';
var client_secret = 'b776349fa2c99c178f618d769adafba1283f8d58f90f50d177465767cbaf738c';
var redirect_uri = 'urn:ietf:wg:oauth:2.0:oob';
var access_token;
var base_url = 'https://rikadon.club';

app.use(cookieParser());
app.use(express.session());

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var Masto = require('mastodon-api')

app.get('/', function(request, response) {
    if(!access_token) {
        app.redirect(Masto.getAuthorizationUrl(client_id, client_secret, base_url, 'read write follow', 'https://mastodeck.herokuapp.com/callback'));
    } else {
        var M = new Masto({
            access_token: access_token,
            timeout_ms: 60 * 1000,
            api_url: base_url + '/api/v1/',
        })

        var toots_public = []
        var toots_home = []
        var toots_local = []

        M.get('timelines/public', function(err, data, res) {
            if(!err)
            for (key in data) {
                var toot = {
                    id : data[key].account.username,
                    profile_img : data[key].account.avatar,
                    content : data[key].content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
                };
                toots_public.push(toot);
            }
        })

        M.get('timelines/home', function(err, data, res) {
            if(!err)
            for (key in data) {
                var toot = {
                    id : data[key].account.username,
                    profile_img : data[key].account.avatar,
                    content : data[key].content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
                };
                toots_home.push(toot);
            }
        })

        M.get('timelines/public?local=on', function(err, data, res) {
            if(!err)
            for (key in data) {
                var toot = {
                    id : data[key].account.username,
                    profile_img : data[key].account.avatar,
                    content : data[key].content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
                };
                toots_local.push(toot);
            }
        })
        response.locals.toots_home = toots_home;
        response.locals.toots_public = toots_public;
        response.locals.toots_local = toots_local;
        response.render('pages/index');
    }
});

app.get('/callback',function(request, response) {
    access_token = Masto.getAccessToken(client_id, client_secret, request.authorizationCode, baseUrl);
    app.redirect('https://mastodeck.herokuapp.com/');
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
