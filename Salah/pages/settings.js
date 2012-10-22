/// <reference path="//Microsoft.WinJS.1.0.RC/js/ui.js" />
(function () {
    "use strict";
    
    WinJS.UI.Pages.define("/pages/settings.html", {
        render: function (element, options, loadResult) {
            element.appendChild(loadResult);

            return new WinJS.Promise(function (complete, error, progress) {
                var mapImage = element.querySelector("#mapImage");
                mapImage.addEventListener("load", function () {
                    var locationContainer = element.querySelector("#locationSetting");
                    locationContainer.style.backgroundImage = "url('" + mapImage.src + "')";
                    locationContainer.mapWidth = mapImage.naturalWidth;
                    locationContainer.mapHeight = mapImage.naturalHeight;
                    locationContainer.mapCenterOffsetY = -0.5 * (mapImage.naturalHeight - locationContainer.clientHeight);
                    locationContainer.style.backgroundPositionY = (.1 * locationContainer.mapHeight + locationContainer.mapCenterOffsetY) + "px";
                    setTimeout(function () {
                        locationContainer.style.transition = "background-position-x 1s ease, background-position-y 1s ease"
                        complete();
                    }, 100);
                });
                mapImage.src = "/images/worldmap/map-altered2.png";
            });
        },

        ready: function(element, options) {
            element.querySelector("#locationSubmitButton").addEventListener("click", function () {
                var civicLocation = element.querySelector("#civicLocation").value;
                console.log("civicLocation submitted: " + civicLocation);
            });

            /// <var name="toggleElementControl" type="WinJS.UI.ToggleSwitch" />
            this.toggleControl = element.querySelector("#toggleLocationControl").winControl;
            this.toggleControl.addEventListener("change", this.handleAutoLocToggle.bind(this));

            this.upButton = element.querySelector("#upButton");
            this.upButton.addEventListener("click", this.showLocationControls.bind(this));
        },

        handleAutoLocToggle: function (event) {
            var that = this;

            var enabled = this.toggleControl.checked;
            console.log("Automatic location toggled: " + enabled);

            if (!enabled) {
                this.request && this.request.cancel();

                that.element.querySelector("#civicLocation").disabled = false;
                that.element.querySelector("#locationSubmitButton").disabled = false;
                return;
            } else {
                this.element.querySelector("#civicLocation").disabled = true;
                this.element.querySelector("#locationSubmitButton").disabled = true;
            }

            if (!this.geolocator) {
                if (initGeolocator.call(this)) {
                    performRequest();
                }
            } else {
                performRequest();
            }

            function performRequest() {
                that.request = that.geolocator.getGeopositionAsync().then(
                    function complete(location) {
                        that.setLocationAuto.call(that, location);
                    },
                    function error(e) {
                        if (e.message == "Access is denied.\r\n") {
                            that.geolocator = null;
                            uncheck();
                            locationCharmPrompt();
                            console.log("Location permission not enabled");
                        }

                        console.log("Location error: " + e);
                    }
                ).then(function () {
                    that.request = null;
                });
            }

            function initGeolocator() {
                /// <summary>Initializes the Geolocator object if the application can obtain location</summary>
                /// <returns type="bool">True if the Geolocator was successfully initialized, false otherwise</returns>
                var Geolocation = Windows.Devices.Geolocation;
                this.geolocator = new Geolocation.Geolocator();

                // make sure user has the permission enabled
                if (that.geolocator.locationStatus == Geolocation.PositionStatus.disabled) {
                    // user has disabled location permission

                    this.geolocator = null;
                    uncheck();
                    return false;
                } else if (this.geolocator.locationStatus == Geolocation.PositionStatus.notAvailable) {
                    // user's hardware doesn't support location

                    this.geolocator = null;
                    uncheck();
                    return false;
                } else {
                    // geolocator can successfully be created
                    this.geolocator.addEventListener("statuschanged", function (event) {
                        var status = event.status;

                        var PositionStatus = Geolocation.PositionStatus;
                        var statusString;
                        for (var s in PositionStatus) {
                            if (status == PositionStatus[s]) {
                                statusString = s;
                            }                    
                        }

                        console.log("Geolocator status changed: " + statusString);

                        if (status == PositionStatus.disabled || status == PositionStatus.notAvailable) { // user has disabled the app's location permission
                            that.geolocator = null;
                            uncheck();
                            // prompt to enable location permission
                            that.request && that.request.cancel();
                        }
                    });

                    return true;
                }                
            }

            function uncheck() {
                if (that.toggleControl.checked) {
                    setTimeout(function () {
                        that.toggleControl.checked = false;

                        that.element.querySelector("#civicLocation").disabled = false;
                        that.element.querySelector("#locationSubmitButton").disabled = false;
                    }, 200);
                }
            }

            function locationCharmPrompt() {

            }
        },

        setLocationAuto: function (location) {
            var that = this;

            console.log("Got location: (lat: " + location.coordinate.latitude + ", long: " + location.coordinate.longitude + ")");
            this.hideLocationControls();
            var animationPromise = this.centerMapAsync(location.coordinate.latitude, location.coordinate.longitude);

            var geocodeRequestURI = "http://nominatim.openstreetmap.org/reverse?format=json&lat=" + location.coordinate.latitude +
                "&lon=" + location.coordinate.longitude + "&zoom=10";

            // make a reverseGeoCode request with the latitude and longitude, when that's complete show a tooltip in the center
            var TIMEOUT = 2500;
            var geoCodePromise = WinJS.Promise.timeout(TIMEOUT, WinJS.xhr({
                url: geocodeRequestURI,
                headers: { "User-Agent": "SalahApp/1.0 (Windows 8; email:bayvakoof@live.com)" }
            }).then(
            function result(xhr) {
                var responseJSON = JSON.parse(xhr.responseText);
                return responseJSON;
            },
            function error(e) {
                return null;
            }));

            WinJS.Promise.join({ anim: animationPromise, geocode: geoCodePromise }).then(function (result) {
                if (result.geocode) {
                    var address = result.geocode.address;
                    var formattedAddress = "";
                    formattedAddress += address.city;
                    formattedAddress += (address.state != "") && (", " + address.state);
                    formattedAddress += ", " + address.country;

                    // display a marker
                    var marker = that.element.querySelector("#marker");
                    marker.querySelector("h3").innerText = formattedAddress;
                    marker.style.opacity = "1";
                } else {
                    var marker = that.element.querySelector("#marker");
                    var latDegrees = Math.abs(location.coordinate.latitude);
                    var latMinutes = 60 * (latDegrees - Math.floor(latDegrees));
                    var latSeconds = 60 * (latMinutes - Math.floor(latMinutes));
                    var latString =  latDegrees.toFixed(0) + "°" + latMinutes.toFixed(0) + "'" + latSeconds.toFixed(0) + "\"" + (location.coordinate.latitude < 0 ? "S" : "N");

                    var lonDegrees = Math.abs(location.coordinate.longitude);
                    var lonMinutes = 60 * (lonDegrees - Math.floor(lonDegrees));
                    var lonSeconds = 60 * (lonMinutes - Math.floor(lonMinutes));
                    var lonString = lonDegrees.toFixed(0) + "°" + lonMinutes.toFixed(0) + "'" + lonSeconds.toFixed(0) + "\"" + (location.coordinate.longitude < 0 ? "W" : "E");;
                    marker.querySelector("h3").innerText = "Your location: " + latString + " " + lonString;
                    marker.style.opacity = "1";
                }
            });

            // set the location setting
        },

        centerMapAsync: function (latitude, longitude) {
            var locationContainer = this.element.querySelector("#locationSetting");

            // circumference is equilavent to the the background image's width (which is also locationContainer.clientWidth)
            var radius = locationContainer.mapWidth / (2 * Math.PI);
            var degToRad = Math.PI / 180;

            var x = radius * longitude * degToRad;
            // Math.log corresponds to the natural logarithm
            var y = radius * Math.log(Math.tan((Math.PI / 4) + 0.5 * (latitude * degToRad)))

            var backPosX = -1 * x;
            var backPosY = y;

            // set the css animation duration property based on the pixel distance away from the location
            var currOffsetX = parseFloat(locationContainer.currentStyle.backgroundPositionX);
            var currOffsetY = parseFloat(locationContainer.currentStyle.backgroundPositionY);

            var dx = backPosX - currOffsetX;
            var dy = backPosY - currOffsetY;

            var offsetDistanceSqrd = (dx * dx + dy * dy);

            // an animation the farthest location from the center (the corners of the projection) should
            // take no more than 0.5s, closer should scale to 2 seconds
            var maxDistanceSqrd = 0.25 * (locationContainer.mapWidth * locationContainer.mapWidth + locationContainer.mapHeight + locationContainer.mapHeight);
            var ratio = (offsetDistanceSqrd / maxDistanceSqrd);
            var duration = 2 * ratio + 0.5 * (1 - ratio);

            locationContainer.style.transitionDuration = duration + "s, " + duration + "s";

            locationContainer.style.backgroundPositionX = backPosX + "px";
            locationContainer.style.backgroundPositionY = (backPosY + locationContainer.mapCenterOffsetY) + "px";
            return WinJS.Promise.timeout(duration * 1000);
        },        

        hideLocationControls: function() {
            var dimmer = this.element.querySelector("#overlay");
            var controls = this.element.querySelector("#controls");
            dimmer.style.opacity = 0;
            controls.style.top = ((this.element.clientHeight - controls.offsetHeight) * 0.5 + controls.offsetHeight) + "px";

            var upButton = this.element.querySelector("#upButton");
            upButton.style.opacity = 1;
        },

        showLocationControls: function() {
            var dimmer = this.element.querySelector("#overlay");
            var controls = this.element.querySelector("#controls");
            dimmer.style.opacity = "0.8";
            controls.style.top = "0";

            var upButton = this.element.querySelector("#upButton");
            upButton.style.opacity = 0;

            var marker = this.element.querySelector("#marker");
            marker.style.opacity = "0";
        }
    });

    // follow the guidelines here to create a wrapper object around the geolocation
    // that knows when the locator is enabled/disabled

    function saveLocation(civicAddress, latitude, longitude) {
        /// <summary>Saves location values to the app's localStorage</summary>
    }
})();