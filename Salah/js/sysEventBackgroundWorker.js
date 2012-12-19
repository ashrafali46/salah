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

    if (ApplicationSettings.location.coord && ApplicationSettings.salah.method) {
        var updateScheduler = new UpdateScheduler();
        if (updateScheduler.daysScheduled < updateScheduler.MIN_DAYS_SCHEDULED) {
            updateScheduler.schedule(new PrayerCalculator(ApplicationSettings.location.coord, PrayerCalculator.Methods[ApplicationSettings.salah.method]), updateScheduler.MIN_DAYS_SCHEDULED);
        }
    }

    close();
})();