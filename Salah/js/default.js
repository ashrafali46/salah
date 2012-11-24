/// <reference path="backgroundChoices.js" />
/// <reference path="ApplicationSettings.js" />

(function () {
    "use strict";

    var contentHost;
    var teardownPromises = [], splashDismissedPromise, splashCallback;
    var salahBackgroundControl;

    WinJS.Utilities.ready(function () {
        contentHost = document.getElementById("contentHost");
        salahBackgroundControl = new BackgroundControl(document.getElementById("backgroundControlHost"));

        splashDismissedPromise = new WinJS.Promise(function (complete) {
            splashCallback = complete;
        });

        if (ApplicationSettings.firstRun) {
            // Set the prayer settings to the recommended (by me) values
            ApplicationSettings.salah.method = PrayerCalculator.Methods.ISNA;
            ApplicationSettings.salah.displayExpired = true;
            ApplicationSettings.salah.dayDisplayNumber = 1;

            // Set the background settings by choosing a random background
            ApplicationSettings.backgroundId = backgroundChoices[Math.floor(backgroundChoices.length * Math.random())].id;

            // Use a hidden location control to set the apps' location settings 
            var hiddenLocationEl = document.createElement("hiddenLocationControl");
            hiddenLocationEl.style.visibility = "hidden";
            var locationControl = new LocationControl(hiddenLocationEl);
            splashDismissedPromise.then(function () {
                locationControl._setLocationAutoAsync().then(function (successful) {
                    if (successful) {
                        ApplicationSettings.location.coord = locationControl.location;
                        ApplicationSettings.location.name = locationControl.locationName;
                        contentHost.style.visibility = "hidden";
                        loadSalah().then(function () {
                            WinJS.UI.Animation.enterPage([contentHost.querySelector(".header"), contentHost.querySelector("#datesList")]);
                            contentHost.style.visibility = "visible";
                        });

                        // Schedule some updates
                        (new UpdateScheduler()).schedule(
                            new PrayerCalculator(ApplicationSettings.location.coord, PrayerCalculator.Methods[ApplicationSettings.salah.method]), 3);
                    } else {
                        locationUnsuccessful();
                    }
                });
            });
        } else {
            if (ApplicationSettings.location.coord === undefined) {
                splashDismissedPromise.then(function () { locationUnsuccessful() });
            } else {
                // Display Salah
                contentHost.style.visibility = "hidden";
                splashDismissedPromise.then(function () {
                    loadSalah().then(function () {
                        WinJS.UI.Animation.enterPage([contentHost.querySelector(".header"), contentHost.querySelector("#datesList")]);
                        contentHost.style.visibility = "visible";
                    });
                });
            }
        }

        // Set the background
        for (var i = 0; i < backgroundChoices.length; i++) {
            var bgChoice = backgroundChoices[i];
            if (bgChoice.id == ApplicationSettings.backgroundId) {
                teardownPromises.push(salahBackgroundControl.set(bgChoice.id, bgChoice.imageURL));
                break;
            }
        }
    }, false);

    var app = WinJS.Application;
    app.addEventListener("activated", activatedHandler);
    setupSettingsCharm();
    app.start();
    
    // Activation event always occurs after DOMReady
    function activatedHandler(eventArgs) {
        var activation = Windows.ApplicationModel.Activation;
        if (eventArgs.detail.kind == activation.ActivationKind.launch && eventArgs.detail.previousExecutionState != activation.ApplicationExecutionState.running) {
            // When we launch the app from any state other than running (notRunning, suspended, terminated, closedByUser)
            eventArgs.setPromise(WinJS.Promise.join(teardownPromises));

            eventArgs.detail.splashScreen.addEventListener("dismissed", splashCallback);
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

    function showWiredOptionsFlyout() {
        showFlyout("optionsFlyout").then(function (flyout) {
            var bs = flyout._element.querySelector("#backgroundSelectorHost");
            bs.winControl.addEventListener("change", function (event) {
                var choice = event.detail.choice;
                ApplicationSettings.backgroundId = choice.id;
                salahBackgroundControl.set(choice.id, choice.imageURL);
            });

            flyout.addEventListener("settingschange", function (event) {
                if (salahLoaded) {
                    WinJS.UI.Animation.exitContent([contentHost.querySelector(".header"), contentHost.querySelector("#datesList")]).then(function () {
                        contentHost.style.visibility = "hidden";
                        loadSalah().then(function () {
                            WinJS.UI.Animation.enterContent([contentHost.querySelector(".header"), contentHost.querySelector("#datesList")]);
                            contentHost.style.visibility = "visible";
                        });
                    });
                } else {
                    contentHost.style.visibility = "hidden";
                    loadSalah().then(function () {
                        WinJS.UI.Animation.enterPage([contentHost.querySelector(".header"), contentHost.querySelector("#datesList")]);
                        contentHost.style.visibility = "visible";
                    });
                }
            });
        });
    }

    function setupSettingsCharm() {
        var AppSettings = Windows.UI.ApplicationSettings;
        var settingsPane = AppSettings.SettingsPane.getForCurrentView();

        settingsPane.addEventListener("commandsrequested", function (event) {
            var appCommands = event.detail[0].request.applicationCommands;

            // according to guidelines for app settings, Options is the name that should be used for a generic settings category
            var settingsFlyoutCommand = new AppSettings.SettingsCommand("optionsFlyout", "Options", function () {
                showWiredOptionsFlyout();
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
        if (document.hidden) {
            clearTimeout(visibilityUpdateTimeout);
            contentHost.winControl.stopUpdating();
        } else {
            // a short delay before resuming updating is required
            visibilityUpdateTimeout = setTimeout(function () {
                contentHost.winControl.startUpdating();
            }, 600)
        }
    }

    var salahLoaded = false;
    function loadSalah() {
        if (salahLoaded)
            clearSalah();

        salahLoaded = true;
        var salahOptions = {
            removeExpiredSalah: !ApplicationSettings.salah.displayExpired,
            futureDayDisplayCount: ApplicationSettings.salah.dayDisplayNumber - 1
        };
        return WinJS.UI.Pages.render("/pages/salah.html", contentHost, salahOptions).then(function () {
            document.addEventListener("visibilitychange", visibilityHandler);
        });
    }

    function clearSalah() {
        document.removeEventListener("visibilitychange", visibilityHandler);
        contentHost.winControl.unload();
        WinJS.Utilities.empty(contentHost);
        salahLoaded = false;
    }

    function locationUnsuccessful(error) {
        var locationMsg = new Windows.UI.Popups.MessageDialog("Oops. There was an error in determining your location, please check Salah's Options.");

        // Add commands and set their command handlers
        locationMsg.commands.append(new Windows.UI.Popups.UICommand("View Options", function () {
            showWiredOptionsFlyout();
        }));

        locationMsg.showAsync();
    }
})();