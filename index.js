var express = require('express');
var app = express();

var redirect_uri = 'https://mastodeck.herokuapp.com/callback';

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

var pg = require('pg');
var conString = 'postgres://utxtjrftinvuti:d9f53eef6c4976085d8b93810f61773db47cbe9d847c7a3ef11712481ab69088@ec2-174-129-227-116.compute-1.amazonaws.com:5432/d9di7k3e04uhkm'

var crypto = require("crypto");

app.get('/', function(request, response) {
    if(!request.cookies.instance){
        response.render('pages/instanceselect.ejs');
    }else{
        if(!request.cookies.access_token) {
            var client = new pg.Client(conString);
            client.connect(function(err) {
                if(err) {
                    return console.error('could not connect to postgres', err);
                }
                client.query('select * from data where instance_name =\'' + request.cookies.instance + '\';', function(err, result) {
                    if(err) {
                        return console.error('error running query', err);
                    }
                    Masto.getAuthorizationUrl(result.rows[0].client_id, result.rows[0].client_secret, result.rows[0].url, 'read write follow', redirect_uri)
                      .then(resp=> response.redirect(resp),error=> console.log(error))
                });
            });
        } else {
            var M = new Masto({
                access_token: request.cookies.access_token,
                timeout_ms: 60 * 1000,
                api_url: 'https://' + request.cookies.instance + '/api/v1/',
            })

            var toots_public = []
            var toots_home = []
            var toots_local = []

            const listener = M.stream('streaming/user')

            listener.on('message', msg => console.log(msg))

            listener.on('error', err => console.log(err))

            M.get('timelines/public', function(err, data, res) {
                if(!err){
                    for (key in data) {
                        var toot = {
                            id : data[key].account.username,
                            profile_img : data[key].account.avatar,
                            content : data[key].content//.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
                        };
                        toots_public.push(toot);
                    }
                    response.locals.toots_public = toots_public;
                    M.get('timelines/home', function(err, data, res) {
                        if(!err){
                            for (key in data) {
                                var toot = {
                                    id : data[key].account.username,
                                    profile_img : data[key].account.avatar,
                                    content : data[key].content//.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
                                };
                                toots_home.push(toot);
                            }
                            response.locals.toots_home = toots_home;
                            M.get('timelines/public?local=on', function(err, data, res) {
                                if(!err){
                                    for (key in data) {
                                        var toot = {
                                            id : data[key].account.username,
                                            profile_img : data[key].account.avatar,
                                            content : data[key].content//.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, '')
                                        };
                                        toots_local.push(toot);
                                    }
                                    response.locals.toots_local = toots_local;
                                    response.render('pages/index');
                                }
                            })
                        }
                    })
                }
            })
        }
    }
});

app.get('/callback', function(request, response) {
    var client = new pg.Client(conString);
    client.connect(function(err) {
        if(err) {
            return console.error('could not connect to postgres', err);
        }
        client.query('select * from data where instance_name =\'' + request.cookies.instance + '\';', function(err, result) {
            if(err) {
                return console.error('error running query', err);
            }
            Masto.getAccessToken(result.rows[0].client_id, result.rows[0].client_secret, request.query.code, result.rows[0].url, redirect_uri)
                .then(resp=> {
                    client.end()
                    response.cookie('access_token',resp)
                    response.redirect('https://mastodeck.herokuapp.com/')
                },error=> {
                    console.log(error)
                });

        });
    });
});

app.post('/instance',function(request, response) {
    var instance_name = request.body.instance_name;
    response.cookie('instance',instance_name);
    var client = new pg.Client(conString);
    client.connect(function(err) {
        if(err) {
            return console.error('could not connect to postgres', err);
        }
        client.query('select count(*) from data where instance_name = \'' + request.body.instance_name + '\';', function(err, result) {
            if(err) {
                return console.error('error running query', err);
            } else if(result.rows[0].count=='0') {
                base_url = 'https://' + instance_name;
                Masto.createOAuthApp(base_url + '/api/v1/apps', "Mastodeck", 'read write follow', redirect_uri)
                .then(resp=> {
                    var client2 = new pg.Client(conString);
                    client2.connect(function(err) {
                        if(err) {
                            return console.error('could not connect to postgres', err);
                        }
                        var qstr = "insert into data (instance_name,url,id,client_id,client_secret) values($1, $2, $3, $4, $5);"
                        var query = client2.query(qstr, [instance_name, base_url, resp.id, resp.client_id, resp.client_secret])
                        query.on('end', function(row,err) {
                            Masto.getAuthorizationUrl(resp.client_id, resp.client_secret, base_url, 'read write follow', redirect_uri)
                                .then(resp=> response.redirect(resp),error=> console.log(error))
                        });
                        query.on('error', function(error) {
                            console.log("ERROR!");
                        });
                    });
                  },error=> console.log(error));
            } else {
                response.redirect('https://mastodeck.herokuapp.com/');
            }
        });
    });
});

app.get('/logout',function(request, response){
    response.cookie('instance','');
    response.cookie('access_token','');
    response.redirect('/');
});

function code(text){
    var cipher = crypto.createCipher('aes192', "majstaodueck5", "");
    cipher.update(text, 'utf8', 'base64')
    var cipheredText = cipher.final('base64')
    return cipheredText;
}

function decode(text){
    var decipher = crypto.createDecipher('aes192', "majstaodueck5", "");
    decipher.update(text, 'base64', 'utf8');
    var dec = decipher.final('utf8');
    return dec;
}

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
