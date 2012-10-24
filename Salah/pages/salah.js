(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/salah.html", {
        render: function (element, options, loadResult) {
            element.appendChild(loadResult);

            console.log("Setting up user interface");

            var location = { latitude: 43.44, longitude: -80.31 };
            var method = PrayerCalculator.Methods.ISNA;
            this._prayerCalculator = new PrayerCalculator(location, method);

            // ensure DOM ready
            this._datesList = element.querySelector("#datesList");

            // begin adding prayers to the page
            console.log("Adding yesterdays and todays salahs.");
            var yesterday = moment().add('d', -1);
            var now = moment();
            this.addSalahTimes(yesterday.toDate()); // load all of yesterday's times in case last night's isha is still in effect
            this.addSalahTimes(now.toDate());

            this.removeExpiredAsync(false).then(function () {
                console.log("Removed expired prayers.");

                // fill datesList with days so that salah times overflow the screen width
                // we could also define a var that = this, and use .call to bind the correct this object to these function calls
                // instead of using bind
                this.fillDatesListAsync();

                console.log("Filled datesList.");

                if (options && options.animatableElements) {
                    options.animatableElements.push(this.element.querySelector(".header"));
                    options.animatableElements.push(this._datesList);
                }

                // page is loaded with enough prayers
                console.log("Completed document UI setup.")
            }.bind(this));
        },

        ready: function(element, options, loadResult) {
            // Once rendering is complete we can measure lengths and attach handlers
            this._datesList.addEventListener("scroll", this.datesListScrollHandler.bind(this));

        },

        addSalahTimes: function (date, animate) {
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
            prayerDate.id = date.toDateString();
            prayerDate.date = date;
            prayerDate.className = "date";

            // Add a dateStamp <label> to the date <li> element
            var dateStamp = document.createElement("label");
            prayerDate.appendChild(dateStamp);
            dateStamp.className = "dateStamp";
            var now = moment();
            var dateMoment = moment(date);

            var dateString;
            switch (dateMoment.diff(now, 'days')) {
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
        },

        removeExpiredAsync: function (animate) {
            console.log("Removing expired prayers.");

            // behavior: if coming back to the app (alt-tabbing/minimize maximize) after a long period
            // enumerate expired times: if 1 then swipe remove, more than 1 fast delete all

            var expiredSalahs = [];
            var expiredDates = [];

            // iterate over dates
            var dates = this._datesList.getElementsByClassName("date");
            var d = 0;
            while (d < dates.length) {
                var freshSalah = false;

                var date = dates.item(d);
                var salahs = date.getElementsByClassName("salahList")[0].getElementsByTagName("li");

                for (var i = 0; i < salahs.length; i++) {
                    var salah = salahs.item(i);
                    if (salah.expiry.getTime() < Date.now()) {
                        expiredSalahs.push(salah);
                    } else {
                        //console.log(salah.firstElementChild.innerText + " is current/next prayer");
                        freshSalah = true;
                        break;
                    }
                }

                // check if all salahs on this date have expired (i.e. we have not found a fresh salah)
                if (freshSalah == false) {
                    //console.log(date.firstElementChild.innerText + " is empty.");
                    expiredDates.push(date);
                }

                // check if we've found all the expired prayers:
                // since dates are sorted chronologically, it is only necessary to keep checking
                // prayers until we encounter a date which has not expired
                if (freshSalah)
                    break;
                else
                    d++;
            }

            if (animate) {
                return new WinJS.Promise(function (complete, error, progress) {
                    var animPromises = [];

                    for (var e = 0; e < expiredDates.length; e++) {
                        var expDate = expiredDates[e];
                        var dateStamp = expiredDates[e].firstElementChild;
                        var fadeOut = WinJS.UI.Animation.fadeOut(dateStamp);
                        animPromises.push(fadeOut);
                        fadeOut.done(function () {
                            var salahList = expDate.getElementsByClassName("salahList")[0];
                            salahList.style.marginTop = dateStamp.offsetHeight + "px";
                            expDate.removeChild(dateStamp);
                        })
                    }

                    for (var s = 0; s < expiredSalahs.length; s++) {
                        animPromises.push(wipeAsync(expiredSalahs[s]));
                    }

                    WinJS.Promise.join(animPromises).done(function () {
                        for (var e = 0; e < expiredDates.length; e++) {
                            this._datesList.removeChild(expiredDates[e]);
                        }

                        complete();
                    });
                });
            } else {
                for (var s = 0; s < expiredSalahs.length; s++) {
                    var expiredSalah = expiredSalahs[s];
                    expiredSalah.parentNode.removeChild(expiredSalah);
                }

                for (var e = 0; e < expiredDates.length; e++) {
                    this._datesList.removeChild(expiredDates[e]);
                }

                return WinJS.Promise.as(null);
            }
        },

        fillDatesListAsync: function () {
            console.log("Filling the datesList.");
            return new WinJS.Promise(function (complete, error, progress) {
                fillExtraSpace = fillExtraSpace.bind(this);
                if (this._datesList.getElementsByTagName("li").length == 0) {
                    this.addSalahTimes(new Date());
                    this.removeExpiredAsync(false).then(fillExtraSpace);
                } else {
                    fillExtraSpace();
                }

                function fillExtraSpace() {
                    while (this._datesList.scrollWidth <= this._datesList.offsetWidth) {
                        var lastDate = this._datesList.lastElementChild;
                        this.addSalahTimes(moment(lastDate.date).add('d', 1).toDate(), true);
                    }
                    complete();
                }
            }.bind(this));
        },

        /* Updates the datesList. Returns a Promise that is completed when the datesList has finished updating */
        updateDatesListAsync: function () {
            var that = this;

            console.log("Updating datesList:");
            if (!this._lastUpdateTime)
                this._lastUpdateTime = new Date();

            return this.removeExpiredAsync(true).then(function () {
                updateDateStamps();

                var current = getCurrentPrayer();
                if (current) {
                    return updateCurrentAsync();
                }
            }).then(
                // fill the datesList so it overflows the screen (also ensuring it always contains 
                // the upcoming salah times)
                that.fillDatesListAsync.bind(that)
            ).then(function () {
                setImmediate(setSnapPoints());
                that._lastUpdateTime = new Date();
                console.log("Finished updating the datesList.");
            });

            /* If a prayer is current this updates it:
                    - Adds and updates the progress bar 
                    - Updates the time text (animating it)
               Return a promise that completes when the current list element reaches its final width value
            */
            function updateCurrentAsync() {
                console.log("Updating current salah.");
                var current = getCurrentPrayer();
                current.className = "current";
                var timeDiff = moment(current.expiry).fromNow(true);
                var animPromise = updateSalahTimeAsync(timeDiff.charAt(0).toUpperCase() + timeDiff.substring(1) + " remaining");

                // update progress bar
                getProgressBar().value = Date.now() - current.time.getTime();
                return animPromise;
            }

            /* Returns the HTMLElement that is the current prayer, assumes no expired prayers in datesList */
            function getCurrentPrayer() {
                var now = new Date();

                // check if a prayer is current
                // note there is not necessarily always a current prayer (think about time after sunrise and before dhuhr)
                var candidate = that._datesList.firstElementChild.getElementsByClassName("salahList")[0].firstElementChild;
                if (candidate.time < now) {
                    return candidate;
                }

                return null;
            }

            function updateSalahTimeAsync(text) {
                var current = getCurrentPrayer();
                var salahTime = current.getElementsByTagName("h2")[0];

                // use a hidden element to measure what the actual length of the text would be
                var hidden = document.createElement(salahTime.tagName);
                current.appendChild(hidden);
                hidden.innerText = text;
                hidden.style.display = "inline-block";
                var hiddenWidth = getComputedStyle(hidden).width;
                current.removeChild(hidden);

                salahTime.style.width = hiddenWidth;
                salahTime.innerText = text;

                return new WinJS.Promise(function (complete, error, progress) {
                    var animDuration = parseFloat(salahTime.currentStyle.msTransitionDuration) * 1000
                    setTimeout(complete, animDuration);
                });
            }

            function getProgressBar() {
                var current = getCurrentPrayer();
                if (current) {
                    var progress = current.getElementsByTagName("progress")[0];
                    if (!progress) {
                        // no progress bar, create it
                        var container = document.createElement("div");
                        container.className = "progressContainer";
                        current.appendChild(container);
                        progress = document.createElement("progress");
                        container.appendChild(progress);
                        // set the max property to the difference in milliseconds between the expiry time and start time
                        progress.max = current.expiry.getTime() - current.time.getTime();
                        WinJS.UI.Animation.fadeIn(progress);
                    }

                    return progress;
                }

                return null;
            }

            function updateDateStamps() {
                console.log("Updating date titles.");
                var now = new Date();

                // check if we've transitioned to a new day
                if (that._lastUpdateTime.toDateString() != now.toDateString()) {
                    var yesterday = moment(now).subtract('d', 1).toDate();
                    var tomorrow = moment(now).add('d', 1).toDate();

                    var yesterdayEl = that._datesList.getElementById(yesterday.toLocaleDateString());
                    var todayEl = that._datesList.getElementById(now.toLocaleDateString());
                    var tomorrowEl = that._datesList.getElementById(tomorrow.toLocaleDateString());

                    if (yesterdayEl)
                        replaceDateStamp(yesterdayEl, "Yesterday");

                    if (todayEl)
                        replaceDateStamp(todayEl, "Today");

                    if (tomorrowEl)
                        replaceDateStamp(tomorrowEl, "Tomorrow");
                }

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
            }
        },

        /* Adds additional prayers when user scrolls to end of datesList */
        datesListScrollHandler: function(scrollEvent) {
            // TODO implement custom scrolling (buttons, i'm thinking) for when user
            // is using mouse input (not touch). This is because in the case when the user drags the scroll bar 
            // to scroll, the list jerks (due to conflicting scrollLeft and mouse position) after adding some
            // more prayer times

            // check if user has scrolled within THRESHOLD pixels of end
            var endDistance = (this._datesList.scrollWidth - this._datesList.offsetWidth) - this._datesList.scrollLeft;
            var THRESHOLD = 30;

            if (endDistance < THRESHOLD) {
                // add an additional date to the list
                setImmediate(function () {
                    var lastDate = this._datesList.lastElementChild.date;
                    this.addSalahTimes(moment(lastDate).add('d', 1).toDate());
                    setSnapPoints(); // reset snap points
                }.bind(this));
            }
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

    /* Sets the css snap points property for snap scrolling */
    function setSnapPoints() {
        console.log("Setting snapPoints.");
        var datesList = document.getElementById("datesList");
        var paddingLeft = parseFloat(datesList.currentStyle.paddingLeft);
        var els = datesList.getElementsByClassName("date");
        var snapPoints = [];
        for (var i = 0; i < els.length; i++) {
            snapPoints.push((els.item(i).offsetLeft - paddingLeft) + "px");
        }
        datesList.style.msScrollSnapPointsX = "snapList(" + snapPoints.toString() + ")";
    }

})();