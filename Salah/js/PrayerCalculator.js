// No dependencies

var PrayerCalculator = (function () {
    function PrayerCalculator(location, parameters) {
        this.location = location;
        this.parameters = parameters;
    }
    PrayerCalculator.Methods = {
        ISNA: {
            fajrAngle: -15,
            maghribAngle: -0.833,
            ishaAngle: -15
        },
        Karachi: {
            fajrAngle: -18,
            maghribAngle: -0.833,
            ishaAngle: -18
        },
        MuslimWorldLeague: {
            fajrAngle: -18,
            maghribAngle: -0.833,
            ishaAngle: -17
        }
    };
    PrayerCalculator.prototype.calculateTimes = function (date) {
        var factor = Math.PI / 180;
        var latRadians = this.location.latitude * factor;
        var solDec = this._getSolarDeclination(date);
        var solarNoon = this._getSolarNoon(date);
        var times = {};
        times.fajr = getAngleTime(this.parameters.fajrAngle * factor, date, true);
        times.sunrise = getAngleTime(-0.0145385927, date, true);
        times.dhuhr = solarNoon;
        times.asr = getAngleTime(Math.atan(1 / (1 + Math.tan(Math.abs(latRadians - solDec)))), date, false);
        times.maghrib = getAngleTime(this.parameters.maghribAngle * factor, date, false);
        times.isha = this.parameters.ishaAngle ? getAngleTime(this.parameters.ishaAngle * factor, date, false) : new Date(times.maghrib.getTime() + this.parameters.ishaOnsetTime * 60000);
        var tomorrowFajr = getAngleTime(this.parameters.fajrAngle * factor, new Date(date.getTime() + 86400000), true);
        times.midnight = new Date(times.maghrib.getTime() + 0.5 * (times.maghrib.getTime() - tomorrowFajr.getTime()));
        return times;
        function getAngleTime(angle, date, beforeNoon) {
            var timeOffset = Math.acos((Math.sin(angle) - Math.sin(latRadians) * Math.sin(solDec)) / (Math.cos(latRadians) * Math.cos(solDec))) / (15 * factor);
            return new Date(solarNoon.getTime() + (beforeNoon ? -1 : 1) * 3600000 * timeOffset);
        }
    };
    PrayerCalculator.prototype._getSolarNoon = function (date) {
        var hourFrac = 12 + this._getTimezone() - this.location.longitude / 15 - this._getEquationOfTime(date) / 60;
        var minFrac = 60 * (hourFrac - Math.floor(hourFrac));
        var secFrac = 60 * (minFrac - Math.floor(minFrac));
        return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(hourFrac), Math.floor(minFrac), Math.floor(secFrac), 0);
    };
    PrayerCalculator.prototype._getJulianDay = function (date) {
        var calendarMonth = date.getMonth() + 1;
        var a = Math.floor((14 - calendarMonth) / 12);
        var y = date.getFullYear() + 4800 - a;
        var m = calendarMonth + 12 * a - 3;
        return date.getDate() + Math.floor(0.2 * (153 * m + 2)) + 365 * y + Math.floor(0.25 * y) - Math.floor(0.01 * y) + Math.floor(0.0025 * y) - 32045;
    };
    PrayerCalculator.prototype._getSolarDeclination = function (date) {
        var factor = Math.PI / 180;
        var n = this._getJulianDay(date) - 2451545;
        var L = (280.459 + 0.98564736 * n) % 360;
        var g = factor * (357.529 + 0.98560028 * n);
        var EL = factor * (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
        var oe = factor * (23.439 - 3.6e-7 * n);
        return Math.asin(Math.sin(oe) * Math.sin(EL));
    };
    PrayerCalculator.prototype._getEquationOfTime = function (date) {
        var factor = Math.PI / 180;
        var w = 360 / 365.24;
        var start = new Date(date.getFullYear(), 0, 1);
        var daysPassed = (date.getTime() - start.getTime()) / 86400000;
        var a = w * (daysPassed + 10);
        var b = a + 1.914 * Math.sin(w * (daysPassed - 2) * factor);
        var c = (a - Math.atan(Math.tan(b * factor) / Math.cos(23.44 * factor)) / factor) / 180;
        return 720 * (c - Math.floor(c + 0.5));
    };
    PrayerCalculator.prototype._getTimezone = function () {
        var minuteDiff = (new Date()).getTimezoneOffset();
        return -1 * minuteDiff / 60;
    };
    return PrayerCalculator;
})();