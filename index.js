var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var Masto = require('./m_node_modules/mastodon/lib/mastodon')

var M = new Masto({
    access_token: '952b8171760d85ed107e7ffca20e0c43bbd4bd8210961a910a392068746c9d60',
    timeout_ms: 60 * 1000,
    api_url: 'https://rikadon.club/api/v1/',
})

var toots_public = []
var toots_home = []
var toots_local = []

M.get('timelines/public', function(err, data, res) {
    if(!err)
        for (key in data)
            toots_public.push(data[key].content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, ''))
})

M.get('timelines/home', function(err, data, res) {
    if(!err)
        for (key in data)
            toots_home.push(data[key].content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, ''))
})

M.get('/web/timelines/public/local', function(err, data, res) {
    if(!err)
        for (key in data)
            toots_local.push(data[key].content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, ''))
})

app.get('/', function(request, response) {
  response.locals.toots_home = toots_home;
  response.locals.toots_public = toots_public;
  response.locals.toots_local = toots_local;
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
