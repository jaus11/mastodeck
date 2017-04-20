var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

var Masto = require('mastodon')

var M = new Masto({
    access_token: '952b8171760d85ed107e7ffca20e0c43bbd4bd8210961a910a392068746c9d60',
    timeout_ms: 60 * 1000,
    api_url: 'https://rikadon.club/api/v1/',
})

var toots = []

M.get('timelines/public', function(err, data, res) {
    if(!err)
        for (key in data)
            toots.push(data[key].content.replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, ''))
})

app.get('/', function(request, response) {
  response.render('pages/index',{toots: toots});
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
