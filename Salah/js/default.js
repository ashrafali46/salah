/// <reference path="ApplicationSettings.js" />

(function () {
    "use strict";

    var INTERVAL = 60000, INITIAL_DELAY = 2800, salahUpdateInterval;
    
    // Location is undefined iff app is being run for the first time, we always want to go directly to app
    // settings if it ever is
    var view, settingsLoaded = false;

    var location = ApplicationSettings.location;
    view = (location === undefined) ? "settings" : "salah";

    var salahHost, settingsHost;
    var elementsToAnimate = [];

    var pageReadyPromise, backgroundLoadPromise;
    WinJS.Utilities.ready(function () {
        // Set the page background
        if (ApplicationSettings.background && ApplicationSettings.background.indexOf("pattern") == -1) {
            var backgroundLoaderImage = document.createElement("img");

            var loadCallback;
            backgroundLoadPromise = new WinJS.Promise(function (c) { loadCallback = c });
            backgroundLoaderImage.addEventListener("load", function () {
                var backgroundEl = document.getElementById("background");
                backgroundEl.style.backgroundImage = "url('" + backgroundLoaderImage.src + "')";
                backgroundLoaderImage = null;
                loadCallback();
            });

            backgroundLoaderImage.src = "/images/backgrounds/" + ApplicationSettings.background;
        } else {
            backgroundLoadPromise = WinJS.Promise.wrap(null);
        }

        salahHost = document.getElementById("salahHost");
        settingsHost = document.getElementById("settingsHost");

        if (view == "settings") {
            // Set the visibility to hidden for the initial enter page animation
            settingsHost.style.visibility = "hidden";
            pageReadyPromise = WinJS.UI.Pages.render(
                "/pages/settings.html",
                document.getElementById("settingsHost"),
                { settingsFinishedCallback: showContent }).then(function () {
                    settingsLoaded = true;
                }).then(function () {
                    elementsToAnimate = [[settingsHost.querySelector(".header")], [settingsHost.querySelector("#settingsContainer")]];
                });
        } else {
            salahHost.style.visibility = "hidden";
            pageReadyPromise = WinJS.UI.Pages.render("/pages/salah.html", document.getElementById("salahHost")).then(function () {
                elementsToAnimate = [[salahHost.querySelector(".header")], [salahHost.querySelector("#datesList")]];
            });
        }
    }, false);

    var app = WinJS.Application;
    app.addEventListener("activated", activatedHandler);
    setupSettingsCharm();
    app.start();
    
    function activatedHandler(eventArgs) {
        var activation = Windows.ApplicationModel.Activation;
        console.log("App activation.");
        if (eventArgs.detail.kind == activation.ActivationKind.launch) {
            
            console.log("App launched. Last state: " + eventArgs.detail.previousExecutionState);
            if (eventArgs.detail.previousExecutionState != activation.ApplicationExecutionState.running) {
                // When we launch the app from any state other than running (notRunning, suspended, terminated, closedByUser)
                eventArgs.setPromise(WinJS.Promise.join([pageReadyPromise, backgroundLoadPromise]));

                var splash = eventArgs.detail.splashScreen;
                /* The app splashscreen is torn down as soon as the activated callback returns, or, alternatively
                   when the promise set with eventArgs.setPromise() completes */
                splash.addEventListener("dismissed", function () {
                    console.log("Splash screen dismissed.");

                    settingsHost.style.visibility = "visible";
                    salahHost.style.visibility = "visible";
                    WinJS.UI.Animation.enterPage(elementsToAnimate);

                    if (view == "salah") {
                        clearInterval(salahUpdateInterval);
                        salahUpdateInterval = setInterval(function () {
                            salahHost.winControl.updateDatesListAsync()
                        }, INTERVAL);

                        setTimeout(function () {
                            salahHost.winControl.updateDatesListAsync();
                        }, INITIAL_DELAY);
                    }
                });
            }
        }
    }

    function setupSettingsCharm() {
        var AppSettings = Windows.UI.ApplicationSettings;
        var settingsPane = AppSettings.SettingsPane.getForCurrentView();

        settingsPane.addEventListener("commandsrequested", function(event) {
            var appCommands = event.detail[0].request.applicationCommands;

            var settingsCommand = new AppSettings.SettingsCommand("settings", "Settings", showSettings);
            appCommands.append(settingsCommand);

            var privacyCommand = new AppSettings.SettingsCommand("privacy", "Privacy Policy", function () {
                var uri = new Windows.Foundation.Uri("http://sites.google.com/site/salahprivacypolicy/");
                Windows.System.Launcher.launchUriAsync(uri);
            });
            appCommands.append(privacyCommand);
        });
    }

    function showContent() {
        if (view == "salah")
            return;

        // Remove salah and reshow them
        WinJS.Utilities.empty(salahHost);
        salahHost.style.display = "block";
        salahHost.style.opacity = 0;
        var animate = [];
        WinJS.UI.Pages.render("/pages/salah.html", salahHost, { animatableElements: animate }).then(function (salahControl) {
            if (view == "settings") {
                WinJS.UI.Animation.exitContent(settingsHost).then(function () {
                    settingsHost.style.display = "none";
                });
            }
           
            clearInterval(salahUpdateInterval);
            salahUpdateInterval = setInterval(function () {
                salahControl.updateDatesListAsync()
            }, INTERVAL);

            setTimeout(function () {
                salahControl.updateDatesListAsync();
            }, INITIAL_DELAY);

            WinJS.UI.Animation.enterContent(animate);
            view = "salah";
        });
    }

    function showSettings() {
        if (view == "settings")
            return;

        clearInterval(salahUpdateInterval);

        var settingsPromise;

        settingsHost.style.opacity = 0;
        if (!settingsLoaded) {
            settingsPromise = WinJS.UI.Pages.render("/pages/settings.html", settingsHost, { settingsFinishedCallback: showContent }).then(function (pageControl) {
                settingsLoaded = true;
                return pageControl.element;
            });
        } else {
            settingsPromise = WinJS.Promise.wrap(settingsHost);
        }

        settingsPromise.then(function () {
            WinJS.UI.Animation.exitContent(salahHost).then(function() {
                salahHost.style.display = "none";
            });
            settingsHost.style.display = "block";
            WinJS.UI.Animation.enterContent(settingsHost);

            view = "settings";
        });
    }
})();

/*var ApplicationViews = { salah: "salah", settings: "settings" };

(function() {
    "use strict";

    var appView;

    initUserInterface();

    function initUserInterface() {
        // If we haven't got location information to display salah we need to show settings
        appView = (ApplicationSettings.location === undefined) ? ApplicationViews.settings : ApplicationViews.salah;

        WinJS.Utilities.ready(function () {
            var contentHost = document.getElementById("contentHost");

            // When the document has loaded we display the corresponding page control
            if (appView == ApplicationViews.settings) {

            } else if (appView == ApplicationViews.salah) {

            }
        });
    }

    function displaySalahControl() {

    }

    function displaySettingsControl() {

    }
})();*/