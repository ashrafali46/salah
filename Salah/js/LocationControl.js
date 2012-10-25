/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />

// LocationControl by Mahir Iqbal

var LocationControl = (function() {
    var mapBackgroundImageURL = "/images/worldmap/map-altered2.png";
    var MAP_DIMENSION = 1000; // map dimension in pixels (at 100% scale)
    var userAgent = "SalahApp/1.0 (Windows 8; email:bayvakoof@live.com)";
    var XHR_TIMEOUT = 2500;

    // For the map translation animation
    var MAX_TRANSLATE_DURATION = 2;
    var MIN_TRANSLATE_DURATION = 0.6;

    function LocationControl(controlHost, options) {
        /// <summary>LocationControl class manages the location control.</summary>
        /// <param type="HTMLDivElement" name="element">The div which will contain the control after instantiation.</param>
        /// <param type="Object" name="options">Options used to customize the control as an 
        /// object with possible keys: location (Geoposition), locationName (String), autoMethod (Boolean).</param>

        /// <field name='controlHost' type='HTMLElement'>The element hosting the control.</field>
        /// <field name='title' type='String'>The title of the LocationControl.</field>
        /// <field name='location' type='Windows.Devices.Geolocation.Geoposition'>The location of the control.</field>
        /// <field name='locationName' type='String'>The display name of the location (which is displayed by the marker).</field>

        /// <field name='_mapImage' type='HTMLImageElement'>An image of the controls map background.</field>
        /// <field name='_mapContainer' type='HTMLDivElement'>The div which contains the map and all its ui elements.</field>
        /// <field name='_marker' type='HTMLDivElement'>A marker which annotates the location the map is centered on.</field>
        /// <field name='_markerText' type='HTMLHeadingElement'>The text annotation for the marker.</field>
        /// <field name='_dimmer' type='HTMLDivElement'>A dimmer div overlaying the mapImage used.</field>
        /// <field name='_controlsContainer' type='HTMLDivElement'>Contains UI elements to set the location of the control.</field>
        /// <field name='_progress' type='HTMLProgressElement'>Indicates the control is working.</field>
        /// <field name='_visibilityButton' type='HTMLButtonElement'>A button which is used to toggle the visibility of the _controls div.</field>
        /// <field name='_methodToggle' type='WinJS.UI.ToggleSwitch'>A toggle switch specifying whether location is automatically obtained or set manually.</field>
        /// <field name='_locationInput' type='HTMLInputElement'>An input element which provides manual location entry.</field>
        /// <field name='_manualSubmit' type='HTMLInputElement'>A button which is used to submit the manual location user input.</field>

        /// <field name='_controlsVisible' type='boolean'>Whether the controls are visible or not.</field>
        /// <field name='_request' type='WinJS.Promise'>If the method is automatic location and there is a async GetPosition() request being made, this
        /// represents the promise.</field>
        this._controlsVisible = true;

        this.element = controlHost;

        if (!controlHost.winControl)
            controlHost.winControl = this;

        WinJS.Utilities.addClass(this.element, "locationControl");

        this._initialize(options);
    }

    LocationControl.prototype.addEventListener = function(eventName, eventCallback, useCapture) {
        this.element.addEventListener(eventName, eventCallback, useCapture);
    }

    LocationControl.prototype.removeEventListner = function (eventName, eventCallback, useCapture) {
        this.element.removeEventListener(eventName, eventCallback, useCapture);
    }

    LocationControl.prototype._initialize = function (options) {
        /// <summary>Performs initialization work for the control.</summary>
        this._loadHTML(options);
        this._attachEvents(options);

        if (options && options.location) {
            this.location = options.location;

            if (options.locationName)
                this.locationName = options.locationName;
            else
                this.locationName = this._latLonToString(this.location.latitude, this.location.longitude);
        }

        // Start loading the map image
        this._mapImage.src = mapBackgroundImageURL;
    }

    LocationControl.prototype._loadHTML = function (options) {
        /// <summary>Inserts LocationControl html content into the container element</summary>

        var mapContainer = document.createElement("div");
        this._mapContainer = mapContainer;
        mapContainer.className = "mapContainer";


        // Add the dimmer
        this._dimmer = document.createElement("div");
        options && options.location && (this._dimmer.style.opacity = 0);
        this._dimmer.className = "dimmer";
        this._mapContainer.appendChild(this._dimmer);

        // Add the mapImage (a hidden image element which lets us know when the map image
        // is loaded)
        this._mapImage = document.createElement("img");
        mapContainer.appendChild(this._mapImage);

        // Add the marker
        this._marker = document.createElement("div");
        this._marker.className = "marker";
        this._marker.style.opacity = 1;
        // add the marker triangle (styled with .marker div:first-child)
        this._marker.appendChild(document.createElement("div"));
        this._markerText = document.createElement("h3");
        this._markerText.className = "markerText";
        if (options && options.locationName) {
            this._markerText.innerText = options.locationName;
            this._marker.style.opacity = 1;
        }
        this._marker.appendChild(this._markerText);
        mapContainer.appendChild(this._marker);

        // Add the controls container
        this._controlsContainer = document.createElement("div");

        this._controlsContainer.className = "controlsContainer";
        mapContainer.appendChild(this._controlsContainer);

        // Add visibility button
        var visibilityButtonContainer = document.createElement("div");
        visibilityButtonContainer.className = "visibilityButtonContainer";
        this._visibilityButton = document.createElement("button");
        if (!(options && options.location)) {
            this._visibilityButton.style.opacity = 0;
            this._visibilityButton.disabled = true;
        }
        this._visibilityButton.className = "visibilityButton";
        visibilityButtonContainer.appendChild(this._visibilityButton);
        this._controlsContainer.appendChild(visibilityButtonContainer);

        // Add the controls
        var controls = document.createElement("div");
        controls.className = "controls";
        this._controlsContainer.appendChild(controls);

        // Add the progress indicator
        this._progress = document.createElement("progress");
        this._progress.style.visibility = "hidden";
        this._progress.className = "win-ring progress";
        controls.appendChild(this._progress);

        //<h2>Where are you?</h2>
        var controlsTitle = document.createElement("h2");
        controlsTitle.innerText = "Where are you?";
        controls.appendChild(controlsTitle);
        //<p></p>
        var descText = document.createElement("p");
        descText.innerText = "Please enable your location to be obtained automatically or set it yourself."
        controls.appendChild(descText);

        //<div data-win-control="WinJS.UI.ToggleSwitch"></div>
        var toggleHost = document.createElement("div");
        this._methodToggle = new WinJS.UI.ToggleSwitch(toggleHost, { title: 'Obtain my location automatically', labelOff: 'No', labelOn: 'Yes' });
        controls.appendChild(toggleHost);
        if (options && options.autoMethod) {
            this._setMethodToggle(options.autoMethod);

            // uncheck if geolocation permission is not enabled
            if ((new Windows.Devices.Geolocation.Geolocator()).locationStatus == Windows.Devices.Geolocation.PositionStatus.disabled) {
                this._setMethodToggle(false);
            }
        }

        var manualParagraph = document.createElement("p");
        //<input placeholder="(e.g. Lahore, Pakistan)" type="text" />
        this._locationInput = document.createElement("input");
        this._locationInput.type = "text";
        this._locationInput.placeholder = "(e.g. Lahore, Pakistan)";
        manualParagraph.appendChild(this._locationInput);

        //<input type="submit" value="Set Location" />
        this._manualSubmit = document.createElement("input");
        this._manualSubmit.type = "submit";
        this._manualSubmit.value = "Set Location";
        manualParagraph.appendChild(this._manualSubmit);
        controls.appendChild(manualParagraph);

        /* Using this code causes the application to crash
        var wrapForm = document.createElement("form");
        //wrapForm.appendChild(manualParagraph);
        wrapForm.id = "wrapperForm"; // Prevents multiple forms
        this._manualSubmit.form = "wrapperForm";
        wrapForm.appendChild(this._locationInput);
        wrapForm.appendChild(this._manualSubmit);
        controls.appendChild(wrapForm);*/

        var manualSubmit = this._manualSubmit;
        // If i include wrap the manualParagraph with a form, the renderer crashes
        // when the submit button is invoked. With no form, the enter key triggers some random button press?
        manualParagraph.addEventListener("keypress", function (event) {
            if (event.keyCode == 13) { //Enter keycode
                var active = document.activeElement;
                active.blur();

                window.inputRecentlyEntered = true;
                setTimeout(function () {
                    window.inputRecentlyEntered = false;
                }, 100);
                manualSubmit.click();
                
            }
        }, true);

        if (options && options.autoMethod) {
            this._locationInput.disabled = true;
            this._manualSubmit.disabled = true;
        }

        this.element.appendChild(mapContainer);

        // Lastly offset the controls container appropriately
        if (options && options.location)
            this._controlsContainer.style.top = (this._mapContainer.clientHeight - this._controlsContainer.offsetTop) + "px";
        
        var that = this;
        msSetImmediate(function () {
            WinJS.Utilities.addClass(that._controlsContainer, "animatable")
        });
    }

    LocationControl.prototype._attachEvents = function (options) {
        /// <summary>Attaches relevant events to all the objects in the control.</summary>
        // Note that this is lost in the context of the event handlers
        var that = this;
    
        this._mapImage.addEventListener("load", function () {
            // When the map image is loaded, the element is finally ready for manipulation
            that._mapContainer.style.backgroundImage = "url('" + that._mapImage.src + "')";

            var centerMapPromise;
            if (options && options.location) {
                centerMapPromise = that._centerMapOnLatLonAsync(options.location.latitude, options.location.longitude, false);
            } else {
                // The equator is the North South center but the contents have a visual center that's around 34 N
                centerMapPromise = that._centerMapOnLatLonAsync(37, 0, false);
            }

            centerMapPromise.then(function () {
                if (options && options.autoMethod) {
                    // Start getting location automatically
                    that._setLocationAutoAsync();
                }
            
                // Give a small timeout so the background image won't pop in
                setTimeout(function () {
                    var readyEvent = document.createEvent("CustomEvent");
                    readyEvent.initCustomEvent("ready", true, false, {});
                    that.element.dispatchEvent(readyEvent);
                }, 50);
            });
        });

        this._visibilityButton.addEventListener("click", function showControls() {
            that.setControlsVisibility.call(that, true);
        });

        this._methodToggle.addEventListener("change", function () {
            that._setMethodToggle(that._methodToggle.checked);

            if (that._methodToggle.checked) {
                that._locationInput.disabled = true;
                that._manualSubmit.disabled = true;

                that._setLocationAutoAsync();
            } else {
                if (that._request)
                    that._request.cancel();

                that._locationInput.disabled = false;
                that._manualSubmit.disabled = false;
            }
        });

        this._locationInput.addEventListener("click", function () {
            document.activeElement = null;
            that._locationInput.focus();
        });

        this._manualSubmit.addEventListener("click", function () {
            that._manualEntryHandler();
        });
    }

    LocationControl.prototype._setMethodToggle = function (checked) {
        var settings = Windows.Storage.ApplicationData.current.localSettings.values;
        settings["autoMethod"] = checked;

        this._methodToggle.checked = checked;
    }

    LocationControl.prototype.setControlsVisibility = function (visible) {
        /// <summary>Toggles the visibility of the ui elements which allow the user to manipulate the location 
        /// value of the control.</summary>   
        if (visible) {
            this._dimmer.style.opacity = 1;
            this._controlsContainer.style.top = "0px";
            this._visibilityButton.style.opacity = 0;
            this._visibilityButton.disabled = true;
        } else {
            this._dimmer.style.opacity = 0;
            if (parseFloat(this._controlsContainer.currentStyle.top) == 0)
                this._controlsContainer.style.top = (this._mapContainer.clientHeight - this._controlsContainer.offsetTop) + "px";
            this._visibilityButton.style.opacity = 1;
            this._visibilityButton.disabled = false;
        }

        this._controlsVisible = visible;
    }

    LocationControl.prototype._manualEntryHandler = function (event) {
        /// <summary>Handles the manual location entry submission event</summary>

        var that = this;

        // Show progress & disable controls while we're working
        this._progress.style.visibility = "visible";
        this._methodToggle.disabled = true;
        this._locationInput.disabled = true;
        this._manualSubmit.disabled = true;

        var locationEntry = this._locationInput.value;

        var locationSuccessCallback;
        var locationFailedCallback;

        var locationPromise = new WinJS.Promise(function (complete, error, progress) {
            locationSuccessCallback = complete;
            locationFailedCallback = error;
        });
    
        // Check if the location is of the form <number>, <number>
        var splitResult = locationEntry.split(",");
        if (splitResult.length == 2 && !(isNaN(splitResult[0]) || isNaN(splitResult[1]))) {
            // Interpret entry as latitude/longitude
            var lat = parseFloat(splitResult[0]), lon = parseFloat(splitResult[1]);
            locationSuccessCallback({ 
                latitude: lat, 
                longitude: lon, 
                locationName: "Your location: " + this._latLonToString(lat, lon)
            });
        } else {
            // Geocode the input, the mapquestapi assumes america unless a country is supplied (we can parse the input for a country, but nominatim is good for now)
            //var geocodeRequestURI = "http://www.mapquestapi.com/geocoding/v1/address?key=Fmjtd%7Cluuanu0r29%2Cax%3Do5-96b5gu&location=" + encodeURIComponent(locationEntry) + "&thumbMaps=false";
            var geocodeRequestURI = "http://open.mapquestapi.com/nominatim/v1/search?q=" + encodeURIComponent(locationEntry) + "&format=json&addressdetails=1";
            var xhrPromise = WinJS.xhr({ url: geocodeRequestURI, headers: { "User-Agent": userAgent } });

            WinJS.Promise.timeout(XHR_TIMEOUT, xhrPromise).then(
                function complete(xhrResult) {
                    // Succesfully geocoded
                    var geocode;
                    try {
                        geocode = JSON.parse(xhrResult.responseText);
                    } catch (error) {
                        locationFailedCallback(error);
                        return;
                    }

                    for (var i = 0; i < geocode.length; i++) {
                        // Iterate through the response, so that you find the first place
                        var result = geocode[i];
                        if (result.class == "place" || result.class == "boundary") {
                            var address = result.address;
                            var placeName = address.city + (address.state ? ", " + address.state : "") + (address.country ? ", " + address.country : "");
                            if (placeName.indexOf("undefined") != -1)
                                placeName = locationEntry;
                            locationSuccessCallback({
                                latitude: parseFloat(result.lat),
                                longitude: parseFloat(result.lon),
                                locationName: placeName
                            });
                            return; // Exit function early
                        }
                    }

                    // If no place in the geocode results or length is zero
                    locationFailedCallback("Geocoding " + locationEntry + " failed to return any relevant results.");
                }, function timeout(error) {
                    // Request timed out
                    locationFailedCallback("The geocoding request timed out.");
                });
        }

        locationPromise.then(
            function complete(result) {
                // Set location

                var locationObject = {
                    latitude: result.latitude,
                    longitude: result.longitude
                }

                // Save the location values
                that.location = locationObject;
                that.locationName = result.locationName;
            
                // Hide the marker, and center the map on the location
                that._setMarker(false);
                that._centerMapOnLatLonAsync(result.latitude, result.longitude, true).then(function () {
                    that._setMarker(true, result.locationName);
                });

                // Dispatch location set event
                that._dispatchLocationSet(locationObject, result.locationName);
            
                // Hide the controls
                that.setControlsVisibility(false);
            },
            function (error) {
                console.log(error);
            }
        ).then(function () {
            that._progress.style.visibility = "hidden";
            that._methodToggle.disabled = false;
            that._locationInput.disabled = false;
            that._manualSubmit.disabled = false;
        });
    }

    LocationControl.prototype._setLocationAutoAsync = function () {
        /// <summary>Sets the location by making a request via the device's geolocation hardware</summary>
        /// <returns type="WinJS.Promise">A promise whose fulfilled value is a Boolean indicating 
        /// whether the location was succesfully set automatically</returns>

        var that = this;

        this._progress.style.visibility = "visible";

        var autoLocationAttemptCompleteCallback;
        var autoLocationPromise = new WinJS.Promise(function (complete, error, progress) {
            autoLocationAttemptCompleteCallback = complete;
        });

        // Make a Geolocation request
        var geolocator = new Windows.Devices.Geolocation.Geolocator();
        this._request = geolocator.getGeopositionAsync().then(
            function (location) {
                // Successful geolocation
                var locationObject = { latitude: location.coordinate.latitude, longitude: location.coordinate.longitude };
                that.location = locationObject;

                var lat = location.coordinate.latitude, lon = location.coordinate.longitude;
                that._setMarker(false);
                var centerPromise = that._centerMapOnLatLonAsync(lat, lon, true);

                that.setControlsVisibility(false);

                var locationNameObtainedCallback;
                var locNamePromise = new WinJS.Promise(function (complete, error, progress) {
                    locationNameObtainedCallback = complete;
                });

                // Try to geocode the location to get the location name
                // Use mapquest reverse geo!
                /*var geocodeRequestURI = "http://open.mapquestapi.com/nominatim/v1/reverse?format=json&lat=" + location.coordinate.latitude +
                    "&lon=" + location.coordinate.longitude + "&zoom=10&addressdetails=1";*/
                var geocodeRequestURI = "http://www.mapquestapi.com/geocoding/v1/reverse?key=Fmjtd%7Cluuanu0r29%2Cax%3Do5-96b5gu" +
                    "&lat=" + location.coordinate.latitude + "&lng=" + location.coordinate.longitude;
                var geocodeXhr = WinJS.xhr({ url: geocodeRequestURI, headers: { "User-Agent": userAgent } });
                WinJS.Promise.timeout(XHR_TIMEOUT, geocodeXhr).then(
                    function (xhr) {
                        try {
                            var placeName = null;
                            var response = JSON.parse(xhr.responseText);                           
                            for (var i = 0; i < response.results.length; i++) {
                                var result = response.results[i];
                                var location = result.locations[0];
                                placeName = (location.adminArea5) + (location.adminArea3 ? ", " + location.adminArea3 : "") + (location.adminArea1 ? ", " + location.adminArea1 : "");
                                break;
                            }

                            locationNameObtainedCallback(placeName);
                        } catch (error) {
                            locationNameObtainedCallback(null);
                        }
                    },
                    function (error) {
                        locationNameObtainedCallback(null);
                    });

                WinJS.Promise.join({ mapCentered: centerPromise, locationName: locNamePromise }).then(
                    function (result) {
                        // Regardless of a succesfull geocode or not, set this.locationName will contain an accurate description
                        if (!result.locationName)
                            that.locationName = that._latLonToString(that.location.latitude, that.location.longitude);
                        else
                            that.locationName = result.locationName;

                        that._dispatchLocationSet(that.location, that.locationName);

                        that._setMarker(true, that.locationName);

                        autoLocationAttemptCompleteCallback(true);
                    });
            },
            function (error) {
                // Geolocation failed.
                if (error.message == "Access is denied.\r\n") {
                    console.log("Cannot get location, location permission is disabled.");
                } else {
                    console.log(error);
                }

                that._setMethodToggle(false);
                that._locationInput.disabled = false;
                that._manualSubmit.disabled = false;

                autoLocationAttemptCompleteCallback(false);
            }).then(function() {
                that._progress.style.visibility = "hidden";

                that._request = null;
            });

        // This enables us to subscribe to the user disabling the location permission
        geolocator.addEventListener("statuschanged", function (event) {
            var status = event.status;

            var PositionStatus = Windows.Devices.Geolocation.PositionStatus;
            if (status == PositionStatus.disabled) {
                that._setMethodToggle(false);
            }
        });
    }

    LocationControl.prototype._dispatchLocationSet = function (location, locationName) {
        /// <summary>Dispatches the locationset event to the host.</summary>
        var locationSetEvent = document.createEvent("CustomEvent");
        locationSetEvent.initCustomEvent("locationset", true, false, { location: location, locationName: locationName });
        this.element.dispatchEvent(locationSetEvent);
    }

    LocationControl.prototype._centerMapOnLatLonAsync = function (latitude, longitude, animate) {
        /// <summary>Translates the map background image so that latitude, longitude is centered</summary>

        //TODO: change calculations so translations wrap around (i.e. going from japan to hawaii goes the long way currently)

        //var scaling = Windows.Graphics.Display.DisplayProperties.resolutionScale / 100;

        // Calculate the background offset to center map on latitude, longitude
        var radius = MAP_DIMENSION / (2 * Math.PI); // Earth's circumference (pixels) = map image's width
        var degToRad = Math.PI / 180;
        // The neutralVerticalOffset is a result of the mapContainer being smaller than the mapImage height
        var neutralVerticalOffset = -0.5 * (MAP_DIMENSION - this._mapContainer.clientHeight);
        var x = radius * longitude * degToRad;
        var y;

        // Check if we're too close to the north / south pole
        var latInput = (Math.PI / 4) + 0.5 * (latitude * degToRad);
        if (Math.abs(latInput - (Math.PI / 2)) < 0.01)
            y = MAP_DIMENSION / 2; // Math.log = natural log
        else
            y = radius * Math.log(Math.tan(latInput));

        var completePromise;

        if (animate) {
            // Scale the transition duration so long translations happen at roughly the same speed as short translations

            // Use current offset values to get the translation distance
            var cx = parseFloat(this._mapContainer.currentStyle.backgroundPositionX),
                cy = parseFloat(this._mapContainer.currentStyle.backgroundPositionY);

            var translationDistance = (cx + x) * (cx + x) + (cy - y) * (cy - y); // Squared distance

            // Squared distance, actually (mapWidth / 2)^2 + (mapHeight / 4)^2. mapWidth / 2 is used because
            // the max horizontal translation will always be less than mapWidth / 2, and since the continents occupy roughly
            // 1/2 of the map height, (mapWidth / 2) / 2 is used. 
            var maxTranslationDistance = 0.25 * (MAP_DIMENSION * MAP_DIMENSION) +
                0.0625 * (MAP_DIMENSION * MAP_DIMENSION);

            var duration = Math.max((translationDistance / maxTranslationDistance) * MAX_TRANSLATE_DURATION, MIN_TRANSLATE_DURATION);
            this._mapContainer.style.transition = "background-position " + duration.toFixed(2) + "s ease";
            completePromise = WinJS.Promise.timeout(duration * 1000);
        } else {
            this._mapContainer.style.transition = "";
            completePromise = WinJS.Promise.wrap(null);
        }

        this._mapContainer.style.backgroundPositionX = (-1 * x) + "px"; // -1 * x because moving left requires a position background offset
        this._mapContainer.style.backgroundPositionY = (y + neutralVerticalOffset) + "px";

        return completePromise;
    }

    LocationControl.prototype._setMarker = function (visible, markerText) {
        /// <summary>Sets the visibility and text contents of the marker</summary>
        /// <param name="visible" type="Boolean">Whether or not the marker is visible</param>
        /// <param name="markerText" type="String" optional="true">The text content of the marker</param>

        if (visible) {
            if (markerText)
                this._markerText.innerText = markerText;
            // Using visibility makes it so the marker is immediately hidden, but fades into visible
            this._marker.style.visibility = "visible"; 
            this._marker.style.opacity = 1;
        } else {
            this._marker.style.visibility = "hidden";
            this._marker.style.opacity = 0;
        }
    }

    LocationControl.prototype._latLonToString = function(latitude, longitude) {
        /// <summary>Converts a location to a latitude longitude string</summary>

        var latDegrees = Math.abs(latitude), latMinutes = 60 * (latDegrees - Math.floor(latDegrees)),
            latSeconds = 60 * (latMinutes - Math.floor(latMinutes));
        var latString =  latDegrees.toFixed(0) + "°" + latMinutes.toFixed(0) + "'" + latSeconds.toFixed(0) + "\"" + (latitude < 0 ? "S" : "N");

        var lonDegrees = Math.abs(longitude), lonMinutes = 60 * (lonDegrees - Math.floor(lonDegrees)),
            lonSeconds = 60 * (lonMinutes - Math.floor(lonMinutes));
        var lonString = lonDegrees.toFixed(0) + "°" + lonMinutes.toFixed(0) + "'" + lonSeconds.toFixed(0) + "\"" + (longitude < 0 ? "W" : "E");;
    
        return latString + " " + lonString;
    }

    return LocationControl;
})();