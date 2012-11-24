/// <reference path="ApplicationSettings.js" />


(function () {
    "use strict";

    var salahBackgroundControl;

    WinJS.Utilities.ready(function () {
        salahBackgroundControl = new BackgroundControl(document.getElementById("backgroundControlHost"));
    }, false);

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
        var callback;
        var flyoutAcquiredPromise = new WinJS.Promise(function (complete) {
            callback = complete;
        });

        msSetImmediate(flyoutAddedCheck);
        return flyoutAcquiredPromise;

        function flyoutAddedCheck() {
            var flyouts = document.querySelectorAll('div[data-win-control="WinJS.UI.SettingsFlyout"]');
            var len = flyouts.length, found = false;;
            for (var i = 0; i < len; i++) {
                var settingsFlyout = flyouts[i].winControl;
                if (settingsFlyout && settingsFlyout.settingsCommandId == flyoutCommandId) {
                    found = true;
                    callback(settingsFlyout);
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
                showFlyout("optionsFlyout").then(function (flyout) {
                    var bs = flyout._element.querySelector("#backgroundSelectorHost");
                    bs.winControl.addEventListener("change", function (event) {
                        var choice = event.detail.choice;
                        salahBackgroundControl.set(choice.id, choice.imageURL);
                    });
                });
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