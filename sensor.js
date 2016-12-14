const MAX_HEART_RATE_VALUES = 10;
var values = [];
var Sensor = function() {
    console.log("constructor");
};

Sensor.prototype.addHeartRate = function(heartRate) {
    if (values.length == MAX_HEART_RATE_VALUES) {
        console.log("removing value " + values.shift());
    }
    values.push(heartRate);
    console.log("added heartrate " + values[values.length - 1]);
};

Sensor.prototype.getLastHeartRate = function() {
    if (values.length == 0) {
        console.log("No values added for heartRate");
        return 0;
    }
    return values[values.length - 1];
};

module.exports = Sensor;
