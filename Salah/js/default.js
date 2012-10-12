// For an introduction to the Blank template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232509
(function () {
    "use strict";
    
    var app = WinJS.Application;
    app.addEventListener("activated", activatedHandler, false);
    app.start();

    function activatedHandler(eventArgs) {
        var activation = Windows.ApplicationModel.Activation;
        console.log("App activation.");
        if (eventArgs.detail.kind == activation.ActivationKind.launch) {
            console.log("App launched. Last state: " + eventArgs.detail.previousExecutionState);
            if (eventArgs.detail.previousExecutionState != activation.ApplicationExecutionState.running) {
                WinJS.Utilities.ready(function () {
                    // ensure DOM ready
                    console.log("Attaching event handlers to controls");
                    document.getElementById("addButton").addEventListener("click", addButtonHandler);
                }, false);
            }
        }

        // eventArgs.setPromise defers tearing down the loading screen until the supplied promise is fulfilled.
        eventArgs.setPromise(WinJS.UI.processAll());
    }

    function addButtonHandler(clickEvent) {
        console.log("Add button clicked.");
    }

    function addTimes() {
        console.log("Adding times");
    }
})();
