var placesApiKey = process.env.GOOGLE_PLACES_API_KEY;

// supported types can be found here https://developers.google.com/places/web-service/supported_types
module.exports.getPlaces = function(latitude, longitude, callback) {
    if (typeof latitude === 'undefined' || typeof longitude === 'undefined') {
        console.log("latitude and longitude needed to get places");
        return null;
    } else {
        if (typeof placesApiKey === 'undefined') {
            console.log("Places api key not found in \'process.env.GOOGLE_PLACES_API_KEY\'")
            return null;
        }
        var location = latitude + ',' + longitude;
        //var placesApiURL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=" + location + "&radius=500&type=hospital&key=" + placesApiKey;
        var placesApiURL = "/maps/api/place/nearbysearch/json?location=" + location + "&radius=500&type=doctor&key=" + placesApiKey;
        console.log(placesApiURL);
        callGooglePlacesApi(placesApiURL, callback);
    }
}

//get JSON response from google places api using the passed callback
function callGooglePlacesApi(url, callback) {
    var https = require('https');
    var options = {
        host: 'maps.googleapis.com',
        path: url,
        method: 'GET',
        headers: {
            accept: '*/*'
        }
    };

    var req = https.request(options, function(res) {
        console.log(res.statusCode);
        var body = '';
        res.on('data', function(d) {
            body += d;
        });
        res.on('end', function() {
            //console.log(body);
            callback(JSON.parse(body));
        });
    });
    req.end();

    req.on('error', function(e) {
        console.error(e);
    });
}
