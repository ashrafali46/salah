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

            var locationOptions = {
                location: ApplicationSettings.location.coord,
                locationName: ApplicationSettings.location.name,
                autoMethod: ApplicationSettings.location.automatic,
                lightControls: true
            };

            var that = this;
            // Create the location control
            this.locationControl = new LocationControl(element.querySelector("#locationControlHost"), locationOptions);
            // The LocationControl takes some time to load the map image
            var locationControlReadyPromise = new WinJS.Promise(function (complete) {
                that.locationControl.addEventListener("ready", function () {
                    element.style.visibility = "visible";
                    complete();
                });
            });

            return locationControlReadyPromise;
        },

        ready: function (element, options) {
            var that = this;

            this.locationControl.addEventListener("locationset", function (event) {
                ApplicationSettings.location.coord = event.detail.location;
                ApplicationSettings.location.name = event.detail.locationName;
                that._dispatchSettingsChangedEvent();
            });
        },

        _dispatchSettingsChangedEvent: function() {
            var settingsEvent = document.createEvent("CustomEvent");
            settingsEvent.initCustomEvent("settingschange", true, false, {});
            this.element.querySelector(".win-settingsflyout").dispatchEvent(settingsEvent);
        }
    });
})();