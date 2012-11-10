/// <reference path="moment.js" />
/// <reference path="PrayerCalculator.js" />

TileUpdateScheduler = (function () {
    var Notifications = Windows.UI.Notifications;
    function TileUpdateScheduler() {
        this.updater = Notifications.TileUpdateManager.createTileUpdaterForApplication();

        Object.defineProperty(this, "daysScheduled", {
            get: function () {
                return Windows.Storage.ApplicationData.current.localSettings.values["daysScheduled"] || 0;
            },
            set: function (numberOfDays) {
                Windows.Storage.ApplicationData.current.localSettings.values["daysScheduled"] = numberOfDays;
            }
        });
    }

    TileUpdateScheduler.prototype.schedule = function (prayerCalculator, daysToSchedule) {
        /// <param type="PrayerCalculator" name="prayerCalculator">The PrayerCalculator used to calculator prayer times.</param>
        var _daysScheduled = this.daysScheduled;
        var dayIterator = moment().add('d', _daysScheduled);
        for (var i = 0; i < daysToSchedule; i++) {
            var times = prayerCalculator.calculateTimes(dayIterator.toDate());
            var previous = null;
            for (var time in times) {
                if (previous) {
                    // Subsequent time is the expiration time for previous prayer (unless previous wasn't a prayer:)
                    if (previous.name != "sunrise" && previous.name != "midnight") {
                        var expiration = times[time];

                        // Schedule a tile update for prayer if it has not expired.
                        var now = new Date();
                        if (expiration > now) {
                            // Ensure we deliver it in the future (in case it is the current prayer)
                            var deliveryTime = (previous.time > now) ? previous.time : new Date(now.getTime() + 1000);
                            this._schedulePrayerTileUpdate(previous.name, deliveryTime, expiration);
                        }
                    }
                } else {
                    previous = { name: null, time: null };
                }

                previous.name = time;
                previous.time = times[time];
            }

            dayIterator.add('d', 1);
            _daysScheduled++;
        }

        this.daysScheduled = _daysScheduled;
    }

    TileUpdateScheduler.prototype._schedulePrayerTileUpdate = function (name, deliveryTime, expirationTime) {
        var headingText = name.charAt(0).toUpperCase() + name.substring(1);
        var subtitleText = "Expires at " + moment(expirationTime).format("h\u2236mm");

        var wideUpdateXml = Notifications.TileUpdateManager.getTemplateContent(Notifications.TileTemplateType.tileWideText09);
        var textEls = wideUpdateXml.getElementsByTagName("text");
        textEls[0].innerText = headingText;
        textEls[1].innerText = subtitleText;

        var squareUpdateXml = Notifications.TileUpdateManager.getTemplateContent(Notifications.TileTemplateType.tileSquareText02);
        textEls = squareUpdateXml.getElementsByTagName("text");
        textEls[0].innerText = headingText;
        textEls[1].innerText = subtitleText;

        // Add the square payload to the wideUpdateXml
        var node = wideUpdateXml.importNode(squareUpdateXml.getElementsByTagName("binding").item(0), true);
        wideUpdateXml.getElementsByTagName("visual").item(0).appendChild(node);

        try {
            var scheduledNotification = new Notifications.ScheduledTileNotification(wideUpdateXml, deliveryTime);
            this.updater.addToSchedule(scheduledNotification);
        } catch (error) {
            // catch any errors in case the deliveryTime is borked.
        }
    }

    TileUpdateScheduler.prototype.clear = function () {
        this.daysScheduled = 0;
        this.updater.clear();
    }

    return TileUpdateScheduler;
})();