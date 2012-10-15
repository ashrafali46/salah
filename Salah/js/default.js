// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";
    
    var prayerCalculator;
    var updateInterval;

    // check for first run etc...

    var app = WinJS.Application;
    app.addEventListener("activated", activatedHandler, false);
    app.start();

    /* The app splashscreen is torn down as soon as the activated callback returns, or, alternatively
       when the promise set with eventArgs.setPromise() completes */
    function activatedHandler(eventArgs) {
        var activation = Windows.ApplicationModel.Activation;
        console.log("App activation.");
        if (eventArgs.detail.kind == activation.ActivationKind.launch) {
            // Regardless of launch type, I will always want to display the same content (fresh salah times)
            console.log("App launched. Last state: " + eventArgs.detail.previousExecutionState);
            if (eventArgs.detail.previousExecutionState != activation.ApplicationExecutionState.running) {
                // When we launch the app from any state other than running (notRunning, suspended, terminated, closedByUser) 

                var splash = eventArgs.detail.splashScreen;
                splash.addEventListener("dismissed", function () {
                    console.log("Splash screen dismissed.");
                }, false);

                var location = { latitude: 43.44, longitude: -80.31 };
                var method = PrayerCalculator.Methods.ISNA;
                prayerCalculator = new PrayerCalculator(location, method);

                WinJS.Utilities.ready(function () {
                    // ensure DOM ready
                    var datesList = document.getElementById("datesList");
                    datesList.addEventListener("scroll", datesListScrollHandler);

                    // begin adding prayers to the page
                    var yesterday = moment().add('d', -1);
                    var now = moment();
                    addSalahTimes(yesterday.toDate()); // load all of yesterday's times in case last night's isha is still in effect
                    addSalahTimes(now.toDate());

                    // remove salah that have already expired
                    console.log("Removing expired prayers.");

                    // eventArgs.setPromise defers tearing down the loading screen until the supplied promise is fulfilled.
                    eventArgs.setPromise(
                        removeExpiredAsync(false).then(function () {
                            console.log("Removed expired prayers");
                            // fill datesList with days so that salah times overflow the screen width
                            return fillDatesListAsync();
                        }).then(function() {
                            console.log("Filled datesList.");
                            // page is loaded with enough prayers
                            var INITIAL_DELAY = 1900, INTERVAL = 20000;
                            setTimeout(function () {
                                updateDatesList();
                            }, INITIAL_DELAY);
                            //updateInterval = setInterval(updateDatesList, INTERVAL);

                            WinJS.UI.Animation.enterPage(
                                [[document.getElementById("header")], [document.getElementById("content")]],
                                [{ top: "0px", left: "30px" }, { top: "0px", left: "100px" }]
                            );

                            console.log("Completed init.");
                        })
                    );
                }, false);
            }
        }
    }

    function addSalahTimes(date, animate) {
        var times = prayerCalculator.calculateTimes(date);
        var time; // iterator

        // check if any of the times are invalid
        for (time in times) {
            if (isNaN(times[time].getTime())) {
                // error: query user if they live on mars
                // e.g. "Do you live on Mars? We're currently unable to calculate prayer times for your
                // location. Please check your location setting."
                //  prompt: Ok
            }
        }

        var datesList = document.getElementById("datesList");
        var prayerDate = document.createElement("li");
        datesList.appendChild(prayerDate);
        prayerDate.id = date.toLocaleDateString(); // can use getTime() which imposes a strict order on the ids
        prayerDate.date = date;
        prayerDate.className = "date";

        var dateStamp = document.createElement("label");
        prayerDate.appendChild(dateStamp);
        dateStamp.className = "dateStamp";
        var now = moment();
        var dateMoment = moment(date);

        // TODO: Add functionality to update dateStrings when days pass
        var dateString;
        switch (dateMoment.diff(now, 'days')) {
            /*case -1:
                dateString = "Yesterday";
                break;
            case 0:
                dateString = "Today";
                break;
            case 1:
                dateString = "Tomorrow";
                break;*/
            default:
                dateString = dateMoment.format("MMMM Do");
                break;
        }
        dateStamp.innerText = dateString;

        var timesList = document.createElement("ol");
        prayerDate.appendChild(timesList);
        timesList.className = "salahList";

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
            salahTime.innerText = moment(times[time]).format("h:mm a");
            // ensure salahTime has a width set (for proper first animation)
            salahTime.style.width = getComputedStyle(salahTime).width;
        }
    }

    /* Removes prayers that have expired, returns a promise that completes when the expired prayers are removed */
    function removeExpiredAsync(animate) {
        // behavior: if coming back to the app (alt-tabbing/minimize maximize) after a long period
        // enumerate expired times: if 1 then swipe remove, more than 1 fast delete all

        var expiredSalahs = [];
        var expiredDates = [];
        
        var datesList = document.getElementById("datesList");

        // iterate over dates
        var dates = datesList.getElementsByClassName("date");
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
                        datesList.removeChild(expiredDates[e]);
                    }

                    complete();
                });
            });
        } else {
            return new WinJS.Promise(function (complete, error, progress) {
                for (var s = 0; s < expiredSalahs.length; s++) {
                    var expiredSalah = expiredSalahs[s];
                    expiredSalah.parentNode.removeChild(expiredSalah);
                }

                for (var e = 0; e < expiredDates.length; e++) {
                    datesList.removeChild(expiredDates[e]);
                }

                complete();
            });
        }
    }

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
        var datesList = document.getElementById("datesList");
        var paddingLeft = parseFloat(datesList.currentStyle.paddingLeft);
        var els = datesList.getElementsByClassName("date");
        var snapPoints = [];
        for (var i = 0; i < els.length; i++) {
            snapPoints.push((els.item(i).offsetLeft - paddingLeft) + "px");
        }
        datesList.style.msScrollSnapPointsX = "snapList(" + snapPoints.toString() + ")";
    }

    /* Adds additional prayers when user scrolls to end of datesList */
    function datesListScrollHandler(scrollEvent) {
        // TODO implement custom scrolling (buttons, i'm thinking) for when user
        // is using mouse input (not touch). This is because in the case when the user drags the scroll bar 
        // to scroll, the list jerks (due to conflicting scrollLeft and mouse position) after adding some
        // more prayer times
        var datesList = document.getElementById("datesList");

        // check if user has scrolled within THRESHOLD pixels of end
        var endDistance = (datesList.scrollWidth - datesList.offsetWidth) - datesList.scrollLeft;
        var THRESHOLD = 30;

        if (endDistance < THRESHOLD) {
            // add an additional date to the list
            setImmediate(function () {
                var lastDate = datesList.lastElementChild.date;
                addSalahTimes(moment(lastDate).add('d', 1).toDate());
                setSnapPoints(); // reset snap points
            });
        }
    }

    function fillDatesListAsync() {
        return new WinJS.Promise(function (complete, error, progress) {
            var datesList = document.getElementById("datesList");
            if (datesList.getElementsByTagName("li").length == 0) {
                addSalahTimes(new Date());
                removeExpiredAsync(false).then(fillExtraSpace);
            } else {
                fillExtraSpace();
            }

            function fillExtraSpace() {
                while (datesList.scrollWidth <= datesList.offsetWidth) {
                    var lastDate = datesList.lastElementChild;
                    addSalahTimes(moment(lastDate.date).add('d', 1).toDate());
                }
                setSnapPoints();
                complete();
            }
        });
    }

    // TODO make this async
    /* Updates the datesList */
    function updateDatesList() {
        console.log("Updating list");
        removeExpiredAsync(true).then(function () {
            var current = getCurrentPrayer();
            if (current) {
                updateCurrentAsync().then(function () {
                    // fill the datesList so it overflows the screen (also ensuring it always contains 
                    // the upcoming salah times)
                    return fillDatesListAsync();
                }).then(setSnapPoints);
            }
        });

        /* If a prayer is current this updates it:
                - Adds and updates the progress bar 
                - Updates the time text (animating it)
           Return a promise that completes when the current list element reaches its final width value
        */
        function updateCurrentAsync() {
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

            var datesList = document.getElementById("datesList");

            // check if a prayer is current
            // note there is not necessarily always a current prayer (think about time after sunrise and before dhuhr)
            var candidate = datesList.firstElementChild.getElementsByClassName("salahList")[0].firstElementChild;
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
    }
})();
