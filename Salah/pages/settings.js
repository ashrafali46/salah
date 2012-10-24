/// <reference path="//Microsoft.WinJS.1.0.RC/js/base.js" />
/// <reference path="//Microsoft.WinJS.1.0.RC/js/ui.js" />

/// <reference path="/js/LocationControl.js" />
/// <reference path="/js/ApplicationSettings.js" />
(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/settings.html", {
        render: function (element, options, loadResult) {
            /// <summary>Sets up the ui of the settings page</summary>
            var finishedRenderingPromise;

            var that = this;

            element.appendChild(loadResult);

            this._settingsFinishedCallback = function () {
                that._unload();

                if (options && options.settingsFinishedCallback)
                    options.settingsFinishedCallback();
            };
            this._applicationFirstRun = (ApplicationSettings.location === undefined);

            var locationOptions; // Options for the location control
            if (this._applicationFirstRun) {
                // If application is being run for the first time, disable the back button
                this._backButton = element.querySelector("#backButton");
                this._backButton.disabled = true;

                locationOptions = {};
            } else {
                locationOptions = {
                    location: ApplicationSettings.location,
                    locationName: ApplicationSettings.locationName,
                    autoMethod: ApplicationSettings.autoMethod
                };
            }

            // Hide the continue element
            element.querySelector("#continue").style.visibility = "hidden";

            // Set container heights and a resize listener
            this._setContainerHeights();
            // Make sure you remove this event listener on Page unload
            this._resizeListener = this._setContainerHeights.bind(this);
            window.addEventListener("resize", this._resizeListener);

            // Create the location control
            this.locationControl = new LocationControl(element.querySelector("#locationControlHost"), locationOptions);
            // The LocationControl takes some time to load the map image
            var locationControlReadyPromise = new WinJS.Promise(function (complete) {
                that.locationControl.addEventListener("ready", function () {
                    complete();
                });
            });

            // Create the backgroundListView
            this.bgListView = this._createBackgroundListView();

            finishedRenderingPromise = locationControlReadyPromise;
            return finishedRenderingPromise;
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
            if (ApplicationSettings.background) {
                var backgroundSrc = ApplicationSettings.background;
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

                    /*var thumb = document.createElement("img");
                    thumb.src = "/images/backgrounds/thumbs/" + item.data.src;
                    thumb.alt = item.data.title;
                    itemContainer.appendChild(thumb);*/
					itemContainer.style.backgroundImage = "url('/images/backgrounds/thumbs/" + item.data.src + "')";

                    var infoDiv = document.createElement("div");

                    var title = document.createElement("h2");
                    title.innerText = item.data.title;
                    infoDiv.appendChild(title);

					if (item.data.location) {
						var location = document.createElement("h3");
						location.innerText = item.data.location;
						infoDiv.appendChild(location);
					}

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
        },

        // Sets container heights
        _setContainerHeights: function() {
            var settingsContainer = this.element.querySelector("#settingsContainer"),
                locationControlHost = this.element.querySelector("#locationControlHost"),
                backgroundSetting = this.element.querySelector("#backgroundSetting");

            // Set the LocalSettingsValues height to span the window (so that the LocalSettingsValues scrollbar is at the bottom)
            settingsContainer.style.height = (window.innerHeight - settingsContainer.offsetTop) + "px";

            var innerElementHeight = Math.min(1000, (window.innerHeight - (180 + 120)));
            locationControlHost.style.height = innerElementHeight + "px";
            backgroundSetting.style.height = (innerElementHeight + 60) + "px";
        },

        ready: function (element, options) {
            var that = this;

            // Use these to keep track of when the user has chosen a location and application background
            var backgroundChosenCallback, locationChosenCallback;
            var backgroundChosenPromise = new WinJS.Promise(function (c) { backgroundChosenCallback = c; }),
                locationEnteredPromise = new WinJS.Promise(function (c) { locationChosenCallback = c; });

            // On first run show the continue element after user has set a location and chosen a background
            WinJS.Promise.join([backgroundChosenPromise, locationEnteredPromise]).then(function () {
                if (that._applicationFirstRun) {
                    var continueEl = that.element.querySelector("#continue");
                    continueEl.style.visibility = "visible";
                    WinJS.UI.Animation.enterContent(continueEl).then(function () {
                        continueEl.style.visibility = "";
                        continueEl.style.opacity = "";
                    });

                    var continueButton = that.element.querySelector("#continueButton");
                    continueButton.addEventListener("click", that._settingsFinishedCallback);
                }
            });

            // Attach settingsFinishedCallback to the back button
            this.element.querySelector("#backButton").addEventListener("click", this._settingsFinishedCallback);

            // Handle background item selection
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

                    if (backgroundChosenCallback) {
                        backgroundChosenCallback();
                        backgroundChosenCallback = null;
                    }

                    //ApplicationSettings.background = item.data.src;
                });
            });

            this.locationControl.addEventListener("locationset", function (event) {
                //ApplicationSettings.location = event.detail.location;
                //ApplicationSettings.locationName = event.detail.locationName;

                if (locationChosenCallback) {
                    locationChosenCallback();
                    locationChosenCallback = null;
                }
            });
        },

        _unload: function () {
            window.removeEventListener("resize", this._resizeListener);
        }        
    });

})();