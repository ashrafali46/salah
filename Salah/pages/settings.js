/// <reference path="//Microsoft.WinJS.1.0.RC/js/ui.js" />
(function () {
    "use strict";
    
    WinJS.UI.Pages.define("/pages/settings.html", {
        render: function (element, options, loadResult) {
            var that = this;

            element.appendChild(loadResult);

            var locationControlHost = element.querySelector("#locationControlHost");
            locationControlHost.style.height = (window.innerHeight - (180 + 120)) + "px";

            this.locationControl = new LocationControl(locationControlHost);
            return new WinJS.Promise(function (complete, error, progress) {
                that.locationControl.addEventListener("ready", function () {
                    complete();
                });
            });
        },

        ready: function(element, options) {
            this.locationControl.addEventListener("locationset", function (event) {
                console.log("Location set! Location name: " + event.detail.locationName);
            });
        }
    });
})();