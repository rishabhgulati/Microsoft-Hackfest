const MAX_HEART_RATE_VALUES = 10;
var values = [];
var latitude;
var longitude;

module.exports.processBandData = function(req, res, next) {
    var intHeartRate = parseInt(req.params.heartrate);
    latitude = parseFloat(req.params.lat);
    longitude = parseFloat(req.params.long);
    addHeartRate(intHeartRate);
    //console.log("got last heart rate " + getLastHeartRate());
    res.send('HeartRate ' + intHeartRate + ', Latitude ' + latitude + ', Longitude ' + longitude);
    next();
};

module.exports.getLastHeartRate = getLastHeartRate;

module.exports.getLatitude = function() {
    return latitude;
}
module.exports.getLongitude = function() {
    return longitude;
}

function getLastHeartRate() {
    if (values.length == 0) {
        console.log("No values added for heartRate");
        return 0;
    }
    return values[values.length - 1];
};

function addHeartRate(heartRate) {
    if (values.length == MAX_HEART_RATE_VALUES) {
        console.log("removing value " + values.shift());
    }
    values.push(heartRate);
    console.log("added heartrate " + values[values.length - 1]);
};
