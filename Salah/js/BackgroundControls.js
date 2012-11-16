/// <reference path="//Microsoft.WinJS.1.0/js/ui.js" />

var Background = (function () {
    function Background(id, title, src, location, author, authorURI) {
        this.id = id;
        this.title = title;
        this.src = src;
        this.location = location;
        this.author = author;
        this.authorURI = authorURI;
    }

    return Background;
})();

/** Smooth switches background images, provide it a background div element, it will smooth transition the background image */
var BackgroundSwitcher = (function () {
    function BackgroundSwitcher(element) {
        this.element = element;
        this.background;
    }

    BackgroundSwitcher.prototype.switch = function (background) {
        // Returns a promise that is done when the background has finished switching
        if (this.background == background)
            return WinJS.Promise.wrap(null);

        // check if the background already exists
        var backgroundElement = this.element.querySelector("#" + background.id)
        if (backgroundElement) {

        } else {
            backgroundElement = document.createElement("div");
            backgroundElement.id = background.id;

            var imageEl = document.createElement("img");

            ///.. . attach load event and complete etc etc....

            backgroundElement.appendChild(imageEl);
        }
    }
})();

var BackgroundControl = (function () {
    "use strict";

    function BackgroundControl(element, backgroundsList, backgroundSwitcherElement) {
        this._element = element;
        this._backgroundsList = backgroundsList;
    };

    BackgroundControl.prototype._loadHTML = function () {
        var selectedBackgroundEl = document.createElement("div");
        this._element.appendChild(selectedBackgroundEl);

        /*
        <div class="selectedBackground">

        </div>
        <div class="backgroundChoices">
        <ul>
        <li></li>
        </ul>
        </div>*/
    }
    
    return BackgroundControl;
})();