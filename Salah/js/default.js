// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509

(function () {
    "use strict";

    var header, controlHost, datesContainer;
    
    // Regardless of activation/launch type, I will always want to display the same content (fresh salah times)
    //WinJS.Utilities.ready(function () { setupUI(uiSetupCompletedCallback);});
    WinJS.Utilities.ready(function () {
        console.log("DOM Ready.");

        controlHost = document.getElementById("content");
        WinJS.UI.Pages.render("pages/initialRun.html", controlHost);
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
        });*/

        header = document.getElementById("header");
        //header.style.opacity = 0;
    });

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

                /* Activation is exposed through the WinJS.Application.onactivated event. This event
                   is fired after DOMContentLoaded completes if the app isn’t already running or isn’t suspended.
                   Otherwise, the event is fired as soon as Windows needs to activate the app. */
                // App activation comes after DOMContentLoaded, but just to make it explicitly clear, we'll
                // set this.
                //eventArgs.setPromise(uiSetupCompletePromise);

                var splash = eventArgs.detail.splashScreen;
                /* The app splashscreen is torn down as soon as the activated callback returns, or, alternatively
                   when the promise set with eventArgs.setPromise() completes */
                splash.addEventListener("dismissed", function () {

                    // TODO: try to make it so you can just animate the PageControl into view
                    // (issue: position: absolute on the datesContainer messes with the enterPage animation when 
                    //  running on the controlHost)
                    //WinJS.UI.Animation.enterPage([[header], [datesContainer]], null);

                    console.log("Splash screen dismissed.");
                });

                // window visibilitychange listener used when the app is maximized/minimized*
                // Right now if the user minimizes the app and comes back to it after some prayers have
                // expired, the screenshot of the app windows 8 caches (to make resume time seem small)
                // is stale, and when that image is replaced with the actually UI there differences are
                // shown immediate (not smooth), causing a poor user experience.
                // TODO: investigate the image windows uses to cache what your app's UI looked like when it
                // was minimized, investigate updating UI only after the user resumes your app.
                // *note windows suspends apps ~10 seconds after they have been minimized
                // document.addEventListener("visibilitychanged", ... handler);

                // Following resuming app guidelines (for refreshing stale content)
                // http://msdn.microsoft.com/en-us/library/windows/apps/hh465114.aspx
                //Windows.UI.WebUI.WebUIApplication.addEventListener("resuming", resumingHandler, false);

            }
        }
    }
        
})();
