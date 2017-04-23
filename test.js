var express = require('express');
var app = express();
const Mastodon = require('mastodon-api')

let baseUrl = 'https://mstdn-workers.com'
let redirect_uri = 'https://mastodeck.herokuapp.com/callback'
var clientId
var clientSecret

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
    Mastodon.createOAuthApp(baseUrl + '/api/v1/apps', 'Mastodeck', 'read write follow', redirect_uri)
        .catch(err => console.error(err))
        .then((res) => {

            clientId = res.client_id
            clientSecret = res.client_secret

            return Mastodon.getAuthorizationUrl(clientId, clientSecret, baseUrl, 'read write follow', redirect_uri)
        })
        .then(url => {
            response.redirect(url)
        })
});

app.get('/callback', function(request, response) {
    Mastodon.getAccessToken(clientId, clientSecret, request.query.code, baseUrl)
        .catch(err => console.error(err))
        .then(accessToken => {
            console.log(clientId)
            console.log(clientSecret)
            console.log(request.query.code)
            console.log(baseUrl)
            console.log(`This is the access token. Save it!\n${accessToken}`)
            response.render('pages/index2.ejs')
        })
});

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});
