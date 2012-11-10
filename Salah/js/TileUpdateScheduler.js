/// <reference path="moment.js" />
/// <reference path="PrayerCalculator.js" />

TileUpdateScheduler = (function () {
    function TileUpdateScheduler() {
    }

    TileUpdateScheduler.prototype.schedule = function (prayerCalculator, daysToSchedule) {
        /// <param type="PrayerCalculator" name="prayerCalculator">The PrayerCalculator used to calculator prayer times.</param>

        var dayIterator = moment().add('d', this.getDaysScheduledAhead() + 1);
        for (var i = 0; i < daysToSchedule; i++) {
            var times = prayerCalculator.calculateTimes(dayIterator.toDate());
            for (var time in times) {
                if (time == "sunrise" || time == "midnight")
                    continue;

                this.schedulePrayer(time, times[time]);
            }
        }
    }

    TileUpdateScheduler.prototype.schedulePrayer = function(name, time) {

    }

    TileUpdateScheduler.prototype.clear = function () {

    }

    TileUpdateScheduler.prototype.getDaysScheduledAhead = function() {
        return Windows.Storage.ApplicationData.current.localSettings.values["daysScheduledAhead"] || 0;
    }

    return TileUpdateScheduler;
})();