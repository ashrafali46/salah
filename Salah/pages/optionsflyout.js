/// <reference path="/js/PrayerCalculator.js" />

(function () {
    "use strict";

    var page = WinJS.UI.Pages.define("/pages/optionsflyout.html", {
        render: function (element, options, loadResult) {
            /// <summary>Sets up the ui of the settings page</summary>
            element.appendChild(loadResult);
            element.style.visibility = "hidden";
            
            // WinJS.UI.SettingsFlyout adds some styles to the flyout that we don't want
            this.addEventListener("beforeshow", function () {
                var content = element.querySelector(".win-content");
                if (WinJS.Utilities.hasClass(content, "win-ui-light")) {
                    WinJS.Utilities.removeClass(content, "win-ui-light");
                }
            });

            // Create the location control
            this.locationControl = new LocationControl(
                element.querySelector("#locationControlHost"),
                {
                    location: ApplicationSettings.location.coord,
                    locationName: ApplicationSettings.location.name,
                    autoMethod: ApplicationSettings.location.automatic,
                    lightControls: true
                });

            var that = this;
            // The LocationControl takes some time to load the map image
            var locationControlReadyPromise = new WinJS.Promise(function (complete) {
                that.locationControl.addEventListener("ready", function () {
                    element.style.visibility = "visible";
                    complete();
                });
            });

            // Background Selector
            this.backgroundSelector = new BackgroundSelector(element.querySelector("#backgroundSelectorHost"));
            var choicesToAdd = [];
            // add the currently selected background choice first, then add others
            backgroundChoices.forEach(function (choice) {
                if (choice.id == ApplicationSettings.backgroundId) {
                    that.backgroundSelector.addChoice(choice);
                    that.backgroundSelector.selectChoice(choice);
                } else {
                    choicesToAdd.push(choice);
                }
            });
            choicesToAdd.forEach(this.backgroundSelector.addChoice, this.backgroundSelector);

            this.salahMethodSelect = element.querySelector("#salahMethodSelect");
            for (var methodKey in PrayerCalculator.Methods) {
                var method = PrayerCalculator.Methods[methodKey];
                var optionEl = document.createElement("option");
                optionEl.innerText = method.name;
                optionEl.value = methodKey;
                this.salahMethodSelect.appendChild(optionEl);
                if (methodKey == ApplicationSettings.salah.method) {
                    optionEl.setAttribute("selected", "selected");
                };
            }

            this.salahDayDisplaySelect = element.querySelector("#salahDayDisplaySelect");
            this.salahDayDisplaySelect.querySelector("option[value='" + ApplicationSettings.salah.dayDisplayNumber.toString() + "']").setAttribute("selected", "selected");

            this.salahExpiredDisplayToggle = element.querySelector("#salahExpiredDisplayToggle");
            // winControls initialized after render method

            try {
                // Check if notifications are enabled
                this.updateScheduler = new UpdateScheduler();
                if (this.updateScheduler.toastsEnabled()) {
                    element.querySelector("#notificationStatusText").innerText = "enabled";
                } else {
                    element.querySelector("#notificationStatusText").innerText = "disabled";
                    element.querySelector("#notificationEnableInstruction").style.display = "inline";
                }
            } catch (error) {
                this.updateScheduler = null;
                element.querySelector("#notificationStatusText").parentNode.innerText = "An error occured in the notification system. (" + error.message + ")";
            }

            this.prayerCalculator = new PrayerCalculator(ApplicationSettings.location.coord, PrayerCalculator.Methods[ApplicationSettings.salah.method])

            return locationControlReadyPromise;
        },

        ready: function (element, options) {
            var that = this;

            // User changes their location:
            this.locationControl.addEventListener("locationset", function (event) {
                ApplicationSettings.location.coord = event.detail.location;
                ApplicationSettings.location.name = event.detail.locationName;

                that.prayerCalculator.setLocation(ApplicationSettings.location.coord);
                that._createUpdates();
                that._salahSettingsChanged();
            });

            // User changes the prayer calculation method:
            this.salahMethodSelect.addEventListener("change", function (event) {
                ApplicationSettings.salah.method = event.target.value;
                that.prayerCalculator.setMethod(PrayerCalculator.Methods[ApplicationSettings.salah.method]);

                if (ApplicationSettings.location.coord)
                    that._createUpdates();

                that._salahSettingsChanged();
            });

            // User changes the app background:
            /*this.backgroundSelector.addEventListener("change", function (event) {
                // Nothing needs to be done!
                console.log(event.detail.choice.title + " background chosen");
            });*/

            // User changes the number of days salah are displayed for:
            this.salahDayDisplaySelect.addEventListener("change", function (event) {
                ApplicationSettings.salah.dayDisplayNumber = parseFloat(event.target.value);
                that._salahSettingsChanged();
            });

            // User sets the win-toggle that controls whether expired salah are displayed:
            this.salahExpiredDisplayToggle.winControl.checked = ApplicationSettings.salah.displayExpired;
            this.salahExpiredDisplayToggle.addEventListener("change", function (event) {
                ApplicationSettings.salah.displayExpired = event.target.winControl.checked;
                that._salahSettingsChanged();
            });
        },

        _salahSettingsChanged: function () {
            // dispatch a settings changed event on myself
            var settingsEvent = document.createEvent("CustomEvent");
            settingsEvent.initCustomEvent("settingschange", true, false, {});
            this.element.querySelector(".win-settingsflyout").dispatchEvent(settingsEvent);
        },

        _createUpdates: function () {
            var that = this;

            if (!this.updateScheduler)
                return;

            this.updateScheduler.clear();
            msSetImmediate(function () { that.updateScheduler.schedule(that.prayerCalculator, that.updateScheduler.MIN_DAYS_SCHEDULED) });
        }
    });
})();