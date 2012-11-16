//// THIS CODE AND INFORMATION IS PROVIDED "AS IS" WITHOUT WARRANTY OF 
//// ANY KIND, EITHER EXPRESSED OR IMPLIED, INCLUDING BUT NOT LIMITED TO 
//// THE IMPLIED WARRANTIES OF MERCHANTABILITY AND/OR FITNESS FOR A 
//// PARTICULAR PURPOSE. 
//// 
//// Copyright (c) Microsoft Corporation. All rights reserved 

(function () {
    "use strict";

    var page = WinJS.UI.Pages.define("/pages/settingsflyout.html", {
        render: function (element, options, loadResult) {
            /// <summary>Sets up the ui of the settings page</summary>
            element.appendChild(loadResult);
            element.style.visibility = "hidden";

            var locationOptions = {
                location: ApplicationSettings.location.coord,
                locationName: ApplicationSettings.location.name,
                autoMethod: ApplicationSettings.location.automatic
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

            console.log(WinJS.Utilities.hasClass(element, "win-ui-light"));

            return locationControlReadyPromise;
        },

        ready: function (element, options) {
        }
    });
})();