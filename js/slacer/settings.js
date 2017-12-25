/* global _ */

// namespace
var SLAcer = SLAcer || {};

class Settings {

    // Constructor
    constructor(settings) {
        this.settings = {};
        for (var namespace in window.localStorage) {
            this.settings[namespace] = JSON.parse(
                window.localStorage.getItem(namespace)
            );
        }
        _.defaultsDeep(this.settings, settings || {});
        this.store();
    }

    // -------------------------------------------------------------------------

    store() {
        for (var namespace in this.settings) {
            window.localStorage.setItem(
                namespace, JSON.stringify(this.settings[namespace])
            );
        }
    }

    has(path) {
        return _.has(this.settings, path);
    }

    get(path, defaultValue) {
        if (path) {
            return _.get(this.settings, path, defaultValue);
        }

        return this.settings;
    }

    set(path, value, store) {
        store = (store == undefined) ? true : (!!store);

        if (typeof path == 'string') {
            if (typeof value == 'object') {
                value = _.merge(this.get(path, {}), value);
            }
            _.set(this.settings, path, value);
        }
        else {
            for (var namespace in path) {
                this.set(namespace, path[namespace], false);
            }
        }

        store && this.store();

        return this;
    }
}

// export module
SLAcer.Settings = Settings;

