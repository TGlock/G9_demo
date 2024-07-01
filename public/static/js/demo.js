class Demo {

    constructor(doc, templates, api) {
        this._name = this.constructor.name
        this._doc = doc
        this._api = api
        this._templates = templates
    }

    //dependency injection
    use = (doc, templates, api) => {
        this._doc = doc,
        this._templates = templates,
        this._api = api
    }


    init = async () => {

        console.log(this._name, 'init')

        // render default templates (appnav, banner, footer, etc.)
        await this._templates?.init()


    }

}

export default Demo