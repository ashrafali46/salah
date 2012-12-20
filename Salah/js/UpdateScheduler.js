/// <reference path="moment.js" />
/// <reference path="PrayerCalculator.js" />

UpdateScheduler = (function () {
    var Notifications = Windows.UI.Notifications;
    function UpdateScheduler() {
        this.updater = Notifications.TileUpdateManager.createTileUpdaterForApplication();
        this.notifier = Notifications.ToastNotificationManager.createToastNotifier();

        var settingsValues = Windows.Storage.ApplicationData.current.localSettings.values;
        Object.defineProperty(this, "daysScheduled", {
            get: function () {
                var lastDate = settingsValues["lastDateScheduled"];

                if (!lastDate)
                    return 0;

                return moment(lastDate).diff(moment(), "days");
            },
            set: function (numberOfDays) {
                settingsValues["lastDateScheduled"] = moment().add('d', numberOfDays).toDate();
            }
        });

        Object.defineProperty(this, "MIN_DAYS_SCHEDULED", {
            writeable: false,
            value: 3
        });
    }

    UpdateScheduler.prototype.schedule = function (prayerCalculator, daysToSchedule) {
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
                            console.log("Setting new notification for " + previous.name + " at " + previous.time);
                            this._schedulePrayerTileUpdate(previous.name, deliveryTime, expiration);
                            this._scheduleToastNotification(previous.name, deliveryTime, expiration);
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

    UpdateScheduler.prototype._schedulePrayerTileUpdate = function (name, deliveryTime, expirationTime) {
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
            scheduledNotification.expirationTime = expirationTime;
            this.updater.addToSchedule(scheduledNotification);
        } catch (error) {
            // catch any errors in case the deliveryTime is borked.
            console.log(error);
        }
    }

    UpdateScheduler.prototype._scheduleToastNotification = function (name, deliveryTime, expirationTime) {
        var upperCaseName = name.charAt(0).toUpperCase() + name.substring(1);
        var headingText = upperCaseName + " Salah";
        var subtitleText = upperCaseName + " expires in " + moment(expirationTime).from(moment(deliveryTime), true) + ".";

        // Toast notification
        var toastXml = Notifications.ToastNotificationManager.getTemplateContent(Notifications.ToastTemplateType.toastText02);
        var textNodes = toastXml.getElementsByTagName("text");
        textNodes[0].innerText = headingText
        textNodes[1].innerText = subtitleText;

        try {
            var toast = new Notifications.ScheduledToastNotification(toastXml, deliveryTime);
            this.notifier.addToSchedule(toast);
        } catch (error) {
            console.log(error);
        }
    }

    UpdateScheduler.prototype.clear = function () {
        this.daysScheduled = 0;
        this.updater.getScheduledTileNotifications().forEach(function (update) {
            this.updater.removeFromSchedule(update);
        }, this);
        
        this.notifier.getScheduledToastNotifications().forEach(function (notification) {
            this.notifier.removeFromSchedule(notification);
        }, this);
    }

    return UpdateScheduler;
})();