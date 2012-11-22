/// <reference path="ApplicationSettings.js" />

(function () {
    "use strict";

    var oldHideAllFlyouts = WinJS.UI._Overlay._hideAllFlyouts.bind(null), oldHideIfLostFocus = WinJS.UI._Overlay._hideIfLostFocus.bind(null);

    var app = WinJS.Application;
    app.addEventListener("activated", activatedHandler);
    document.addEventListener("visibilitychange", visibilityHandler);
    setupSettingsCharm();
    app.start();
    
    // Activation event always occurs after DOMReady
    function activatedHandler(eventArgs) {
        var activation = Windows.ApplicationModel.Activation;
        if (eventArgs.detail.kind == activation.ActivationKind.launch && eventArgs.detail.previousExecutionState != activation.ApplicationExecutionState.running) {
            // When we launch the app from any state other than running (notRunning, suspended, terminated, closedByUser)
            var splash = eventArgs.detail.splashScreen;
            ExtendedSplash.show(splash).then(function () {
                showFlyout("optionsFlyout");
            });
            //eventArgs.setPromise(teardownPromise);
        }
    }

    function showFlyout(flyoutCommandId) {
        var flyoutURL;
        switch (flyoutCommandId) {
            case "optionsFlyout":
                flyoutURL = "/pages/optionsflyout.html";
                break;
            case "privacyPolicyFlyout":
                flyoutURL = "/pages/privacypolicyflyout.html";
                break;
        }

        WinJS.UI.SettingsFlyout.showSettings(flyoutCommandId, flyoutURL);

        if (flyoutCommandId == "optionsFlyout" && true) {
            WinJS.UI._Overlay._hideAllFlyouts = function () { };
            WinJS.UI._Overlay._hideIfLostFocus = function () { };
            flyoutAddedCheck();
        }

        function flyoutAddedCheck() {
            var flyouts = document.querySelectorAll('div[data-win-control="WinJS.UI.SettingsFlyout"]');
            var len = flyouts.length, found = false;;
            for (var i = 0; i < len; i++) {
                var settingsFlyout = flyouts[i].winControl;
                if (settingsFlyout && settingsFlyout.settingsCommandId == "optionsFlyout") {
                    found = true;

                    var optionsFlyout = settingsFlyout;

                    optionsFlyout.addEventListener("beforehide", function () {
                        WinJS.UI._Overlay._hideAllFlyouts = oldHideAllFlyouts;
                        WinJS.UI._Overlay._hideIfLostFocus = oldHideIfLostFocus;
                    });

                    optionsFlyout.addEventListener("settingschange", function () {
                        var contentHost = document.getElementById("contentHost");
                        if (!setupNeeded()) {
                            WinJS.Utilities.empty(contentHost);
                            contentHost.style.opacity = 0;
                            WinJS.UI.Pages.render("/pages/salah.html", contentHost).then(function () {
                                ExtendedSplash.remove();
                                WinJS.UI.Animation.enterPage([contentHost.querySelector(".header"), contentHost.querySelector("#datesList")]);
                            });
                        }
                    });

                    break;
                }
            }

            if (!found)
                setTimeout(flyoutAddedCheck, 50);
        }
    }

    function setupSettingsCharm() {
        var AppSettings = Windows.UI.ApplicationSettings;
        var settingsPane = AppSettings.SettingsPane.getForCurrentView();

        settingsPane.addEventListener("commandsrequested", function (event) {
            var appCommands = event.detail[0].request.applicationCommands;

            // according to guidelines for app settings, Options is the name that should be used for a generic settings category
            var settingsFlyoutCommand = new AppSettings.SettingsCommand("optionsFlyout", "Options", function () {
                showFlyout("optionsFlyout");
            });
            appCommands.append(settingsFlyoutCommand);

            var privacyCommand = new AppSettings.SettingsCommand("privacyPolicyFlyout", "Privacy Policy", function () {
                showFlyout("privacyPolicyFlyout");
            });
            appCommands.append(privacyCommand);
        });
    }

    var visibilityUpdateTimeout;
    function visibilityHandler() {
        /*if (view == ApplicationViews.salah) {
            if (document.hidden) {
                clearTimeout(visibilityUpdateTimeout);
                contentHost.winControl.stopUpdating()
            } else {
                // a short delay before resuming updating is required
                visibilityUpdateTimeout = setTimeout(function () {
                    contentHost.winControl.startUpdating();
                }, 600)
            }
        }*/
    }

    function setupNeeded() {
        return (ApplicationSettings.location.coord === undefined);
    }
})();