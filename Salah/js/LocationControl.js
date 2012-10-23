/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />
// ui.js dependencies: WinJS.UI.ToggleSwitch

// events: ready (occurs when map image has loaded), locationset, properties: location, autoMethod
// methods: get/set for location, get/set for autoMethod

// seperate out LocationControl classes out into another stylesheet
// make it in the document that the only things that are specified are:
// width/height.
// element just needs to be a <div></div>, which will be filled with proper html

var mapBackgroundImageURL = "/images/worldmap/map-altered2.png";
var userAgent = "SalahApp/1.0 (Windows 8; email:bayvakoof@live.com)";
var XHR_TIMEOUT = 2500;

// For the map translation animation
var MAX_TRANSLATE_DURATION = 2;
var MIN_TRANSLATE_DURATION = 0.6;

function LocationControl(controlHost, options) {
    /// <summary>LocationControl class manages the location control.</summary>
    /// <param type="HTMLDivElement" name="element">The div which will contain the control after instantiation.</param>
    /// <param type="Object" name="options">Options used to customize the control.</param>

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

    if (!controlHost.winControl)
        controlHost.winControl = this;

    WinJS.Utilities.addClass(this.element, "locationControl");

    if (options) {
        if (options.title)
            this.title = options.title;

        if (options.location)
            this.location = options.location;

        if (options.locationName)
            this.locationName = options.locationName;
    }

    this._initialize();
}

LocationControl.prototype.addEventListener = function(eventName, eventCallback, useCapture) {
    this.element.addEventListener(eventName, eventCallback, useCapture);
}

LocationControl.prototype.removeEventListner = function (eventName, eventCallback, useCapture) {
    this.element.removeEventListener(eventName, eventCallback, useCapture);
}

LocationControl.prototype._initialize = function () {
    /// <summary>Performs initialization work for the control.</summary>
    this._loadHTML();
    this._attachEvents();

    // Start loading the map image
    this._mapImage.src = mapBackgroundImageURL;
}

LocationControl.prototype._loadHTML = function () {
    /// <summary>Inserts LocationControl html content into the container element</summary>
    if (this.title) {
        var title = document.createElement("h2");
        title.className = "title";
        title.innerText = this.title;
        this.element.appendChild(title);
    }

    var mapContainer = document.createElement("div");
	this._mapContainer = mapContainer;
    mapContainer.className = "mapContainer";

    // Add the mapImage (a hidden image element which lets us know when the map image
    // is loaded)
    this._mapImage = document.createElement("img");
    mapContainer.appendChild(this._mapImage);

    // Add the marker
    this._marker = document.createElement("div");
    this._marker.className = "marker";
	this._marker.style.opacity = 0;
    this._markerText = document.createElement("h3");
    this._markerText.className = "markerText";
    this._marker.appendChild(this._markerText);
    // add the marker triangle (styled with .marker div:first-child)
    this._marker.appendChild(document.createElement("div"));
    mapContainer.appendChild(this._marker);

    // Add the dimmer
    this._dimmer = document.createElement("div");
    this._dimmer.className = "dimmer";
    mapContainer.appendChild(this._dimmer);

	// Add the controls container
	this._controlsContainer = document.createElement("div");
	this._controlsContainer.className = "controlsContainer";
	mapContainer.appendChild(this._controlsContainer);

    // Add visibility button
	var visibilityButtonContainer = document.createElement("div");
	visibilityButtonContainer.className = "visibilityButtonContainer";
	this._visibilityButton = document.createElement("button");
	this._visibilityButton.style.opacity = 0;
	this._visibilityButton.disabled = true;
    this._visibilityButton.className = "visibilityButton";
    visibilityButtonContainer.appendChild(this._visibilityButton);
    this._controlsContainer.appendChild(visibilityButtonContainer);

    // Add the controls
    var controls = document.createElement("div");
    controls.className = "controls";
	this._controlsContainer.appendChild(controls);

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

    this.element.appendChild(mapContainer);
}

LocationControl.prototype._attachEvents = function () {
    /// <summary>Attaches relevant events to all the objects in the control.</summary>
    // Note that this is lost in the context of the event handlers
    var that = this;
    
    this._mapImage.addEventListener("load", function () {
        // When the map image is loaded, the element is finally ready for manipulation
        that._mapContainer.style.backgroundImage = "url('" + that._mapImage.src + "')";

        // The equator is the North South center but the contents have a visual center that's around 34 N
        that._centerMapOnLatLonAsync(37, 0, false).then(function () {
            var readyEvent = document.createEvent("CustomEvent");
            readyEvent.initCustomEvent("ready", true, false, {});
            that.element.dispatchEvent(readyEvent);
        });
    });

    this._visibilityButton.addEventListener("click", function showControls() {
        that.setControlsVisibility.call(that, true);
    });

    this._methodToggle.addEventListener("change", null);

    this._manualSubmit.addEventListener("click", this._manualEntryHandler.bind(that));
}

