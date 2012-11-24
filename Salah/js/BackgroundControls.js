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
        this.element.winControl = this;
        WinJS.Utilities.addClass(element, "backgroundControl");
        this._transitioning = false;

        this._transitionSequence = [];
        this._currentBackground = null;

        this._ELEMENT_ZINDEX = (element.currentStyle.zIndex == "auto") ? 0 : element.currentStyle.zIndex;
    }

    BackgroundControl.prototype.set = function (id, imageURL) {
        var that = this;

        // check if this control contains that image already
        var bgElement = this.element.querySelector("#" + id);
        if (!bgElement) {
            bgElement = document.createElement("div");
            bgElement.id = id;
            var imageElement = document.createElement("img");
            bgElement.appendChild(imageElement);

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
            this.element.appendChild(bgElement);
        }

        return this._queueTransition(bgElement);
    }

    // Returns a promise that is completed when the background has transitioned to the imageElement
    BackgroundControl.prototype._queueTransition = function (bgElement) {
        bgElement.style.opacity = 0;

        var callback;
        var transitionCompletePromise = new WinJS.Promise(function (complete) {
            callback = complete;
        });

        this._transitionSequence.push({ element: bgElement, promiseCallback: callback });
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
        var transitionElement = nextBackgroundTransition.element;
        var transitionImage = transitionElement.firstElementChild;

        var imageLoadedPromise;
        if (transitionImage.complete) {
            imageLoadedPromise = WinJS.Promise.wrap(null);
        } else {
            imageLoadedPromise = new WinJS.Promise(function (complete) {
                transitionImage.addEventListener("load", function () {
                    setTimeout(complete, 40) // try to prevent pop in
                });
            });
        }

        imageLoadedPromise.then(function () {
            // set a new lastCurrent, clearing the oldLastCurrent
            var oldLastCurrent = that.element.querySelector(".lastCurrent");
            if (oldLastCurrent) {
                WinJS.Utilities.removeClass(oldLastCurrent, "lastCurrent");
                oldLastCurrent.style.zIndex = that._ELEMENT_ZINDEX - 2;
            }

            if (that._currentBackground) {
                var oldCurrent = that.element.querySelector("#" + that._currentBackground);
                WinJS.Utilities.removeClass(oldCurrent, "current");
                WinJS.Utilities.addClass(oldCurrent, "lastCurrent");
                oldCurrent.style.zIndex = that._ELEMENT_ZINDEX - 1;
            }

            that._currentBackground = transitionElement.id;
            WinJS.Utilities.addClass(transitionElement, "current");
            transitionElement.style.zIndex = that._ELEMENT_ZINDEX;

            WinJS.UI.Animation.fadeIn(transitionElement).then(function () {
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

        this.busy = false;
        this.selectedChoice = null;
        this._choicesArray = [];

        // setup html
        this._loadHtml()
    }

    BackgroundSelector.prototype._loadHtml = function () {
        var selected = document.createElement("div");
        selected.className = "selected";
        var selectedBackgroundEl = document.createElement("div");
        selected.appendChild(selectedBackgroundEl);
        this._backgroundControl = new BackgroundControl(selectedBackgroundEl);

        this._choices = document.createElement("div");
        this._choices.className = "choicesList";

        this.element.appendChild(selected);
        this.element.appendChild(this._choices);

        selected.style.height = (selected.offsetWidth * .5625) + "px"; // 16:9 ratio of width to height
    }

    BackgroundSelector.prototype.addChoice = function (choice) {
        if (this._choicesArray.length == maxChoices)
            this.removeChoice(this._choicesArray[0]);

        this._choicesArray.push(choice);

        var otherChoices = this._choices.querySelectorAll(".choice:not([deleting])");

        var choiceEl = document.createElement("div");
        choiceEl.id = choice.id;
        choiceEl.choice = choice;
        choiceEl.className = "choice";
        var size = (0.2 * this.element.offsetWidth - 12);
        choiceEl.style.height = size + "px"; //choiceEl.offsetWidth + "px";
        choiceEl.style.width = size + "px";
        choiceEl.style.backgroundImage = "url('" + choice.thumb + "')";
        choiceEl.style.backgroundSize = size + "px " + size + "px";
        var highlightDiv = document.createElement("div");
        highlightDiv.className = "highlight";
        choiceEl.appendChild(highlightDiv);
        var that = this;
        choiceEl.addEventListener("click", function () { that.selectChoice(choice); });
        choiceEl.addEventListener("MSPointerDown", function () { WinJS.UI.Animation.pointerDown(choiceEl); });
        choiceEl.addEventListener("MSPointerOut", function () { WinJS.UI.Animation.pointerUp(choiceEl); });

        var addToList = WinJS.UI.Animation.createAddToListAnimation(choiceEl, otherChoices);
        this._choices.insertBefore(choiceEl, this._choices.firstElementChild);
        return addToList.execute();
    }

    BackgroundSelector.prototype.removeChoice = function (choice) {
        var choiceIndex = this._choicesArray.indexOf(choice);
        if (choiceIndex == -1)
            return;

        this._choicesArray.splice(choiceIndex, 1);
        var choiceEl = this._choices.querySelector("#" + choice.id);

        if (!choiceEl || choiceEl.deleting)
            return;

        choiceEl.setAttribute("deleting", true);
        var affectedChoices = this._choices.querySelectorAll("div:not([deleting])");
        var deleteAnim = WinJS.UI.Animation.createDeleteFromListAnimation(choiceEl, affectedChoices);
        choiceEl.style.position = "fixed";
        choiceEl.style.zIndex = -1;
        choiceEl.style.opacity = 0;

        return deleteAnim.execute().then(function () {
            choiceEl.parentNode && choiceEl.parentNode.removeChild(choiceEl);
        });
    }

    BackgroundSelector.prototype.selectChoice = function (choice) {
        if (this.busy)
            return false;

        this.busy = true;

        var busyPromises = [];
        this._backgroundControl.set(choice.id, choice.imageURL);

        busyPromises.push(this.removeChoice(choice));
        if (this.selectedChoice) {
            var deletedChoice = this._choices.querySelector("[deleting]");
            deletedChoice.style.marginLeft = (-1 * (deletedChoice.offsetWidth + parseFloat(deletedChoice.currentStyle.marginRight))) + 'px';
            busyPromises.push(this.addChoice(this.selectedChoice));
        }

        this.selectedChoice = choice;

        var that = this;
        WinJS.Promise.join(busyPromises).then(function () {
            that.busy = false;
        });

        return true;
    }

    return BackgroundSelector;
})();