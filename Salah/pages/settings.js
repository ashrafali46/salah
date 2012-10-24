/// <reference path="//Microsoft.WinJS.1.0.RC/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0.RC/js/ui.js" />

var x = new WinJS.UI.ListView();
(function () {
    "use strict";
    
    WinJS.UI.Pages.define("/pages/settings.html", {
        render: function (element, options, loadResult) {
            var that = this;

            element.appendChild(loadResult);

            // Set the settings height to span the window
            var settingsContainer = element.querySelector("#settingsContainer");
            var locationControlHost = element.querySelector("#locationControlHost");
            var backgroundHost = element.querySelector("#backgroundSetting");

            fixHeights();
            // Make sure you remove this event listener on Page unload
            window.addEventListener("resize", function () {
                fixHeights();
            });

            // Add the location control
            this.locationControl = new LocationControl(locationControlHost);

            var listViewHost = document.createElement("div");
            /// <var type="WinJS.UI.ListView" name="listView">A ListView</var>
            var listView = new WinJS.UI.ListView(listViewHost);
            listView.itemDataSource = backgroundListDataSource;
            listView.layout = { type: WinJS.UI.GridLayout };
            var template = new WinJS.Binding.Template(element.querySelector("#backgroundItemTemplate"));
            listView.itemTemplate = template.element;
            backgroundHost.appendChild(listViewHost);
            
            return new WinJS.Promise(function (complete, error, progress) {
                that.locationControl.addEventListener("ready", function () {
                    complete();
                });
            });

            function fixHeights() {
                settingsContainer.style.height = (window.innerHeight - settingsContainer.offsetTop) + "px";
                var innerElementHeight = Math.min(1000, (window.innerHeight - (180 + 120)));
                locationControlHost.style.height = innerElementHeight + "px";
                backgroundHost.style.height = innerElementHeight + "px";
            }
        },

        ready: function (element, options) {
            this.locationControl.addEventListener("locationset", function (event) {
                console.log("Location set! Location name: " + event.detail.locationName);
            });
        }
    });
})();