LocationControl.prototype.setControlsVisibility = function (visible) {
    /// <summary>Toggles the visibility of the ui elements which allow the user to manipulate the location 
    /// value of the control.</summary
    
    if (visible) {
        this._dimmer.style.opacity = 1;
        this._controlsContainer.style.top = "0px";
        this._visibilityButton.style.opacity = 0;
        this._visibilityButton.disabled = true;
        this._setMarker(false);
    } else {
        this._dimmer.style.opacity = 0;
        this._controlsContainer.style.top = (this._mapContainer.clientHeight - this._controlsContainer.offsetTop) + "px";
        this._visibilityButton.style.opacity = 1;
        this._visibilityButton.disabled = false;
        this._setMarker(true);
    }

    this._controlsVisible = visible;
}

LocationControl.prototype._manualEntryHandler = function (event) {
    /// <summary>Handles the manual location entry submission event</summary>

    var that = this;

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
        locationSuccessCallback({ 
            latitude: parseFloat(splitResult[0]), 
            longitude: parseFloat(splitResult[1]), 
            locationName: "Your location" 
        });
    } else {
        // Geocode the input
        var geocodeRequestURI = "http://nominatim.openstreetmap.org/search?q=" + locationEntry.replace("&", "and") + "&format=json&addressdetails=1";
        var xhrPromise = WinJS.xhr({ url: geocodeRequestURI, headers: { "User-Agent": userAgent } });

        WinJS.Promise.timeout(XHR_TIMEOUT, xhrPromise).then(
            function complete(xhrResult) {
                // Succesfully geocoded
                var geocode = JSON.parse(xhrResult.responseText);
                for (var i = 0; i < geocode.length; i++) {
                    // Iterate through the response, so that you find the first place
                    var result = geocode[i];
                    if (result.class == "place") {
                        var placeName = result.address.city + (address.state != "" ? ", " + address.state : "") + ", " + address.country;
                        locationSuccessCallback({
                            latitude: result.lat,
                            longitude: result.lon,
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

    locationPromise.done(
        function complete(result) {
            // Set location
            var geoposition = {
                civicAddress: "",
                coordinate: {
                    latitude: result.latitude,
                    longitude: result.longitude
                }
            }
            that.setLocation(geoposition, result.locationName);

            // Dispatch location set event
            that._dispatchLocationSet(geoposition, result.locationName);
            
            // Hide the controls
            that.setControlsVisibility(false);
            that._setMarker(true, result.locationName);
        },
        function (error) {
            console.log(error);
        }
    );
}

LocationControl.prototype._dispatchLocationSet = function (geoposition, locationName) {
    /// <summary>Dispatches the locationset event to the host.</summary>
    var locationSetEvent = document.createEvent("CustomEvent");
    locationSetEvent.initCustomEvent("locationset", true, false, { geoposition: geoposition, locationName: locationName });
    this.element.dispatchEvent(locationSetEvent);
}

LocationControl.prototype.setLocation = function (location, locationName) {
    /// <summary>Sets the location of the control</summary>
    /// <param name="location" type="Windows.Devices.Geolocation.Geoposition"></param>

    // Center the map on the location
    this._centerMapOnLatLonAsync(location.coordinate.latitude, location.coordinate.longitude, true);

    // Save the location values
    this.location = location;
    this.locationName = locationName;
}

LocationControl.prototype._centerMapOnLatLonAsync = function (latitude, longitude, animate) {
    /// <summary>Translates the map background image so that latitude, longitude is centered</summary>

    // Calculate the background offset to center map on latitude, longitude
    var radius = this._mapImage.naturalWidth / (2 * Math.PI); // Earth's circumference (pixels) = map image's width
    var degToRad = Math.PI / 180;
    // The neutralVerticalOffset is a result of the mapContainer being smaller than the mapImage height
    var neutralVerticalOffset = -0.5 * (this._mapImage.naturalHeight - this._mapContainer.clientHeight);
    var x = radius * longitude * degToRad;
    var y = radius * Math.log(Math.tan((Math.PI / 4) + 0.5 * (latitude * degToRad))); // Math.log = natural log

    var completePromise;

    if (animate) {
        // Scale the transition duration so long translations happen at roughly the same speed as short translations

        // Use current offset values to get the translation distance
        var cx = parseFloat(this._mapContainer.currentStyle.backgroundPositionX),
            cy = parseFloat(this._mapContainer.currentStyle.backgroundPositionY);

        var translationDistance = (cx + x) * (cx + x) + (cy - y) + (cy - y); // Squared distance

        // Squared distance, actually (mapWidth / 2)^2 + (mapHeight / 4)^2. mapWidth / 2 is used because
        // the max horizontal translation will always be less than mapWidth / 2, and since the continents occupy roughly
        // 1/2 of the map height, (mapWidth / 2) / 2 is used. 
        var maxTranslationDistance = 0.25 * (this._mapImage.naturalWidth * this._mapImage.naturalWidth) +
            0.0625 * (this._mapImage.naturalHeight * this._mapImage.naturalHeight);

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
        this._marker.style.opacity = 1;
    } else {
        this._marker.style.opacity = 0;
    }
}