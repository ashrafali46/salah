/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />

// LocationControl by Mahir Iqbal

var LocationControl = (function() {
    var mapBackgroundImageURL = "/images/worldmap/map.png";
    var MAP_DIMENSION = 1000; // map dimension in pixels (at 100% scale)
    var userAgent = "SalahApp/1.0.0.2 (Windows 8; email:bayvakoof@live.com)";
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
        /// <field name='_visibilityButton' type='HTMLButtonElement'>A button which is used to toggle the visibility of the _controls div.</field>
        /// <field name='_methodToggle' type='WinJS.UI.ToggleSwitch'>A toggle switch specifying whether location is automatically obtained or set manually.</field>
        /// <field name='_locationInput' type='HTMLInputElement'>An input element which provides manual location entry.</field>
        /// <field name='_manualSubmit' type='HTMLInputElement'>A button which is used to submit the manual location user input.</field>

        /// <field name='_controlsVisible' type='boolean'>Whether the controls are visible or not.</field>
        this._controlsVisible = true;

        this.element = controlHost;
        this.element.style.visibility = "hidden";

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
        this._loadHTML();

		if (options)
			this._initControls(options);

        this._attachEvents(options);

        // Start loading the map image
        this._mapImage.src = mapBackgroundImageURL;
    }

    LocationControl.prototype._loadHTML = function () {
        /// <summary>Inserts LocationControl html content into the container element</summary>
        var mapContainer = document.createElement("div");
        this._mapContainer = mapContainer;
        mapContainer.className = "mapContainer";

        // Add the dimmer
        this._dimmer = document.createElement("div");
        this._dimmer.className = "dimmer";
        this._mapContainer.appendChild(this._dimmer);

        // Add the mapImage (a hidden image element which lets us know when the map image
        // is loaded)
        this._mapImage = document.createElement("img");
        mapContainer.appendChild(this._mapImage);

        // Add the marker
        this._marker = document.createElement("div");
        this._marker.style.visibility = "hidden";
        this._marker.className = "marker";
        // add the marker triangle (styled with .marker div.triangle)
		var triangle = document.createElement("div");
		triangle.className = "triangle";
		this._marker.appendChild(triangle);
        this._markerText = document.createElement("h3");
        this._markerText.className = "markerText";
        this._marker.appendChild(this._markerText);
        //this._markerText.style.maxWidth = ((this.element.offsetWidth - 30) * .4) + 'px';
        mapContainer.appendChild(this._marker);

        // Add visibility button
        var visibilityButtonContainer = document.createElement("div");
        visibilityButtonContainer.className = "visibilityButtonContainer";
        this._visibilityButton = document.createElement("button");
        this._visibilityButton.className = "visibilityButton";
        visibilityButtonContainer.appendChild(this._visibilityButton);
        this._marker.appendChild(visibilityButtonContainer);

        // Add the controls container
        this._controlsContainer = document.createElement("div");
        this._controlsContainer.className = "controlsContainer";
        this.element.appendChild(this._controlsContainer);

        // Add the controls
        var controls = document.createElement("div");
        controls.className = "controls";
        this._controlsContainer.appendChild(controls);

        //<p>Please enable your location to be obtained automatically or set it yourself.</p>
        var descText = document.createElement("p");
        descText.innerText = "Enable your location to be obtained automatically or set it yourself."
        controls.appendChild(descText);

        //<div data-win-control="WinJS.UI.ToggleSwitch"></div>
        var toggleHost = document.createElement("div");
        this._methodToggle = new WinJS.UI.ToggleSwitch(toggleHost, { title: 'Obtain my location automatically', labelOff: 'No', labelOn: 'Yes' });
        controls.appendChild(toggleHost);

        var manualGroup = document.createElement("div");
        manualGroup.className = "manualGroup";
        //<input placeholder="(e.g. Lahore, Pakistan)" type="text" />
        this._locationInput = document.createElement("input");
        this._locationInput.type = "text";
        this._locationInput.placeholder = "(e.g. Lahore, Pakistan)";
        manualGroup.appendChild(this._locationInput);

        //<input type="submit" value="Set Location" />
        this._manualSubmit = document.createElement("input");
        this._manualSubmit.type = "submit";
        this._manualSubmit.value = "Set Location";
        manualGroup.appendChild(this._manualSubmit);
        controls.appendChild(manualGroup);

        var manualSubmit = this._manualSubmit;
        this.element.appendChild(mapContainer);
    }

    LocationControl.prototype._initControls = function (options) {
        if (options.autoMethod) {
            this._setMethodToggle(options.autoMethod);
        }

        if (options.lightControls) {
            WinJS.Utilities.addClass(this._controlsContainer, "win-ui-light");
        }

	    if (options.location) {
	        this.location = options.location;

	        if (options.locationName)
	            this.locationName = options.locationName;
	        else
	            this.locationName = this._latLonToString(this.location.latitude, this.location.longitude);

	        this.setControlsVisibility(false);
            this._setMarker(true, this.locationName)
	    } else {
	        this.setControlsVisibility(true);
	        this._setMarker(false);
	    }
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
                    that._marker.style.visibility = "visible";
                    that.element.style.visibility = "visible";
                    var readyEvent = document.createEvent("CustomEvent");
                    readyEvent.initCustomEvent("ready", true, false, {});
                    that.element.dispatchEvent(readyEvent);
                }, 50);
            });
        });

        this._marker.addEventListener("click", function () {
            that._setMarker(false);
            that.setControlsVisibility(true);
        });

        this._methodToggle.addEventListener("change", function () {
            that._setMethodToggle(that._methodToggle.checked);
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

        if (this._methodToggle.checked) {
            this._locationInput.disabled = true;
            this._manualSubmit.disabled = true;

            this._setLocationAutoAsync();
        } else {

            this._locationInput.disabled = false;
            this._manualSubmit.disabled = false;
        }
    }

    LocationControl.prototype.setControlsVisibility = function (visible) {
        /// <summary>Toggles the visibility of the ui elements which allow the user to manipulate the location 
        /// value of the control.</summary>   
        if (visible) {
            WinJS.UI.Animation.fadeIn(this._dimmer);
            WinJS.UI.Animation.fadeIn(this._controlsContainer);
        } else {
            WinJS.UI.Animation.fadeOut(this._dimmer);
            WinJS.UI.Animation.fadeOut(this._controlsContainer);
        }

        this._controlsVisible = visible;
    }

    LocationControl.prototype._manualEntryHandler = function (event) {
        /// <summary>Handles the manual location entry submission event</summary>

        var that = this;

        // Disable controls while we're working
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

        var autoLocationAttemptCompleteCallback;
        var autoLocationPromise = new WinJS.Promise(function (complete, error, progress) {
            autoLocationAttemptCompleteCallback = complete;
        });

        // Make a Geolocation request
        var geolocator = new Windows.Devices.Geolocation.Geolocator();
        geolocator.getGeopositionAsync().then(
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
        var neutralHorizontalOffset = -0.5 * (MAP_DIMENSION - this._mapContainer.clientWidth);
        var x = radius * longitude * degToRad;
        var y;

        // Check if we're too close to the north / south pole
        var latInput = (Math.PI / 4) + 0.5 * (latitude * degToRad);
        if (Math.abs(latInput - (Math.PI / 2)) < 0.01)
            y = MAP_DIMENSION / 2; // Math.log = natural log
        else
            y = radius * Math.log(Math.tan(latInput));

        var completePromise;

        // -1 * x because moving left requires a position background offset
        var newX = -1 * x + neutralHorizontalOffset, newY = y + neutralVerticalOffset;

        if (animate) {
            // Scale the transition duration so long translations happen at roughly the same speed as short translations

            // Use current offset values to get the translation distance
            var cx = parseFloat(this._mapContainer.currentStyle.backgroundPositionX),
                cy = parseFloat(this._mapContainer.currentStyle.backgroundPositionY);

            

            var translationDistance = (cx - newX) * (cx - newX) + (cy - newY) * (cy - newY); // Squared distance

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

        this._mapContainer.style.backgroundPositionX = newX + "px"; 
        this._mapContainer.style.backgroundPositionY = newY + "px";

        return completePromise;
    }

    LocationControl.prototype._setMarker = function (visible, markerText) {
        /// <summary>Sets the visibility and text contents of the marker</summary>
        /// <param name="visible" type="Boolean">Whether or not the marker is visible</param>
        /// <param name="markerText" type="String" optional="true">The text content of the marker</param>

        if (visible) {
            if (markerText)
                this._markerText.innerText = markerText;
            // Using display so the marker is immediately hidden, but fades into visible
            this._marker.style.display = "-ms-flexbox";
            this._marker.style.opacity = 1;
            this._marker.style.zIndex = 2;
        } else {
            this._marker.style.display = "none";
            this._marker.style.opacity = 0;
            this._marker.style.zIndex = 0;
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