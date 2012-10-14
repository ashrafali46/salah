// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";
    
    var prayerCalculator;
    // check for first run etc...

    var app = WinJS.Application;
    app.addEventListener("activated", activatedHandler, false);
    app.start();


    function activatedHandler(eventArgs) {
        var activation = Windows.ApplicationModel.Activation;
        console.log("App activation.");
        if (eventArgs.detail.kind == activation.ActivationKind.launch) {
            // Regardless of launch type, I will always want to display the same content (fresh salah times)
            console.log("App launched. Last state: " + eventArgs.detail.previousExecutionState);
            if (eventArgs.detail.previousExecutionState != activation.ApplicationExecutionState.running) {
                WinJS.Utilities.ready(function () {
                    // ensure DOM ready
                    console.log("Attaching event handlers to controls");
                    //document.getElementById("addButton").addEventListener("click", addButtonHandler);
                }, false);
            }
        }

        // eventArgs.setPromise defers tearing down the loading screen until the supplied promise is fulfilled.
        eventArgs.setPromise(new WinJS.Promise(function (complete, error, progress) {
            // create PrayerCalculator
            var location = { latitude: 43.44, longitude: -80.31 };
            var method = PrayerCalculator.Methods.ISNA;
            prayerCalculator = new PrayerCalculator(location, method);

            var yesterday = moment().add('d', -1);
            var now = moment();
            WinJS.Utilities.ready(function () {
                addSalahTimes(yesterday.toDate()); // load all of yesterday's times in case last night's isha is still in effect
                addSalahTimes(now.toDate());

                // remove salah that have already expired
                removeExpiredAsync(false).then(function () {
                    // fill datesList with days so that salah times overflow the screen width
                    var datesList = document.getElementById("datesList");
                    var dateIter = now.clone();
                    while (datesList.scrollWidth <= datesList.offsetWidth) {
                        addSalahTimes(dateIter.add('d', 1).toDate());
                    }

                    setSnapPoints();

                    datesList.addEventListener("scroll", datesListScrollHandler);
				});

                complete();

                /*  if using large background images... which take some time to load change to:
                    var bgImage = document.getElementById("bgImage"); // refers to the empty image tag
                    bgImage.addEventListener("load", function() { complete() });
                    bgImage.src = // path to background;
                });*/
            });

        }));
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
            if (time == "sunrise")
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
                    expiry = prayerCalculator.calculateTimes(moment(new Date(date)).add('d', 1).toDate()).fajr;
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
                    console.log(salah.firstElementChild.innerText + " is current/next prayer");
                    freshSalah = true;
                    break;
                }
            }

            // check if all salahs on this date have expired (i.e. we have not found a fresh salah)
            if (freshSalah == false) {
                console.log(date.firstElementChild.innerText + " is empty.");
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
        console.log(datesList.scrollLeft + " " + datesList.scrollWidth);

        // check if user has scrolled within THRESHOLD pixels of end
        var endDistance = (datesList.scrollWidth - datesList.offsetWidth) - datesList.scrollLeft;
        var THRESHOLD = 50;

        if (endDistance < THRESHOLD) {
            // add an additional date to the list
            var lastDate = datesList.lastElementChild.date;
            addSalahTimes(moment(lastDate).add('d', 1).toDate());
            setSnapPoints(); // reset snap points
        }
    }


    function addButtonHandler(clickEvent) {
        console.log("Add button clicked.");
    }

    function checkForExpiry() {
        // period check (every 1 minute) to check if a prayer time has passed 
        // or a new day needs to be loaded
    }
})();
