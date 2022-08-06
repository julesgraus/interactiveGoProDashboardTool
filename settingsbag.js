export default class settingsBag {
    constructor() {
        return new Proxy(this, this);
    }

    /**
     * @param {string} jsonString
     */
    static fromJsonString(jsonString) {
        let instance = new settingsBag();
        try {
            let settingsJson = JSON.parse(jsonString);
            for(let key in settingsJson) {
                instance[key] = settingsJson[key];
            }
            return instance;
        } catch (e) {
            return new this;
        }
    }
    get(target, property) {
        return this[property] || null
    }
    toJSON() {
        return {...this};
    }
}
