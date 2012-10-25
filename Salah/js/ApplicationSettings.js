var ApplicationSettings = (function () {
    var LocalSettingsValues = Windows.Storage.ApplicationData.current.localSettings.values;

    var locationSettingId = "location",
        locationNameSettingId = "locationName",
        autoMethodSettingId = "autoMethod",
        backgroundSettingId = "background";

    function ApplicationSettings() {
        Object.defineProperties(this, {
            location: {
                get: function () {
                    if (LocalSettingsValues[locationSettingId] === undefined)
                        return undefined;
                    else {
                        var value = JSON.parse(LocalSettingsValues[locationSettingId]);
                        if (value == {})
                            return undefined;
                        else
                            return value;
                    }
                },
                set: function (locationObject) {
                    // Location objects looks like:
                    // {
                    //      latitude: <Number>,
                    //      longitude: <Number>
                    // }
                    LocalSettingsValues[locationSettingId] = JSON.stringify(locationObject);
                }
            },

            locationName: {
                get: function () {
                    return LocalSettingsValues[locationNameSettingId];
                },
                set: function (locationName) {
                    LocalSettingsValues[locationNameSettingId] = locationName;
                }
            },

            autoMethod: {
                get: function () {
                    return LocalSettingsValues[autoMethodSettingId] || false;
                },
                set: function (autoMethod) {
                    LocalSettingsValues[autoMethodSettingId] = autoMethod;
                }
            },

            background: {
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