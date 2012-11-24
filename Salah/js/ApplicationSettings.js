// Depends on PrayerCalculator

var ApplicationSettings = (function () {
    var LocalSettingsValues = Windows.Storage.ApplicationData.current.localSettings.values;

    var locationCoordSettingId = "locationCoordinate",
        locationNameSettingId = "locationName",
        locationAutomaticSettingId = "locationAutomatic",
        backgroundSettingId = "backgroundId",
        runCountId = "runCount",
        salahMethodSettingId = "salahMethod",
        salahDisplayExpiredSettingId = "salahDisplayExpired",
        salahDayDisplayNumberSettingId = "salahDayDisplayNumber";

    WinJS.Application.addEventListener("activated", function () {
        var runCount = LocalSettingsValues[runCountId];
        if (runCount === undefined) {
            LocalSettingsValues[runCountId] = 1;
        } else {
            runCount++;
            LocalSettingsValues[runCountId] = runCount;
        }
    });

    function ApplicationSettings() {
        var locationObject = new Object();
        Object.defineProperties(locationObject, {
            coord: {
                enumerable: true,
                get: function () {
                    if (LocalSettingsValues[locationCoordSettingId] === undefined)
                        return undefined;
                    else {
                        var value = JSON.parse(LocalSettingsValues[locationCoordSettingId]);
                        if (value == {})
                            return undefined;
                        else
                            return value;
                    }
                },
                set: function (coordObject) {
                    /* Coord objects looks like:
                    {
                            latitude: <Number>,
                            longitude: <Number>
                    }*/
                    LocalSettingsValues[locationCoordSettingId] = JSON.stringify(coordObject);
                }
            },

            name: {
                enumerable: true,
                get: function () {
                    return LocalSettingsValues[locationNameSettingId];
                },
                set: function (locationName) {
                    LocalSettingsValues[locationNameSettingId] = locationName;
                }
            },

            automatic: {
                enumerable: true,
                get: function () {
                    return LocalSettingsValues[locationAutomaticSettingId];
                },
                set: function (autoMethod) {
                    LocalSettingsValues[locationAutomaticSettingId] = autoMethod;
                }
            },
        });

        var salahObject = new Object();
        Object.defineProperties(salahObject, {
            method: {
                enumerable: true,
                get: function () {
                    return LocalSettingsValues[salahMethodSettingId];
                },
                set: function (methodParam) {
                    if (methodParam instanceof Object) {
                        var keyName;
                        for (var key in PrayerCalculator.Methods) {
                            if (methodParam == PrayerCalculator.Methods[key]) {
                                keyName = key;
                                break;
                            }
                        }
                        LocalSettingsValues[salahMethodSettingId] = keyName;
                    } else {
                        LocalSettingsValues[salahMethodSettingId] = methodParam;
                    }
                }
            },

            displayExpired: {
                enumerable: true,
                get: function () {
                    return LocalSettingsValues[salahDisplayExpiredSettingId];
                },
                set: function (display) {
                    LocalSettingsValues[salahDisplayExpiredSettingId] = display;
                }
            },

            dayDisplayNumber: {
                enumerable: true,
                get: function () {
                    return LocalSettingsValues[salahDayDisplayNumberSettingId];
                },
                set: function (numberOfDaysToDisplay) {
                    LocalSettingsValues[salahDayDisplayNumberSettingId] = numberOfDaysToDisplay;
                }
            }
        });

        Object.defineProperties(this, {
            salah: {
                enumerable: true,
                writable: false,
                value: salahObject
            },
            location: {
                enumerable: true,
                writable: false,
                value: locationObject
            },
            backgroundId: {
                enumerable: true,
                get: function () {
                    return LocalSettingsValues[backgroundSettingId];
                },
                set: function (background) {
                    LocalSettingsValues[backgroundSettingId] = background;
                }
            },
            firstRun: {
                enumerable: true,
                get: function () {
                    return (LocalSettingsValues[runCountId] === undefined) || (LocalSettingsValues[runCountId] == 0);
                }
            }
        });
    };

    return new ApplicationSettings();
})();