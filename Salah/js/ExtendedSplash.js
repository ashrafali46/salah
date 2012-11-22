(function () { 
    "use strict"; 
 
    var splashResizeHandler;

    // Displays the extended splash screen. Pass the splash screen object retrieved during activation. 
    function show(splash) {
        var extendedSplashImage = document.getElementById("extendedSplashImage"); 
 
        // Position the extended splash screen image in the same location as the system splash screen image. 
        extendedSplashImage.style.top = splash.imageLocation.y + "px"; 
        extendedSplashImage.style.left = splash.imageLocation.x + "px"; 
        extendedSplashImage.style.height = splash.imageLocation.height + "px"; 
        extendedSplashImage.style.width = splash.imageLocation.width + "px"; 
 
        splashResizeHandler = function () {
            if (splash)
                ExtendedSplash.updateImageLocation(splash);
        };
        window.addEventListener("resize", splashResizeHandler, false);

        // Position the extended splash screen's progress ring.
        var extendedSplashProgress = document.getElementById("extendedSplashProgress"); 
        extendedSplashProgress.style.marginTop = splash.imageLocation.y + splash.imageLocation.height + 32 + "px";
 
        // Once the extended splash screen is setup, apply the CSS style that will make the extended splash screen visible. 
        var extendedSplashScreen = document.getElementById("extendedSplashScreen");
        WinJS.Utilities.removeClass(extendedSplashScreen, "hidden");
        var description = extendedSplashScreen.querySelector("#extendedSplashDescription");
        description.style.opacity = 0;

        var finishCallback;
        var finishShowPromise = new WinJS.Promise(function (complete) {
            finishCallback = complete;
        });
        splash.addEventListener("dismissed", function () {
            WinJS.UI.Animation.fadeIn(description).then(finishCallback);
        });
        return finishShowPromise;
    } 
 
    // Updates the location of the extended splash screen image. Should be used to respond to window size changes. 
    function updateImageLocation(splash) { 
        if (isVisible()) { 
            var extendedSplashImage = document.getElementById("extendedSplashImage"); 
 
            // Position the extended splash screen image in the same location as the system splash screen image. 
            extendedSplashImage.style.top = splash.imageLocation.y + "px"; 
            extendedSplashImage.style.left = splash.imageLocation.x + "px"; 
            extendedSplashImage.style.height = splash.imageLocation.height + "px"; 
            extendedSplashImage.style.width = splash.imageLocation.width + "px"; 
 
            // Position the extended splash screen's progress ring. Note: In this sample, the progress ring is not used. 
            /* 
            var extendedSplashProgress = document.getElementById("extendedSplashProgress"); 
            extendedSplashProgress.style.marginTop = splash.imageLocation.y + splash.imageLocation.height + 32 + "px"; 
            */ 
        } 
    } 
 
    // Checks whether the extended splash screen is visible and returns a boolean. 
    function isVisible() { 
        var extendedSplashScreen = document.getElementById("extendedSplashScreen"); 
        return !(WinJS.Utilities.hasClass(extendedSplashScreen, "hidden")); 
    } 
 
    // Removes the extended splash screen if it is currently visible. 
    function remove() { 
        if(isVisible()) { 
            var extendedSplashScreen = document.getElementById("extendedSplashScreen");
            WinJS.UI.Animation.fadeOut(extendedSplashScreen).then(function () {
                WinJS.Utilities.addClass(extendedSplashScreen, "hidden");
                window.removeEventListener("resize", splashResizeHandler, false);
            });
        }
    } 
 
    WinJS.Namespace.define("ExtendedSplash", { 
        show: show, 
        updateImageLocation: updateImageLocation, 
        isVisible: isVisible, 
        remove: remove
    }); 
})(); 