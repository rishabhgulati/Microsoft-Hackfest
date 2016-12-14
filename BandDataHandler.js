const MAX_HEART_RATE_VALUES = 10;
var values = [];

module.exports.processBandData = function(req, res, next) {
    var intHeartRate = parseInt(req.params.heartrate);
    addHeartRate(intHeartRate);
    console.log("got last heart rate " + getLastHeartRate());
    res.send('Got heartRate value ' + getLastHeartRate());
    next();
};

module.exports.getLastHeartRate = getLastHeartRate;

function getLastHeartRate() {
    if (values.length == 0) {
        console.log("No values added for heartRate");
        return 0;
    }
    return values[values.length - 1];
}

function addHeartRate(heartRate) {
    if (values.length == MAX_HEART_RATE_VALUES) {
        console.log("removing value " + values.shift());
    }
    values.push(heartRate);
    console.log("added heartrate " + values[values.length - 1]);
};
