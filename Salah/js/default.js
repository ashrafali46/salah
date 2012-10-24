/// <reference path="ApplicationSettings.js" />

(function () {
    "use strict";
    
    // Location is undefined iff app is being run for the first time, we always want to go directly to app
    // settings if it ever is
    var view;
    var location = ApplicationSettings.location;
    view = (location === undefined) ? "settings" : "salah";

    var pageReadyPromise;
    WinJS.Utilities.ready(function () {
        if (view == "settings") {
            pageReadyPromise = WinJS.UI.Pages.render(
                "/pages/settings.html", 
                document.getElementById("settingsHost"), 
                { settingsFinishedCallback: showContent });
        } else {
            pageReadyPromise = WinJS.UI.Pages.render("/pages/salah.html", document.getElementById("salahHost"));
        }
    }, false);

    var app = WinJS.Application;
    app.addEventListener("activated", activatedHandler);
    app.start();
    
    function activatedHandler(eventArgs) {
        var activation = Windows.ApplicationModel.Activation;
        console.log("App activation.");
        if (eventArgs.detail.kind == activation.ActivationKind.launch) {
            
            console.log("App launched. Last state: " + eventArgs.detail.previousExecutionState);
            if (eventArgs.detail.previousExecutionState != activation.ApplicationExecutionState.running) {
                // When we launch the app from any state other than running (notRunning, suspended, terminated, closedByUser)

                eventArgs.setPromise(pageReadyPromise);

                var splash = eventArgs.detail.splashScreen;
                /* The app splashscreen is torn down as soon as the activated callback returns, or, alternatively
                   when the promise set with eventArgs.setPromise() completes */
                splash.addEventListener("dismissed", function () {
                    console.log("Splash screen dismissed.");
                });
            }
        }
    }

    function showContent() {
        // Remove salah and reshow them
        var salahHost = document.getElementById("salahHost");
        WinJS.Utilities.empty(salahHost);
        var animate = [];
        WinJS.UI.Pages.render("/pages/salah.html", salahHost, { animatableElements: animate }).then(function (salahControl) {
            if (view == "settings")
                WinJS.UI.Animation.exitContent(document.getElementById("settingsHost"));

            WinJS.UI.Animation.enterContent(animate);
            view = "salah";
        });
    }
        
})();


/*
    // Regardless of activation/launch type, I will always want to display the same content (fresh salah times)
    //WinJS.Utilities.ready(function () { setupUI(uiSetupCompletedCallback);});
    WinJS.Utilities.ready(function () {
        console.log("DOM Ready.");

        var fc = function() {
            console.log("Settings finished");
            WinJS.UI.Animation.exitContent(settingsHost).then(function () {
                settingsHost.style.display = "none";
                var salahHost = document.getElementById("salahHost");
                WinJS.UI.Pages.render("pages/salah.html", salahHost).then(function (salahControl) {
                    WinJS.UI.Animation.enterContent([salahHost.querySelector("#header"), salahHost.querySelector("#datesListContainer")]);

                    var INTERVAL = 60000;
                    setInterval(function () {
                        salahControl.updateDatesListAsync()
                    }, INTERVAL);

                    var INITIAL_DELAY = 2800;
                    setTimeout(function () {
                        salahControl.updateDatesListAsync();
                    }, INITIAL_DELAY);
                });
            });
        }

        settingsHost = document.getElementById("settingsHost");
        settingsHost.style.opacity = 0;
        pageRenderedPromise = WinJS.UI.Pages.render("pages/settings.html", settingsHost, { finishCallback: fc });
        /*WinJS.UI.Pages.render("pages/salah.html", controlHost).then(function (salahControl) {
            datesContainer = controlHost.querySelector("#datesListContainer");

            // Opacity 0 so it fades in with the enterPage animation
            //datesContainer.style.opacity = 0;

            var INTERVAL = 60000;
            setInterval(function () {
                salahControl.updateDatesListAsync()
            }, INTERVAL);

            var INITIAL_DELAY = 2800;
            setTimeout(function() {
                salahControl.updateDatesListAsync();
            }, INITIAL_DELAY);
        });
});*/
    