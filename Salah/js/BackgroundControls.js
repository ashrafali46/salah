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

/** Smooth sets background images */
var BackgroundControl = (function () {
    function BackgroundControl(element) {
        this.element = element;
        WinJS.Utilities.addClass(element, "backgroundControl");
        this._transitioning = false;

        this._transitionSequence = [];
        this._currentBackground = null;
    }

    BackgroundControl.prototype.set = function (id, imageURL) {
        var that = this;

        // check if this control contains that image already
        var imageElement = this.element.querySelector("#" + id);
        if (!imageElement) {
            imageElement = document.createElement("img");
            imageElement.id = id;

            imageElement.addEventListener("load", function () {
                var shrinkAmount = 0.98 * Math.max(imageElement.naturalHeight / that.element.clientHeight, imageElement.naturalWidth / that.element.clientWidth);
                imageElement.width = imageElement.naturalWidth / shrinkAmount;
                imageElement.height = imageElement.naturalHeight / shrinkAmount;

                imageElement.style.left = (that.element.clientWidth - imageElement.width) * 0.5 + "px";
                imageElement.style.top = (that.element.clientHeight - imageElement.height) * 0.5 + "px";
            });

            // prevent dragging the image
            imageElement.addEventListener("dragstart", function (event) { event.preventDefault(); return false; }, true);

            imageElement.src = imageURL;
            this.element.appendChild(imageElement);
        }

        return this._queueTransition(imageElement);
    }

    // Returns a promise that is completed when the background has transitioned to the imageElement
    BackgroundControl.prototype._queueTransition = function (imageElement) {
        imageElement.style.opacity = 0;

        var callback;
        var transitionCompletePromise = new WinJS.Promise(function (complete) {
            callback = complete;
        });

        this._transitionSequence.push({ image: imageElement, promiseCallback: callback });
        this._checkTransitionSequence();

        return transitionCompletePromise;
    }

    // Returns a promise that completes when the final background has been set
    BackgroundControl.prototype._checkTransitionSequence = function () {
        if (this._transitionSequence.length == 0 || this._transitioning)
            return;

        var that = this;
        // do next transition
        this._transitioning = true;

        var nextBackgroundTransition = this._transitionSequence.shift();
        var imageToTransition = nextBackgroundTransition.image;

        var imageLoadedPromise;
        if (imageToTransition.complete) {
            imageLoadedPromise = WinJS.Promise.wrap(null);
        } else {
            imageLoadedPromise = new WinJS.Promise(function (complete) {
                imageToTransition.addEventListener("load", function () {
                    setTimeout(complete, 40) // try to prevent pop in
                });
            });
        }

        imageLoadedPromise.then(function () {
            var lastCurrent = (that._currentBackground) ? that.element.querySelector("#" + that._currentBackground) : null;
            if (lastCurrent) {
                WinJS.Utilities.removeClass(lastCurrent, "current");
                WinJS.Utilities.addClass(lastCurrent, "lastCurrent");
            }
            that._currentBackground = imageToTransition.id;
            WinJS.Utilities.addClass(imageToTransition, "current");
            WinJS.UI.Animation.fadeIn(imageToTransition).then(function () {
                that._transitioning = false;
                nextBackgroundTransition.promiseCallback();

                if (that._transitionSequence.length != 0)
                    that._checkTransitionSequence();
            });
        });
    }

    return BackgroundControl;
})();

var BackgroundChoice = (function () {
    function BackgroundChoice(id, imageURL, thumb) {
        this.id = id;
        this.imageURL = imageURL;
        this.thumb = thumb;
    }

    return BackgroundChoice;
})();

var BackgroundSelector = (function () {
    var maxChoices = 5;

    function BackgroundSelector(element) {
        this.element = element;
        WinJS.Utilities.addClass(element, "backgroundSelector");

        this._choicesArray = [];

        // setup html
        this._loadHtml()
    }

    BackgroundSelector.prototype._loadHtml = function () {
        this._selected = document.createElement("div");
        this._selected.className = "selected";

        this._choices = document.createElement("div");
        this._choices.className = "choicesList";

        this.element.appendChild(this._selected);
        this.element.appendChild(this._choices);

        this._selected.style.height = (this._selected.offsetWidth * .5625) + "px";
    }

    BackgroundSelector.prototype.addChoice = function (choice) {
        if (this._choicesArray.length == maxChoices)
            this.removeChoice(this._choicesArray[0]);

        this._choicesArray.push(choice);

        var otherChoices = this._choices.querySelectorAll(".choice");

        var choiceEl = document.createElement("div");
        choiceEl.choice = choice;
        choiceEl.className = "choice";
        choiceEl.style.height = choiceEl.offsetWidth + "px";
        choiceEl.style.backgroundImage = "url('" + choice.thumb + "')";
        choiceEl.style.backgroundSize = choiceEl.offsetWidth + "px " + choiceEl.offsetWidth + "px";
        var highlightDiv = document.createElement("div");
        highlightDiv.className = "highlight";
        choiceEl.appendChild(highlightDiv);
        var that = this;
        choiceEl.addEventListener("click", function () { that.selectChoice(choice); });

        var addToList = WinJS.UI.Animation.createAddToListAnimation(choiceEl, otherChoices);
        this._choices.appendChild(choiceEl);
        addToList.execute();
    }

    BackgroundSelector.prototype.removeChoice = function (choice) {
        choiceEl.setAttribute("deleting", true);
        //WinJS.UI.Animation.createDeleteFromListAnimation(choiceEl, that._choicesArray
        //WinJS.UI.Animation.deleteFromList(
    }

    BackgroundSelector.prototype.selectChoice = function (choice) {

    }

    return BackgroundSelector;
})();