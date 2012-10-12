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
            var location = { latitude: -80.31, longitude: 43.44 };
            var method = PrayerCalculator.Methods.ISNA;
            prayerCalculator = new PrayerCalculator(location, method);

            var now = moment();
            WinJS.Utilities.ready(function () {
                addSalahTimes(now.toDate());
                complete();
            });
        }));
    }

    function addSalahTimes(date) {
        var times = prayerCalculator.calculateTimes(date);

        var datesList = document.getElementById("datesList");
        var prayerDate = document.createElement("li");
        datesList.appendChild(prayerDate);
        prayerDate.id = date.toLocaleDateString();
        prayerDate.className = "date";

        var dateStamp = document.createElement("h1");
        prayerDate.appendChild(dateStamp);
        dateStamp.className = "dateStamp";
        dateStamp.innerText = moment(date).format("MMM Do");

        var timesList = document.createElement("ol");
        prayerDate.appendChild(timesList);
        timesList.className = "salahList";

        for (var time in times) {
            if (time == "sunrise")
                continue;

            var salahEl = document.createElement("li");
            timesList.appendChild(salahEl);

            var salahName = document.createElement("h2");
            salahEl.appendChild(salahName);
            salahName.innerText = time;

            var salahTime = document.createElement("h3");
            salahEl.appendChild(salahTime);
            salahTime.innerText = moment(times[time]).format("h:mm a");
        }
    }

    function addButtonHandler(clickEvent) {
        console.log("Add button clicked.");
        /*var location = { latitude: document.getElementById("latitude").value, longitude: document.getElementById("longitude").value };
        var date = document.getElementById("date").winControl.current;

        var pc = new PrayerCalculator(location, PrayerCalculator.Methods.ISNA);
        var times = pc.calculateTimes(date);
        
        var datesList = document.getElementById("datesList");
        var prayerDate = document.createElement("li");
        datesList.appendChild(prayerDate);
        prayerDate.id = date.toLocaleDateString();
        prayerDate.className = "date";
        
        var dateStamp = document.createElement("h1");
        prayerDate.appendChild(dateStamp);
        dateStamp.className = "dateStamp";
        dateStamp.innerText = moment(date).format("MMM Do");

        var timesList = document.createElement("ol");
        prayerDate.appendChild(timesList);
        timesList.className = "salahList";

        for (var time in times) {
            if (time == "sunrise")
                continue;

            var salahEl = document.createElement("li");
            timesList.appendChild(salahEl);

            var salahName = document.createElement("h2");
            salahEl.appendChild(salahName);
            salahName.innerText = time;

            var salahTime = document.createElement("h3");
            salahEl.appendChild(salahTime);
            salahTime.innerText = moment(times[time]).format("h:mm a");
        }*/
    }

    function clearExpired() {
        // behavior: if coming back to the app (alt-tabbing/minimize maximize) after a long period
        // enumerate expired times: if 1 then swipe remove, more than 1 fast delete all
    }

    function checkForExpiry() {
        // period check (every 1 minute) to check if a prayer time has passed 
        // or a new day needs to be loaded
    }
})();
