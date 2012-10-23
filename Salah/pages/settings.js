/// <reference path="//Microsoft.WinJS.1.0.RC/js/ui.js" />
(function () {
    "use strict";
    
    WinJS.UI.Pages.define("/pages/settings.html", {
        render: function (element, options, loadResult) {
            element.appendChild(loadResult);

            var locationHost = element.querySelector("#locationHost");
            var locationControl = new LocationControl(locationHost);
            return new WinJS.Promise(function (complete, error, progress) {
                locationControl.addEventListener("ready", function () {
                    complete();
                });
            });
        }
    });

    // follow the guidelines here to create a wrapper object around the geolocation
    // that knows when the locator is enabled/disabled

    function saveLocation(civicAddress, latitude, longitude) {
        /// <summary>Saves location values to the app's localStorage</summary>
    }
})();