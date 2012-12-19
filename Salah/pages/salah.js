/// <reference path="/js/ApplicationSettings.js" />

(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/salah.html", {
        /// To show only todays salah: removeExpiredSalah - false, futureDayDisplayCount: 0
        /// To show unlimited upcoming salah: removeExpiredSalah - true, futureDayDisplayCount: Number.POSITIVE_INFINITY
        _options: {
            // If true salah are removed as they expire, otherwise dates are removed only
            // when all salah on that date have expired
            removeExpiredSalah: true,
            // The number of days in the future that salah will displayed for
            futureDayDisplayCount: 0
        },
        
        _lastDateAdded: null,
        _updater: null,
        _viewstate: "horizontal", // can either be "horizontal" or "vertical"
        _scrollHandler: null,
        _viewStateHandler: null,
        _updating: false,

        render: function (element, options, loadResult) {
            // Copy options
            if (options) {
                for (var key in options) {
                    this._options[key] = options[key];
                }
            }

            element.appendChild(loadResult);

            this._prayerCalculator = new PrayerCalculator(ApplicationSettings.location.coord, PrayerCalculator.Methods[ApplicationSettings.salah.method]);
            this._datesList = element.querySelector("#datesList");

            // Set the locationName from settings
            element.querySelector("#locationName").innerText = ApplicationSettings.location.name;

            // Begin adding prayers to the page
            this.addDate(moment().add('d', -1).toDate(), false); // Insert yesterday's times in case last night's isha is still in effect
            var now = new Date();
            this.addDate(now, false);

            // Handle expired prayer/dates
            var expired = this.getExpired();
            if (this._options.removeExpiredSalah) {
                // Removed expired salah elements
                for (var s = 0; s < expired.salahs.length; s++) {
                    var expiredSalah = expired.salahs[s];
                    expiredSalah.parentNode.removeChild(expiredSalah);
                }
            }

            // Remove fully expired dates
            for (var d = 0; d < expired.dates.length; d++) {
                this._datesList.removeChild(expired.dates[d]);
            }

            // Fill the datesList so it overflows the screen width
            this.fill();
        },

        ready: function (element, options, loadResult) {
            var that = this;

            // Register the scroll handler
            this._scrollHandler = this.fill.bind(this);
            this._datesList.addEventListener("scroll", this._scrollHandler);

            this._viewStateHandler = function() {
                var viewStates = Windows.UI.ViewManagement.ApplicationViewState;
                var newViewState = Windows.UI.ViewManagement.ApplicationView.value;
                if (newViewState === viewStates.snapped) {
                    that._viewstate = "horizontal";//that._viewstate = "vertical";
                } else {
                    that._viewstate = "horizontal";
                }
            }
            window.addEventListener("resize", this._viewStateHandler);

            // Start updating after a small initial delay
            setTimeout(function () {
                that.startUpdating();
            }, 1000);
        },

        unload: function() {
            window.removeEventListener("resize", this._viewStateHandler);
            //this._datesList.removeEventListener("scroll", this._scrollHandler);
            this.stopUpdating();
        },

        startUpdating: function () {
            // Register the update method
            var that = this, SLOW_UPDATE_DELAY = 60000, FAST_UPDATE_DELAY = 5000;
            this._updating = true;
            _updateRecursive();

            function _updateRecursive() {
                that.updateAsync().then(function () {
                    var addedItems = that.fill(); // fill up the screen according to the options
                    if (addedItems.length != 0) {
                        WinJS.UI.Animation.enterContent(addedItems).then(function () {
                            that.updateAsync();
                        });
                    }

                    // Schedule another update based on the time remaining in this salah
                    var currentSalah = that.getCurrentSalah();
                    var updateTime;

                    if (currentSalah) {
                        var remaining = moment(that.getCurrentSalah().expiry).diff(moment(), "minutes");
                        updateTime = (remaining <= 1) ? FAST_UPDATE_DELAY : SLOW_UPDATE_DELAY
                    } else {
                        updateTime = SLOW_UPDATE_DELAY;
                    }

                    if (that._updating)
                        that._updater = setTimeout(_updateRecursive, updateTime);
                });
            }
        },

        stopUpdating: function () {
            if (this._updating) {
                this._updating = false;
                clearTimeout(this._updater);
                this._updater = null;
            }
        },

        addDate: function (date) {
            /// <summary>Adds a particular date element containing the date's Salah times to the datesList.</summary>
            /// <param name="date" type="Date">The date for which to add salah times.</param>
            /// <returns type="HTMLListElement">An element in the datesList</returns>
            if (!this._lastDateAdded) {
                this._lastDateAdded = new Date(date.getTime()); // Make copies as dates are passed by reference
            } else {
                if (date > this._lastDateAdded)
                    this._lastDateAdded = new Date(date.getTime());
            }

            var times = this._prayerCalculator.calculateTimes(date);
            var time; // iterator

            // check if any of the times are invalid
            for (time in times) {
                if (isNaN(times[time].getTime())) {
                    // throw error here: query user if they live on mars
                    // e.g. "Do you live on Mars? We're currently unable to calculate prayer times for your
                    // location. Please check your location setting."
                    //  prompt: Ok
                }
            }

            // Create the outer <li> date element
            var prayerDate = document.createElement("li");
            this._datesList.appendChild(prayerDate);
            prayerDate.id = this.toDateId(date);
            prayerDate.date = date;
            prayerDate.className = "date";

            // Add a dateStamp <label> to the date <li> element
            var dateStamp = document.createElement("label");
            prayerDate.appendChild(dateStamp);
            dateStamp.className = "dateStamp";
            var dateToday = moment().sod();
            var dateMoment = moment(new Date(date.getTime())).sod();

            var dateString;
            switch (dateMoment.diff(dateToday, 'days')) {
                case -1:
                    dateString = "Yesterday";
                    break;
                case 0:
                    dateString = "Today";
                    break;
                case 1:
                    dateString = "Tomorrow";
                    break;
                default:
                    dateString = dateMoment.format("MMMM Do");
                    break;
            }
            dateStamp.innerText = dateString;

            // Add the <ol> which contains salahs to the date <li> element
            var timesList = document.createElement("ol");
            prayerDate.appendChild(timesList);
            timesList.className = "salahList";

            // Add salah <li> elements to the salahList <ol>
            for (time in times) {
                if (time == "sunrise" || time == "midnight")
                    continue;

                var salahEl = document.createElement("li");
                salahEl.className = time;
                salahEl.time = times[time];

                // set expiry
                var expiry;
                switch (time) {
                    case 'fajr':
                        expiry = times.sunrise;
                        break;
                    case 'dhuhr':
                        expiry = times.asr;
                        break;
                    case 'asr':
                        expiry = times.maghrib;
                        break;
                    case 'maghrib':
                        expiry = times.isha;
                        break;
                    case 'isha':
                        expiry = times.midnight;
                        break;
                }
                salahEl.expiry = expiry;

                timesList.appendChild(salahEl);

                var salahName = document.createElement("h1");
                salahEl.appendChild(salahName);
                salahName.innerText = time.charAt(0).toUpperCase() + time.substring(1);

                var salahTime = document.createElement("h2");
                salahEl.appendChild(salahTime);
                salahTime.innerText = moment(times[time]).format("h\u2236mm a"); // Unicode character for a higher colon
                // ensure salahTime has a width set (for proper first animation)
                salahTime.style.width = getComputedStyle(salahTime).width;
            }

            return prayerDate;
        },

        getExpired: function() {
            /// <summary>Iterates through the dates and returns the expired salah</summary>
            /// <returns type="Object">An object containing an array of expired prayers and fully expired (empty) dates</returns>
            var expiredSalahs = [], emptyDates = [];
            var dates = this._datesList.getElementsByClassName("date");

            var freshSalah = false, dateIterator = 0, now = new Date(), date;
            while (!freshSalah && (date = dates.item(dateIterator))) {
                var salahs = date.querySelector(".salahList").getElementsByTagName("li");

                for (var i = 0; i < salahs.length; i++) {
                    var salah = salahs.item(i);
                    if (salah.expiry < now) {
                        expiredSalahs.push(salah);
                    } else {
                        // Reached current salah
                        freshSalah = true;
                        break;
                    }
                }

                if (!freshSalah)
                    emptyDates.push(date);

                dateIterator++;
            }

            return { salahs: expiredSalahs, dates: emptyDates };
        },

        fill: function () {
            var THRESHOLD = 50;
            var dateToday = moment().sod(),
                lastDay = moment(new Date(this._lastDateAdded.getTime())).sod(),
                datesList = this._datesList, that = this;

            var sizeDirection = (this._viewstate == "horizontal") ? "Width" : "Height";
            var positionDirection = (this._viewstate == "horizontal") ? "Left" : "Top";

            var addedDates = [];

            while (checkNeedToFill()) {
                lastDay.add('d', 1);
                addedDates.push(this.addDate(lastDay.toDate()));
            }

            return addedDates;

            function checkNeedToFill() {
                var emptyList = (datesList.querySelector(".date") == null);
                var needFutureDaysDisplayed = (lastDay.diff(dateToday, "days") < that._options.futureDayDisplayCount);
                var userScrolledToListEnd;
                if (datesList.offsetHeight == 0 || datesList.offsetWidth == 0)
                    userScrolledToListEnd = false;
                else
                    userScrolledToListEnd = (datesList["scroll" + sizeDirection] - datesList["offset" + sizeDirection] - datesList["scroll" + positionDirection] < THRESHOLD);
                return emptyList || (userScrolledToListEnd && needFutureDaysDisplayed);
            }
        },

        getCurrentSalah: function () {
            var now = new Date();

            // Check if yesterday's isha is still in effect
            var yesterdaySalahEl = document.getElementById(this.toDateId(moment().subtract('d', 1).toDate()));

            if (yesterdaySalahEl) {
                var ishaEl = yesterdaySalahEl.querySelector(".isha");
                if (ishaEl && ishaEl.expiry > now)
                    return ishaEl;
            }

            // Not yesterday's isha, iterate over today's salah

            var todaysSalahEl = document.getElementById(this.toDateId(new Date()));
            if (todaysSalahEl) {
                var salah = todaysSalahEl.querySelector(".salahList").getElementsByTagName("li");
                for (var s = 0; s < salah.length; s++) {
                    var salahEl = salah.item(s);
                    if (now > salahEl.time && now < salahEl.expiry)
                        return salahEl;
                }
            }

            return null;
        },

        /* Updates the datesList. Returns a Promise that is completed when the datesList has finished updating */
        updateAsync: function () {            
            var promises = [], that = this;

            var expired = this.getExpired();
            // Remove the expired salah or the expired date
            if (this._options.removeExpiredSalah) {
                // Remove expired salah elements, use an animation if only 1 has expired
                if (expired.salahs.length == 1) {
                    var wipePromise = null, dateFadePromise = null;
                    wipePromise = wipeAsync(expired.salahs[0]);
                    promises.push(wipePromise);

                    // Check if we have an expired date, then the expired salah was isha, so we need to do some 
                    // additional animating to make everything look great
                    if (expired.dates.length != 0) {
                        // Remove the expired date with an animation
                        var expiredDate = expired.dates[0];
                        var expiredDateStamp = expiredDate.querySelector(".dateStamp");
                        dateFadePromise = WinJS.UI.Animation.fadeOut(expiredDateStamp).then(function () {
                            expiredDate.querySelector(".salahList").style.marginTop = expiredDateStamp.offsetHeight + "px";
                            expiredDate.removeChild(expiredDateStamp);
                        });
                        promises.push(dateFadePromise);

                        WinJS.Promise.join({ wipe: wipePromise, date: dateFadePromise }).then(function () {
                            that._datesList.removeChild(expiredDate);
                        });
                    }
                } else {
                    // Otherwise remove salah & dates from the page immediately
                    for (var s = 0; s < expired.salahs.length; s++) {
                        var expiredSalah = expired.salahs[s];
                        expiredSalah.parentNode.removeChild(expiredSalah);
                    }

                    // Remove fully expired dates
                    for (var d = 0; d < expired.dates.length; d++) {
                        this._datesList.removeChild(expired.dates[d]);
                    }
                }
            } else {
                // Style the expired salahs
                for (var e = 0; e < expired.salahs.length; e++) {
                    var expiredSalah = expired.salahs[e];
                    WinJS.Utilities.addClass(expiredSalah, "expired"); // util method doesn't add duplicates

                    // If an expired salah was current salah refresh its contents to show it's not current
                    if (WinJS.Utilities.hasClass(expiredSalah, "current")) {
                        WinJS.Utilities.removeClass(expiredSalah, "current");
                        // Remove the progress container
                        expiredSalah.removeChild(expiredSalah.querySelector(".progressContainer"));
                        promises.push(this.changeSalahTimeTextAsync(expiredSalah, moment(expiredSalah.time).format("h\u2236mm a")));
                    }
                }

                if (expired.dates.length != 0) {
                    // Remove fully expired dates with an animation
                    var remainingDates = [];
                    var lastDeletedDate = moment(expired.dates[expired.dates.length - 1].date);
                    var nextDate = null;
                    while (nextDate = document.getElementById(this.toDateId(lastDeletedDate.add('d', 1).toDate()))) {
                        remainingDates.push(nextDate);
                    }

                    // Set up delete from list animation
                    var deleteAnimation = WinJS.UI.Animation.createDeleteFromListAnimation(expired.dates, remainingDates);

                    for (var d = 0; d < expired.dates.length; d++) {
                        var deletedItem = expired.dates[d];
                        deletedItem.style.position = "fixed";
                        deletedItem.style.opacity = "0";
                    }

                    promises.push(deleteAnimation.execute().then(function() {
                        for (var d = 0; d < expired.dates.length; d++) {
                            var expiredDate = expired.dates[d];
                            if (expiredDate.parentNode)
                                that._datesList.removeChild(expiredDate);
                        }
                    }));
                }
            }

            // Update the current prayers time remaining
            var currentSalah = this.getCurrentSalah();
            if (currentSalah) {
                // If the current salah has just become current, add the necessary elements to it
                if (!WinJS.Utilities.hasClass(currentSalah, "current")) {
                    WinJS.Utilities.addClass(currentSalah, "current");

                    // Add a progress element to the current salah
                    var container = document.createElement("div");
                    container.className = "progressContainer";
                    currentSalah.appendChild(container);
                    var progress = document.createElement("progress");
                    container.appendChild(progress);
                    progress.max = currentSalah.expiry.getTime() - currentSalah.time.getTime();
                    WinJS.UI.Animation.fadeIn(progress);
                }

                // Get an english read-able amount of time remaining
                var diff = moment(currentSalah.expiry).fromNow(true);
                var timeRemainingString = diff.charAt(0).toUpperCase() + diff.substring(1) + " remaining";

                // Update the time string
                promises.push(this.changeSalahTimeTextAsync(currentSalah, timeRemainingString));

                // Update the progress element
                currentSalah.querySelector("progress").value = Date.now() - currentSalah.time.getTime();
            }

            // Check today elements title
            var todayEl = document.getElementById(this.toDateId(new Date()));
            if (todayEl && todayEl.querySelector(".dateStamp").innerText != "Today") {
                // Date stamps are stale, update them
                var yesterday = moment().subtract('d', 1).toDate();
                var tomorrow = moment().add('d', 1).toDate();
                
                var yesterdayEl = document.getElementById(this.toDateId(yesterday)),
                    tomorrowEl = document.getElementById(this.toDateId(tomorrow));

                if (yesterdayEl)
                    replaceDateStamp(yesterdayEl, "Yesterday");
                if (todayEl)
                    replaceDateStamp(todayEl, "Today");
                if (tomorrowEl)
                    replaceDateStamp(tomorrowEl, "Tomorrow");
            }

            return WinJS.Promise.join(promises);

            function replaceDateStamp(salah, text) {
                /// <param name="salah" type="HTMLElement">The salah element for which to change the dateStamp</param>
                var newStamp = document.createElement("label");
                newStamp.className = "dateStamp";
                newStamp.innerText = text;

                var oldStamp = salah.firstElementChild;
                newStamp.style.position = "absolute";
                salah.insertBefore(newStamp, oldStamp);
                WinJS.UI.Animation.crossFade(newStamp, oldStamp).then(function () {
                    newStamp.style.position = "";
                    salah.removeChild(oldStamp);
                });
            }
        },

        changeSalahTimeTextAsync: function (salahEl, text) {
            var salahTime = salahEl.querySelector("h2");

            // use a hidden element to measure what the actual length of the text would be
            var hidden = document.createElement(salahTime.tagName);
            salahEl.appendChild(hidden);
            hidden.innerText = text;
            hidden.style.display = "inline-block";
            var hiddenWidth = getComputedStyle(hidden).width;
            salahEl.removeChild(hidden);

            salahTime.style.width = hiddenWidth;
            salahTime.innerText = text;

            var duration = parseFloat(salahTime.currentStyle.msTransitionDuration) * 1000;
            return WinJS.Promise.timeout(duration);
        },

        toDateId: function (date) {
            // HTML 4 Spec neccesitates ids to start with a letter
            return "date" + moment(date).format("MMDDYYYY");
        }
    });

    /* Returns a promise that completes when the element is removed */
    function wipeAsync(el) {
        el.className = "wipeable";

        /* clientWidth (and outerWidth, scrollWidth) return imprecise/rounded values (e.g. 39px) while getBoundingClientRect().width is
           the actual floating point value (39.399347px), but these both include padding and in practice don't work.
           They caused the element to be sized smaller than it was actually was (hence inflating the element height with word wrap).
           However the method used is getComputedStyle(li).width which is what works best, it doesn't include padding, 
           just straight up width. */
        var computedWidth = parseFloat(getComputedStyle(el).width);

        // for css width transitions to work, element must have a width set
        el.style.width = computedWidth + "px";

        // this variable is not used, but when I get rid of this statement the wipe animation breaks
        // (might be due to the javascript bytecode optimizer)
        var duration = 1000 * parseFloat(el.currentStyle.msTransitionDuration); // milliseconds

        // wipe the element
        el.style.paddingLeft = "0px";
        el.style.paddingRight = "0px";
        el.style.width = "0px";

        // remove any background and border
        setTimeout(function () {
            var rightWidth = parseFloat(el.currentStyle.borderRightWidth) || 0, leftWidth = parseFloat(el.currentStyle.borderRightWidth) || 0;
            var borderWidth = rightWidth + leftWidth;
            if (borderWidth != 0)
                el.style.borderColor = "rgba(0, 0, 0, 0)"; // document.body.currentStyle.backgroundColor;
            el.style.marginRight = -1 * (borderWidth) + "px";
        }, 700); // timeout values hard coded, matching CSS

        return new WinJS.Promise(function (complete, error, progress) {
            var DELAY = 100;
            setTimeout(function () {
                el.parentNode.removeChild(el);
                complete();
            }, 1400 + DELAY);
        });
    }
})();