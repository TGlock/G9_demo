/*
    `Revealing Module` pattern
    variable naming convention -
        single underscore _  private and 'global' within the module

        explored
        ES6 class ... too verbose '' for internal vars and internal method to method calls
        Obj literal with a namespace e.g. 'XXX.' also too verbose ...

    ( NOTE all top-level methods are `const` - see trailing comma on closing bracket `},` )
*/
const Util = (function (_doc) {

    'use strict';

    const isCheckbox = (elm) => {
        return ((elm instanceof HTMLInputElement) && (elm.getAttribute('type') == 'checkbox'))
    },

        getStyle = (el, styleProp) => {
            if (el.currentStyle)
                return el.currentStyle[styleProp];

            return _doc.defaultView.getComputedStyle(el, null)[styleProp];
        },

        getelm = (elm_select_id) => {
            let el = null;
            if (typeof elm_select_id === 'string') {
                el = _doc.getElementById(elm_select_id)
                if (el == null) {
                    el = _doc.querySelector(elm_select_id)
                }
            } else {
                el = elm_select_id
            }
            return el
        },

        encodeFormData = (data) => {
            return Object.keys(data)
                .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
                .join('&');
        },

        encodeFormDataEx = (data) => {
            let formdata = new FormData();
            for (const [key, value] of Object.entries(data)) {
                formdata.append(key, value)
            }
            return formdata
        },

        elmid = (el) => {
            if (typeof el === 'string') {
                el = _doc.getElementById(el)
            }
            return el
        },

        elmqry = (el) => {
            if (typeof el === 'string') {
                el = _doc.querySelector(el)
            }
            return el
        },

        set = (el, v) => {
            let elm = getelm(el)

            if (elm == null) {
                console.log("ELEMENT not Found: ", el, v)
                return
            }

            if (elm.tagName === 'SELECT') {
                if (v == null) {
                    for (let o of elm.options) {
                        o.selected = false
                    }
                    elm.selectedIndex = -1
                } else {
                    if (Array.isArray(v) && elm.hasAttribute('MULTIPLE')) {//v is array and <SELECT> must have MULTIPLE
                        for (let n of v) {
                            for (let o of elm.options) {
                                if (o.value === n) {
                                    o.selected = true
                                    break;
                                }
                            }
                        }
                    } else {
                        for (let o of elm.options) {
                            o.selected = (o.value === v)
                        }
                    }
                }
            } else if (elm.tagName === 'OPTION') {
                elm.selected = (v)
            } else if (elm.tagName === 'TEXTAREA') {
                elm.value = v
            } else {
                if (isCheckbox(elm)) {
                    elm.checked = (v == null) ? false : (v)
                } else {
                    if (elm instanceof HTMLInputElement) {
                        elm.value = v
                    } else {
                        elm.textContent = v
                    }
                }
            }
        },

        get = (el) => {
            let elm = elmid(el)
            if (elm.tagName === 'SELECT') {
                if (elm.hasAttribute('MULTIPLE')) {
                    return Array.from(elm.selectedOptions, v => v.value)
                } else {
                    return (elm.selectedIndex >= 0) ? elm.options[elm.selectedIndex].value : null
                }
            } else {
                return isCheckbox(elm) ? elm.checked : elm.value
            }
        },

        on = (el, evt, fnc) => {
            if (el instanceof HTMLElement) {
                el.addEventListener(evt, fnc)
            } else {
                if (el.substring(0, 1) === '.') {
                    let els = _doc.querySelectorAll(el)
                    for (let el of els) {
                        el.addEventListener(evt, fnc)
                    }
                } else {
                    _doc.getElementById(el).addEventListener(evt, fnc)
                }
            }
        },

        off = (el, evt, fnc) => {
            if (el.substring(0, 1) === '.') {
                let els = _doc.querySelectorAll(el)
                for (let el of els) {
                    el.removeEventListener(evt, fnc)
                }
            } else {
                _doc.getElementById(el).removeEventListener(evt, fnc)
            }
        },

        hide = (el) => {
            elmid(el).style.display = 'none'
        },

        show = (el, how = 'block') => {
            elmid(el).style.display = how
        },

        addclass = (el, cls) => {
            el = elmqry(el)
            if (el) {
                el.classList.add(cls)
            }
        },

        delclass = (el, cls) => {
            el = elmqry(el)
            if (el) {
                el.classList.remove(cls)
            }
        },

        class_update = (method, classlist, ...selectors) => {
            for (const selector of selectors) {
                const nodes = _doc.querySelectorAll(selector)
                for (const node of nodes) {
                    node.classList[method](classlist)
                }
            }
        },

        delopt = (el, opt_key) => {
            let elm = getelm(el)
            if (elm instanceof HTMLOptionElement) {
                elm.parentElement.remove(elm.index)
            }
        },

        ischild = (parent, child) => {
            let node = child.parentNode;
            while (node != null) {
                if (node == parent) {
                    return true;
                }
                node = node.parentNode;
            }
            return false;
        },

        attachlisteners = (object, classname = 'g9') => {
            const attr = 'data-' + classname + '-on',
                nodes = _doc.querySelectorAll('[' + attr + ']');

            for (const node of nodes) {
                let val = node.getAttribute(attr),
                    list = val.split(',');

                for (const item of list) {
                    let inf = item.split(':'),
                        evt = inf[0].trim(),
                        fnc = inf[1].trim();

                    if (object[fnc]) {
                        node.addEventListener(evt, object[fnc])
                    } else {
                        console.log('attachlisteners - function not found: ' + fnc)
                    }
                }
            }
        },

        detachlisteners = (object, classname = 'g9') => {
            const attr = 'data-' + classname + '-on',
                nodes = _doc.querySelectorAll('[' + attr + ']');

            for (const node of nodes) {
                let val = node.getAttribute(attr),
                    list = val.split(',');

                for (const item of list) {
                    let inf = item.split(':'),
                        evt = inf[0].trim(),
                        fnc = inf[1].trim();

                    if (object[fnc]) {
                        node.removeEventListener(evt, object[fnc])
                    } else {
                        console.log('detachlisteners - function not found: ' + fnc)
                    }
                }
            }
        },

        randomtext = (maxWords) => {
            const words = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque hendrerit ligula malesuada enim varius interdum. Nulla interdum enim in nulla volutpat, et euismod massa consequat. Praesent vitae cursus libero. Cras ac bibendum urna. Vivamus varius interdum augue maximus interdum. Morbi consequat ex in finibus
            varius. Pellentesque consequat erat id tristique lobortis. Suspendisse laoreet consequat arcu. Aenean viverra lobortis suscipit. Nullam pharetra magna vitae
            felis volutpat bibendum sed eu ante. Phasellus lobortis cursus porta. orem ipsum dolor sit amet, consectetur adipiscing elit. Quisque hendrerit ligula malesuada enim varius interdum. Nulla interdum enim in nulla volutpat, et euismod massa consequat. Praesent vitae cursus libero. Cras ac bibendum urna. Vivamus varius interdum
            augue maximus interdum. Morbi consequat ex in finibus varius. Pellentesque consequat erat id tristique lobortis. Suspendisse laoreet consequat arcu. Aenean viverra lobortis suscipit. Nullam pharetra magna vitae felis volutpat bibendum sed eu ante. Phasellus lobortis
            cursus porta. orem ipsum dolor sit amet, consectetur adipiscing elit. Quisque hendrerit ligula malesuada enim varius interdum. Nulla interdum enim in nulla volutpat, et euismod massa consequat. Praesent
            vitae cursus libero. Cras ac bibendum urna. Vivamus varius interdum augue maximus interdum. Morbi consequat ex in finibus varius. Pellentesque consequat erat id tristique lobortis. Suspendisse laoreet consequat arcu.
            Aenean viverra lobortis suscipit. Nullam pharetra magna vitae felis volutpat bibendum sed eu ante. Phasellus lobortis cursus porta. orem ipsum dolor sit
            amet, consectetur adipiscing elit.`.split(' ')

            // Shuffle the array of words
            for (let i = words.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [words[i], words[j]] = [words[j], words[i]];
            }

            // Return a subset of the array up to the specified maximum number of words
            return words.slice(0, maxWords).join(' ');

        },

        randomid = (len) => {
            return Math.random().toString(36).slice(2)
        },

        randomint = (min, max) => {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        delclassset = (query, classname) => {
            let elms = _doc.querySelectorAll(query)
            for (let elm of elms) {
                elm.classList.remove(classname)
            }
        };

    return {
        on: on,
        off: off,
        hide: hide,
        show: show,
        set: set,
        get: get,
        addclass: addclass,
        delclass: delclass,
        class_update: class_update,
        delopt: delopt,
        ischild: ischild,
        randomid: randomid,
        randomint: randomint,
        randomtext: randomtext,
        delclassset: delclassset,
        encodeFormData: encodeFormData,
        encodeFormDataEx: encodeFormDataEx,
        attachlisteners: attachlisteners,
        detachlisteners: detachlisteners,
        getStyle: getStyle
    }

})(window.document);

export {
    Util
}