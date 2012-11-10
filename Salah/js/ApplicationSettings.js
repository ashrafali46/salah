var ApplicationSettings = (function () {
    var LocalSettingsValues = Windows.Storage.ApplicationData.current.localSettings.values;

    var locationCoordSettingId = "locationCoordinate",
        locationNameSettingId = "locationName",
        locationAutomaticSettingId = "locationAutomatic",
        backgroundSettingId = "background";

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
                    return LocalSettingsValues[locationAutomaticSettingId] || false;
                },
                set: function (autoMethod) {
                    LocalSettingsValues[locationAutomaticSettingId] = autoMethod;
                }
            },
        });

        Object.defineProperties(this, {
            location: {
                enumerable: true,
                writable: false,
                value: locationObject
            },
            background: {
                enumerable: true,
                get: function () {
                    return LocalSettingsValues[backgroundSettingId];
                },
                set: function (background) {
                    LocalSettingsValues[backgroundSettingId] = background;
                }
            }
        });
    };

    return new ApplicationSettings();
})();