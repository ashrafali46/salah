/// <reference path="/js/PrayerCalculator.js" />
/// <reference path="/js/ApplicationSettings.js" />
/// <reference path="/js/moment.js" />
/// <reference path="/js/UpdateScheduler.js" />

(function () {
    "use strict";

    importScripts("PrayerCalculator.js");
    importScripts("ApplicationSettings.js");
    importScripts("moment.js");
    importScripts("UpdateScheduler.js");

    var updateScheduler = new UpdateScheduler();
    if (updateScheduler.daysScheduled < 3) {
        var pc = new PrayerCalculator(ApplicationSettings.location.coord, PrayerCalculator.Methods[ApplicationSettings.salah.method]);
        updateScheduler.schedule(pc, 3);
    }

    close();
})();