var express = require('express');
var app = express();

var id;
var client_id; // = '50afd9f5ebea8985a144b6e7a5bd8928ab57cda7787e8aec8795189f37799e05';
var client_secret; //  = 'b5ee6003e7af3ad9251975324b473e96d9575673fd93d8354196f25fbcde3faf';
var redirect_uri = 'https://mastodeck.herokuapp.com/callback';
var access_token;
var base_url; //  = 'https://rikadon.club';

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));

var cookieParser = require('cookie-parser');
app.use(cookieParser());

var Masto = require('mastodon-api')

app.get('/', function(request, response) {
    if(!request.cookies.instance){
        response.render('pages/instanceselect.ejs');
    }else{
        if(!access_token) {
            console.log('【erro?】access token is null');
            Masto.getAuthorizationUrl(client_id, client_secret, base_url, 'read write follow', 'https://mastodeck.herokuapp.com/callback').then(resp=> response.redirect(resp),error=> console.log(error))
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
    }
});

app.get('/callback',function(request, response) {
    Masto.getAccessToken(client_id, client_secret, request.query.code, base_url).then(resp=> access_token=resp,error=> console.log(error));
    console.log('【erro?】access token set : ' + access_token);
    response.redirect('https://mastodeck.herokuapp.com/');
});

app.post('/instance',function(request, response) {
    var instance;
    var jsonfile = require('jsonfile');
    var instances;
    jsonfile.readFile('public/token.json', function(err, obj) {
        instances = obj;
    });
    var instance_name = request.body.instance_name;
    if(instance_name in instances == true){
        response.redirect('https://mastodeck.herokuapp.com/');
    }else{
        base_url = 'https://' + instance_name;
        response.cookie('instance',instance_name);
        Masto.createOAuthApp(base_url + '/api/v1/apps', "Mastodeck", 'read write follow', 'https://mastodeck.herokuapp.com/callback')
          .then(resp=> {
              var instance_data = {};
              instance_data[instance_name] = {
                  url: base_url,
                  id: resp.id,
                  client_id: resp.client_id,
                  client_secret: resp.client_secret
              };
              jsonfile.writeFile('public/token.json',instance_data,{encoding: 'utf-8'});
          },error=> console.log(error));
        jsonfile.readFile('public/token.json', function(err, obj) {
            instance = obj[instance_name];
        });
        Masto.getAuthorizationUrl(instance.client_id, instance.client_secret, instance.url, 'read write follow', 'https://mastodeck.herokuapp.com/callback')
          .then(resp=> response.redirect(resp),error=> console.log(error))
    }
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
