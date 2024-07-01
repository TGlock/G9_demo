class Templates {

    constructor() {
        this._name = this.constructor.name
    }

    //dependency injection after instantiation
    use = (doc, utl, api) => {
        this._doc = doc,
        this._utl = utl,
        this._api = api
    }

    //read all the templates, querySelect for them and if found, render them
    init = async () => {
        const nodes = this._doc.querySelectorAll('[data-g9-template]');
        for (const node of nodes) {
            let name = node.nodeName.toLowerCase()
            let template = this.templates[name]
            if (template) {
                node.innerHTML = template(node.dataset)
                if (this.handlers) {
                    this.attachlisteners(node, 'g9', this.handlers)
                    this.handlers[name + '-init']?.()  //invoke init method if it exists...
                }
            }
        }
        await this.show_banner()
    }

    render = (selector, template, data, handlers = this.handlers) => {
        let el = this._doc.querySelector(selector)
        if (el) {
            el.innerHTML = this.templates[template](data)
            if (handlers) {
                this.attachlisteners(el, 'g9', handlers)
                //init ?
                handlers[template + '-init']?.()
            }
        } else {
            console.log(`${this._name}.render: ${selector} not found`)
        }
    }

    attachlisteners = (el, classname = 'g9', handlers) => {
        const attr = 'data-' + classname + '-on',
            nodes = el.querySelectorAll('[' + attr + ']');

        for (const node of nodes) {
            let val = node.getAttribute(attr),
                list = val.split(',');

            for (const item of list) {
                let inf = item.split(':'),
                    evt = inf[0].trim(),
                    fnc = inf[1].trim();

                if (handlers[fnc]) {
                    node.addEventListener(evt, handlers[fnc])
                } else {
                    console.log(`${this._name}.attachlisteners() error: function "${fnc}" not found in ${handlers}`)
                }
            }
        }
    }

    nop = () => {}

    show_modal = (title = '', message = '', callback = this.nop, buttons = [{msg: 'Ok', action: 'ok'}]) => {

        let el = this._doc.querySelector('[data-g9-modal]'),
            html = /* html */`
            <div id="g9-modal" class="modal is-hidden">
                <div class="modal-content" style="position: relative; max-height: 80dvh">
                    <span role="close" class="close-btn clickable" data-g9-action='close'>&times;</span>
                    <h4 id="modal-title" class="pb-s" style="padding-bottom: var(--padding-s);">${title}</h4>
                    <p id="modal-text" class="my-s" style="overflow-y: scroll; max-height: 50svh">${message}</p>
                    ${buttons.map((btn, idx) => {
                        return `<button class="button" style="margin-right: .5rem" data-g9-action="${btn.action}"}>${btn.msg}</button>`
                    }).join('')}
                </div>
            </div>`;

        const handler = (evt) => {
            let hit = evt.target.closest('[data-g9-action]')
            if (hit) {
                el.firstElementChild.remove()
                callback(hit.dataset.g9Action)
            }
            return
        }

        el.innerHTML = html
        el.firstElementChild.addEventListener('click', handler)
        el.firstElementChild.classList.remove('is-hidden')

    }

    show_banner = async () => {
        let el = this._doc.querySelector('[data-g9-banner]'),
            html = /* html */`
            <div id="banner" class="is-hidden">
                <span role="close" class="close-btn clickable" data-g9-action="close">&times;</span>
                <p>Some Alert might be here!!!</p>
                <p>another Alert might be here!!!</p>
            </div>`;

        const handler = (evt) => {
            let hit = evt.target.closest('[data-g9-action]')
            if (hit) {
                el.firstElementChild.remove()
                //Store in session storage
                if (hit.dataset.g9Action === 'close') {
                   sessionStorage.setItem('banner', 'closed')
                }
            }
            return
        }

        if (el) {
            let banner = sessionStorage.getItem('banner')
            if (banner !== 'closed') {
                el.innerHTML = html
                el.firstElementChild.classList.remove('is-hidden')
                el.firstElementChild.addEventListener('click', handler)
            }
        }
    }

    templates = {

        'g9-appnav' : (data) => {
            return /* html */`
            <nav id="app-nav" class="app-nav">
                <!-- main links -->
                <div id="nav-links" data-g9-on="click:g9-appnav-click"
                    class="navbar-group col-gap-l"
                    style="position: relative;">

                    <!-- logo home -->
                    <a class="link mr-l" href="/home" data-g9-logo style="font-weight:600">
                        <i class="fa fa-cogs pr-s"></i>EA<sup>2</sup>
                    </a>

                    <nav id="drop-nav" class="is-hidden"
                        style="position: fixed;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            background-color: rgba(49, 57, 71, 0.75);
                            z-index: 1000;">

                        <div class="flex-col is-rounded"
                            style="position: absolute;
                            /* align-content:space-between; */
                                left: .5rem;
                                top: 1rem;
                                max-height: 100%;
                                row-gap: var(--rem-1);
                                font-size: var(--rem-125);
                                border: 1px solid var(--color-border-primary);
                                padding: var(--rem-1);
                                background-color: var(--color-background-primary);
                                overflow-y: auto;
                                box-shadow: 1.5rem 1.5rem 1.5rem rgba(0, 0, 0, 0.5);">

                                <a class="link" href="/home">Home</a>

                                <hr style="border-color: var(--grey-500);">

                                <a class="link" href="/applications">Applications</a>
                                <a class="link" href="/ai">Interact</a>

                                <a class="link" href="/decisions">Decisions</a>
                                <a class="link" href="/roadmaps">Roadmaps</a>

                                <a class="link" href="/standards">Standards</a>
                                <a class="link" href="/strategies">Strategies</a>
                                <a class="link" href="/content">Content</a>

                                <hr style="border-color: var(--black);">

                                <a class="link" href="/logout">Logout</a>

                        </div>
                    </nav>

                <a class="link is-hidden-at-420" href="/applications">Applications</a>
                <a class="link is-hidden-at-420" href="/ai">Interact</a>

                <a class="link is-hidden-at-420" href="/decisions">Decisions</a>
                <a class="link is-hidden-at-420" href="/roadmaps">Roadmaps</a>

                <a class="link is-hidden-at-420" href="/standards">Standards</a>
                <a class="link is-hidden-at-420" href="/strategies">Strategies</a>
                <a class="link is-hidden-at-420" href="/content">Content</a>
            </div>

            <!-- views / tags -->
            <div class="navbar-group">
                <a class="link is-hidden-at-420" href="/views">Views</a>
                <a class="link is-hidden-at-420" href="/meta">Meta</a>
            </div>

            <!-- login -->
            <div class="navbar-group">
                <a class="link" href="#">
                    <i class="far fa-user-circle pr-s fs-125"></i>
                    <span class="is-hidden-at-340">Login</span>
                </a>
                <a class="link" href="#"><i class="fas fa-ellipsis-v fs-125"></i></a> <!-- print, settings ... -->
            </div>
            </nav>`;
        },

        'g9-footer': (data) => {
            return /* html */`
            <section id="footer">
                <footer>
                    <a href="/license">License</a>
                    <a href="/support">Support</a>
                    <a href="/privacy">Privacy Policy</a>
                    <a href="/tos">Terms of Service</a>
                    <p>© 2024 Glock Systems LLC.<br>All Rights Reserved.</p>
                </footer>
            </section>`;
        }
    }

    //arrow functions resolve 'this' to the Templates class (lexical)
    handlers = {

        'g9-appnav-click': (evt) => {

            const doc = this._doc;

            //anthing to do ?
            if (doc.defaultView.innerWidth > 420) {
                return
            }

            let hit = evt.target.closest('a'),
                nav = doc.getElementById('drop-nav');

            if (hit) {
                //logo click ?
                if (hit && hit.hasAttribute('data-g9-logo')) {
                    nav?.classList.toggle('is-hidden');
                    evt.preventDefault();
                } else {
                    nav?.classList.add('is-hidden');
                    //staying on same page ?
                    if (hit.href === doc.location.href) {
                        evt.preventDefault();
                    }
                }
            } else {
                nav?.classList.add('is-hidden');
            }

        },

        'g9-appnav-init': () => {
         //   this._doc.querySelector(`#app-nav a[href="${this._doc.location.pathname}"]`)?.classList.add('is-active')
            let links = this._doc.querySelectorAll(`#app-nav a[href="${this._doc.location.pathname}"]`)
            for (const link of links) {
                link.classList.add('is-active')
            }
        },

        'g9-appnav-term': function (param) {
            console.log('g9-appnav-term', param, this)
        }
    }
}

export default new Templates()  // singleton