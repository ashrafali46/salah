/// <reference path="//Microsoft.WinJS.1.0/js/base.js" />
var backgroundListDataSource = (function () {
    "use strict";

    var data = [{
        title: "Islamic Geometric Pattern",
        location: null,
        auth: "Bay Vakoof",
        authURL: null,
        src: "pattern.png"
    },
    {
        title: "Dome of the Rock",
        location: "Palestine",
        auth: "Brian Beggerly",
        authURL: "http://www.flickr.com/photos/beggs/",
        src: "dome-of-the-rock.jpg"
    },
    {
        title: "Laleli Mosque",
        location: "Turkey",
        auth: "Edal Lefterov",
        authURL: "http://commons.wikimedia.org/wiki/User:Edal",
        src: "laleli-mosque.jpg"
    },
    {
        title: "Hassan II Mosque",
        location: "Morocco",
        auth: "Rosino",
        authURL: "http://www.flickr.com/photos/rosino/",
        src: "hassan-mosque.jpg"
    },
    {
        title: "Abuja National Mosque",
        location: "Nigeria",
        auth: "Kipp Jones",
        authURL: "http://www.flickr.com/photos/kippster/",
        src: "mosque-abuja.jpg"
    },
    {
        title: "Jama Masjid",
        location: "India",
        auth: "Antonio García",
        authURL: "http://www.flickr.com/photos/agarcia/",
        src: "jama-masjid.jpg"
    }];

    var backgroundList = new WinJS.Binding.List(data);
    return backgroundList.dataSource;
})();