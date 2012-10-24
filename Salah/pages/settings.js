/// <reference path="//Microsoft.WinJS.1.0.RC/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0.RC/js/ui.js" />
(function () {
    "use strict";

    var settings = Windows.Storage.ApplicationData.current.localSettings.values;

    WinJS.UI.Pages.define("/pages/settings.html", {
        render: function (element, options, loadResult) {
            var that = this;

            element.appendChild(loadResult);

            this._backButtonVisible = (options && options.backButton) || false;
            this._firstRun = (options && options.firstRun) || false;

            if (this._backButtonVisible) {
                element.querySelector("backButton").style.opacity = 1;
            }
            
            // Set container heights
            fixHeights();
            // Make sure you remove this event listener on Page unload
            //window.addEventListener("resize", fixHeights)

            // Create the location control
            var locationOptions = {};
            if (settings["location"])
                locationOptions.location = JSON.parse(settings["location"]);
            if (settings["locationName"])
                locationOptions.locationName = settings["locationName"];
            if (settings["autoMethod"])
                locationOptions.autoMethod = settings["autoMethod"];

            this.locationControl = new LocationControl(element.querySelector("#locationControlHost"), locationOptions);

            // Create the backgroundListView
            this.bgListView = this._createBackgroundListView();

            // The LocationControl takes some time to load the map image
            return new WinJS.Promise(function (complete, error, progress) {
                that.locationControl.addEventListener("ready", function () {
                    complete();
                });
            });

            // Sets container heights
            function fixHeights() {
                var settingsContainer = element.querySelector("#settingsContainer"),
                    locationControlHost = element.querySelector("#locationControlHost"),
                    backgroundSetting = element.querySelector("#backgroundSetting");

                // Set the settings height to span the window (so that the settings scrollbar is at the bottom)
                settingsContainer.style.height = (window.innerHeight - settingsContainer.offsetTop) + "px";

                var innerElementHeight = Math.min(1000, (window.innerHeight - (180 + 120)));
                locationControlHost.style.height = innerElementHeight + "px";
                backgroundSetting.style.height = innerElementHeight + "px";
            }
        },

        ready: function (element, options) {
            var that = this;


            var bgChooseCallback, locationChooseCallback;
            var backgroundChosen = new WinJS.Promise(function (c) {
                bgChooseCallback = c;
            });

            var locationEntered = new WinJS.Promise(function (c) {
                locationChooseCallback = c;
            });

            WinJS.Promise.join([backgroundChosen, locationEntered]).then(function () {
                if (that._firstRun) {
                    setTimeout(function () {
                        WinJS.UI.Animation.enterContent(that.element.querySelector("#continue"));
                    }, 500);
                }
            });

            this.bgListView.addEventListener("iteminvoked", function (event) {
                //var itemIndex = event.detail.itemIndex;
                event.detail.itemPromise.then(function complete(item) {
                    that.bgListView.selection.set(item);

                    var imageURI = "/images/backgrounds/" + item.data.src;
                    document.body.style.backgroundImage = "url('" + imageURI + "')";

                    if (item.data.src == "pattern.png") {
                        document.body.style.backgroundSize = "";
                    } else {
                        document.body.style.backgroundSize = "cover";
                    }

                    if (bgChooseCallback) {
                        bgChooseCallback();
                        bgChooseCallback = null;
                    }

                    
                    settings["backgroundSrc"] = item.data.src;
                });
            });

            this.locationControl.addEventListener("locationset", function (event) {
                console.log("Location set! Location name: " + event.detail.locationName);

                // JSON.stringify fails on Windows.Devices.Geolocation.Geoposition objects (because they are functions)
                var geoposition = {
                    civicAddress: "",
                    coordinate: {
                        latitude: event.detail.geoposition.coordinate.latitude,
                        longitude: event.detail.geoposition.coordinate.longitude
                    }
                }

                settings["location"] = JSON.stringify(geoposition);
                settings["locationName"] = event.detail.locationName;

                if (locationChooseCallback) {
                    locationChooseCallback();
                    locationChooseCallback = null;
                }
            });
        },

        _createBackgroundListView: function () {
            var bgListViewHost = this.element.querySelector("#bgListViewHost");

            var listView = new WinJS.UI.ListView(bgListViewHost, 
                {
                    itemDataSource: backgroundListDataSource, // from background-data.js
                    itemTemplate:   itemTemplateFunction,
                    layout:         { type: WinJS.UI.GridLayout },
                    selectionMode:  "single",
                    tapBehavior: "directSelect"
                });

            // Select the current background choice
            if (settings["backgroundSrc"]) {
                var backgroundSrc = settings["backgroundSrc"];
                var selectIndex = -1;
                var list = backgroundListDataSource.list;
                for (var i = 0; i < list.length; i++) {
                    var item = list.getAt(i);
                    if (item.src == backgroundSrc) {
                        selectIndex = i;
                        break;
                    }
                }

                listView.selection.set(selectIndex);
            } else {
                listView.selection.set(0);
            }

            return listView;

            function itemTemplateFunction(itemPromise) {
                return itemPromise.then(function (item) {
                    var itemContainer = document.createElement("div");
                    itemContainer.className = "backgroundListItem";

                    var thumb = document.createElement("img");
                    thumb.src = "/images/backgrounds/thumbs/" + item.data.src;
                    thumb.alt = item.data.title;
                    itemContainer.appendChild(thumb);

                    var infoDiv = document.createElement("div");

                    var title = document.createElement("h2");
                    title.innerText = item.data.title;
                    infoDiv.appendChild(title);

                    var location = document.createElement("h3");
                    location.innerText = (item.data.location ? item.data.location : "");
                    infoDiv.appendChild(location);

                    var author = document.createElement("p");
                    author.innerText = "By "
                    if (item.data.authURL) {
                        var link = document.createElement("a");
                        link.innerText = item.data.auth;
                        link.href = item.data.authURL;
                        author.appendChild(link)
                    } else {
                        author.innerText += item.data.auth;
                    }

                    infoDiv.appendChild(author);

                    itemContainer.appendChild(infoDiv);

                    return itemContainer;
                });
            };
        }
    });

})();