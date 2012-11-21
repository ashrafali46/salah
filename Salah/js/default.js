/// <reference path="ApplicationSettings.js" />

(function () {
    "use strict";

    var contentHost;
    var delayPromises = [], teardownPromise;
    var ApplicationViews = { settings: "settings", salah: "salah" };
    
    // Location is undefined iff app is being run for the first time, we always want to go directly to app
    // settings if it ever is
    var view = null,
        initialView = (ApplicationSettings.location.coord === undefined) ? ApplicationViews.settings : ApplicationViews.salah;

    WinJS.Utilities.ready(function () {
        contentHost = document.getElementById("contentHost");

        // Set the page background
        if (ApplicationSettings.background && ApplicationSettings.background.indexOf("pattern") == -1) {
            var backgroundLoaderImage = document.createElement("img");

            var loadCallback;
            var backgroundLoadPromise = new WinJS.Promise(function (c) { loadCallback = c });
            backgroundLoaderImage.addEventListener("load", function () {
                var backgroundEl = document.getElementById("background");
                backgroundEl.style.backgroundImage = "url('" + backgroundLoaderImage.src + "')";
                backgroundLoaderImage = null;
                setTimeout(loadCallback, 50); // A tiny delay to prevent the background from popping in
            });

            backgroundLoaderImage.src = "/images/backgrounds/" + ApplicationSettings.background;
            delayPromises.push(backgroundLoadPromise);
        }

        switch (initialView) {
            case ApplicationViews.salah:
                delayPromises.push(loadSalah());
                break;
            case ApplicationViews.settings:
                delayPromises.push(loadSettings());
                break;
        }

        contentHost.style.visibility = "hidden";
        teardownPromise = WinJS.Promise.join(delayPromises);
        teardownPromise.then(function () {
            // Animate the content (using an enterPage animation) after the splash screen has been torn down
            contentHost.style.visibility = "visible";
            var animationElements = contentHost.winControl.enterContentAnimationElements;
            WinJS.UI.Animation.enterPage(animationElements);
        });
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
            eventArgs.setPromise(teardownPromise);
        }
    }

    function setupSettingsCharm() {
        var AppSettings = Windows.UI.ApplicationSettings;
        var settingsPane = AppSettings.SettingsPane.getForCurrentView();

        settingsPane.addEventListener("commandsrequested", function(event) {
            var appCommands = event.detail[0].request.applicationCommands;

            // according to guidelines for app settings, Options is the name that should be used for a generic settings category
            var settingsFlyoutCommand = new AppSettings.SettingsCommand("optionsFlyout", "Options", function () {
                WinJS.UI.SettingsFlyout.showSettings("optionsFlyout", "/pages/optionsflyout.html");
            });
            appCommands.append(settingsFlyoutCommand);

            var privacyCommand = new AppSettings.SettingsCommand("privacy", "Privacy Policy", function () {
                WinJS.UI.SettingsFlyout.showSettings("privacyPolicyFlyout", "/pages/privacypolicyflyout.html");
            });
            appCommands.append(privacyCommand);
        });
    }

    function loadSalah() {
        view = ApplicationViews.salah;

        WinJS.Utilities.empty(contentHost);
        return WinJS.UI.Pages.render("/pages/salah.html", contentHost);
    }

    window.loadSalah = loadSalah;

    function loadSettings() {
        if (view == ApplicationViews.settings)
            return;

        view = ApplicationViews.settings;

        WinJS.Utilities.empty(contentHost);
        return WinJS.UI.Pages.render("/pages/settings.html", contentHost);
    }

    var visibilityUpdateTimeout;
    function visibilityHandler() {
        if (view == ApplicationViews.salah) {
            if (document.hidden) {
                clearTimeout(visibilityUpdateTimeout);
                contentHost.winControl.stopUpdating()
            } else {
                // a short delay before resuming updating is required
                visibilityUpdateTimeout = setTimeout(function () {
                    contentHost.winControl.startUpdating();
                }, 600)
            }
        }
    }
})();