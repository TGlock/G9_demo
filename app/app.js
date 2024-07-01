'use strict';

//Application imports
import { createReadStream, watch } from 'node:fs';

import { config } from './config.js'
import { directory_list, file_compress, Compressor } from '../../G9/lib/compress.js';

//G9 imports
import {
    file_stat,
    send_file,
    send_buffer,
    send_html,
    send_json,
    send_text,
    send_stream,
    error_to_text
} from '../../G9/lib/sender.js'

//App Global Scope
const _file_map = new Map(),
     _sse_clients = [];

//Top level
const compress_files = async (directory, shallow = false) => {

    //compress files for do_static
    const files = await directory_list(directory, shallow);

    for (const filename of files) {
        let f_data = await file_compress(filename),
            key = filename.replace(config.static_parent, '') //use url as key. E.g. '/static/htm/page.html'
        if (f_data) {
            _file_map.set(key, f_data)
        }
    }

    compress_stats()
}

const compress_stats = () => {

    let count = 0,
        size_bytes = 0,
        smallest = 16384,
        largest = 0,
        total_bytes = 0,
        iter = _file_map.entries();

    for (const f of iter) {

        if (f[1].data) {
            count += 1
            size_bytes += f[1].data.length

            if (size_bytes < smallest) {
                smallest = size_bytes
            }

            if (size_bytes > largest) {
                largest = size_bytes
            }

            total_bytes += size_bytes
        }

    }

    console.log('_compress_map stats:', count, 'files,', (28227929 / (1024 * 1000)).toFixed(2) + 'mb', smallest, 'min,' , largest, 'max,', (size_bytes / count).toFixed(0), 'average size')
   // console.timeEnd('compress_stats')

}

const do_static = async (req, res) => {

    //hit, data, encoded, accepts
    //hit, data, encoded, no accepts
    //hit, no data, encoded disk, accepts
    //hit, no data, encoded disk, no accepts
    //no hit

    const f = _file_map.get(req.path)

    if (f) {

        let accept_encoding = ((req.headers['accept-encoding'] || '').indexOf(' ' + f.enco) !== -1),
            status = (f.etag === req.headers['if-none-match']) ? 304 : 200;

        if (f.data && f.enco && accept_encoding) {

            res.send(
                status,
                f.data,
                {
                    'Content-Type': f.mime,
                    'Cache-Control': 'max-age=120',
                    'Content-Length': f.data.length,
                    'Content-Encoding': f.enco,
                    'Vary': 'Accept-Encoding', //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
                    'ETag': f.etag
                }
            );

            /* Multiple examples of other ways to do this...
            res.prepare(
                status,
                f.data,
                send_buffer,
                'Content-Type', f.mime,
                'Cache-Control', 'max-age=120',
                'Content-Encoding', f.enco,
                'Content-Length', f.data.length,
                'Vary', 'Accept-Encoding', //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
                'ETag', f.etag
            );

            res.statusCode = status
            res.setHeader('Content-Type', f.mime)
            res.setHeader('Cache-Control', 'max-age=120')
            res.setHeader('Content-Length', f.data.length)
            res.setHeader('Content-Encoding', f.enco)
            res.setHeader('Vary', 'Accept-Encoding') //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
            res.setHeader('ETag', f.etag)
            res.end((status === 304 || res.req.method === 'HEAD') ? null : f.data)

            res.writeHead(status,
                ['Content-Type', f.mime,
                'Cache-Control', 'max-age=120',
                'Content-Length', f.data.length,
                'Content-Encoding', f.enco,
                'Vary', 'Accept-Encoding', //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
                'ETag', f.etag])
            res.end((status === 304 || res.req.method === 'HEAD') ? null : f.data)
            */


        } else if (f.data && f.enco && !accept_encoding) { //data encoded in map but client does not accept...

            res.prepare(
                status,
                createReadStream(f.name),
                send_stream,
                'Content-Type', f.mime,
                'Cache-Control', 'max-age=120',
                'Transfer-Encoding', 'chunked',
                'Vary', 'Accept-Encoding', //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
                'ETag', f.etag
            );

        } else if (f.encoded_file && accept_encoding) {  //TODO - encode files to disk...

            res.prepare(
                status,
                createReadStream(f.encoded_file),
                send_stream,
                'Content-Type', f.mime,
                'Cache-Control', 'max-age=120',
                'Content-Encoding', f.enco,
                'Transfer-Encoding', 'chunked',
                'Vary', 'Accept-Encoding', //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
                'ETag', f.etag,
            );

        } else { // (f.encoded_file && !accept_encoding)

            res.prepare(
                status,
                createReadStream(f.name),
                send_stream,
                'Content-Type', f.mime,
                'Cache-Control', 'max-age=120',
                'Transfer-Encoding', 'chunked',
                'Vary', 'Accept-Encoding', //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
                'ETag', f.etag
            );
        }

    } else {

        try {
            let f = await file_stat(config.static_parent + req.path, true)

            /*
            res.prepare(
                (f.etag === req.headers['if-none-match']) ? 304 : 200,
                f.data,
                send_stream,
                'Content-Type', f.mime,
                'Cache-Control', 'max-age=120',
                'Transfer-Encoding', 'chunked',
                'ETag', f.etag
            ); */

            //transfer-encoding auto set for streams...

            res.send(
                (f.etag === req.headers['if-none-match']) ? 304 : 200,
                f.data,
                {
                    'Transfer-Encoding': 'chunked',
                    'Content-Type': f.mime,
                    'Cache-Control': 'max-age=120',
                    'Vary': 'Accept-Encoding', //https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Vary
                    'ETag': f.etag
                }
            );

        } catch (error) {
            do_not_found(req, res)
        }

    }

}

const do_favicon = async (req, res) => {
    req.path = config.static_prefix + 'img/favicon.ico'
    await do_static(req, res)
}

const do_force_error = (req, res) => {

    const p = 0

    try {
        p = 'some value' // cause an "... assignment to constant variable ..." error
    } catch (err) {
        res.prepare(
            500,
            error_to_text(err),
            send_text
        )
    }

    return p
}

const do_japanese = async (req, res) => {

    send_text(
        res,
        200,
        'Good morning: Ohayō (おはよう) or ohayō gozaimas (おはようございます)',
        { 'cache-control': 'max-age=120' }
    )

}

const do_not_found = async (req, res) => {

    // Note 404s are cacheable... ( https://httpwg.org/specs/rfc7231.html#status.404 )

    if (req.path.startsWith(config.static_prefix)) {
       send_html(res, 404, `<h3>Resource ${req.path} Not Found</h3>`)

    } else if (req.path.startsWith(config.api_prefix)) {
        send_json(res, 404, { error: 'api not found' })

    } else {
        send_text(res, 404, 'Page Not Found')
    }
}

const do_text = async function (req, res) {
    send_text(res, 200, 'This is some text')
}

const do_html = async function (req, res) {
    send_html(res, 200, '<h3>This is some html</h3>')
}

const do_json = async function (req, res) {
    send_json(res, 200, { json: 'some json value' })
}

const do_buffer = async function (req, res) {
    send_buffer(res, 200, Buffer.from('hello', 'utf8'))
}

const do_file = async function (req, res) {
    await send_file(res, 200, '/Users/tomglock/dev/node/next_3/app/web/static/css/ea2.css')
}

const do_emoji = async (req, res) => {
    send_text(res, 200, '🤣')
}

const do_parameter = async (req, res) => {
    const obj = Object.fromEntries(req.route.params);
    const text = JSON.stringify(obj);
    send_text(res, 200, text)
}

const create_route_middleware_stack = (router) => {

    const authenticated = async (req, res, fn) => {
        console.log('enter authenticated')
        res.prepare(200, 'Authenticated', send_text, 'X-Header', 'A')
        if (fn) await fn()
        console.log('exit authenticated')
    }
    const authorized = async (req, res, fn) => {
        console.log('enter authorized')
        res.prepare(200, res.body += '\nAuthorized', send_text, 'X-Header', 'B')
        if (fn) await fn()
        console.log('exit authorized')
    }
    const handle_route = async (req, res, fn) => {
        console.log('enter handler')
        if (fn) await fn()
        res.prepare(200, res.body += '\nHandled \n\n Also see server log and http headers in dev tools.', send_text, 'X-Header', 'C')
        console.log('exit handler')
    }

    return router.compose([authenticated, authorized, handle_route])

}


// handle request to broadcast a message...
const events_broadcast = async (req, res) => {

    let msg = req.URL.searchParams.get('msg') || 'test message',
        count = 0;

    if (msg) {

        _sse_message_que.push(msg)

        for (let sse_client of _sse_clients) {
            let id = _sse_message_que.length
            try {
                if (sse_client.response?.destroyed) {
                    console.log('sse client disconnected:', sse_client.trace_id)
                } else {
                    count += 1
                    sse_client.body.msg = msg
                    sse_client.response.write('data: ' + JSON.stringify(c.body) + '\n\nid: ' + id + '\n\n')
                }
            } catch (err) {
                console.log('events_broadcast error', err)
            }
        }

        send_text(res, 'message: "' + msg + '" qued and sent ' + count + ' subscribers.')
    }

}


// handle an SSE subscriber
const events_subscribe = (req, res) => {

    res.body = { msg: _sse_message_que[_sse_message_que.length] }

    _sse_clients.push(req, res)

    let last_event_id = req.headers['last-event-id']

    console.log('last-event-id:', last_event_id || '(none)')

    //In uses cases where messages are qued and have an id this function might
    //check for 'last-event-id' and send any missed messages back...
    //last-event-id is for when server communication is lost...

    if (last_event_id) {
        let ndx = parseInt(last_event_id, 10),
            missed_messages = '';

        for (let i = ndx + 1, max = _sse_message_que.length; i < max; i += 1) {
            missed_messages += 'data: ' + JSON.stringify({ msg: _sse_message_que[i] }) + '\n\nid: ' + i + '\n\n'
        }
        if (missed_messages) {
            res.body = missed_messages
        }
    }

}
const handle_multipart = (req, res) => {
    console.log('handle_multipart', req.data)
    res.prepare(200, req.data, send_json)
}

const filewatch_init = () => {

    const watch_fn = async function (eventType, filename) {
        console.log('watch event', eventType);
        if ((eventType === 'change') && filename) {
            console.log('watch event filename', filename);

            filename = filename.replaceAll('\\', '/') //normalize slashes

            //in map ?
            let key = config.static_prefix + filename
            if (_file_map.has(key)) {
                let f_data = _file_map.get(key)

                if (!f_data.marked) {
                    f_data.marked = true

                    let h = setTimeout(  //wait a moment to let events settle...
                        async (key, filename) => {
                            let f_data = await file_compress(filename) //removes mark
                            if (f_data) {
                                _file_map.set(key, f_data)
                            }
                        }
                        , config.watch_update_delay || 500
                        , key, config.static_parent + key)
                }
            }

        } else {
            console.log('watch event - filename not provided');
        }
    }

    watch(config.static_folder_path,
        { persistent: true, recursive: true },
        watch_fn
    );
}

const demo_page = (data) => {
    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html;charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="G9 Demo">
    <title>G9 - Demo</title>
    <link rel="icon" type="image/icon" href="/static/img/favicon.ico" />
    <link rel="stylesheet" href="/static/css/fontawesome-512-all.min.css">
    <link rel="stylesheet" href="/static/css/styles.css">
    <link rel="stylesheet" href="/static/css/app.css">
</head>
<body>

    <div id="container">
        <header>

            <!-- Banner
            <g9-banner data-g9-banner></g9-banner>-->

            <!-- Application Navigation
            <g9-appnav data-g9-template>
                <div style="height: 1rem; padding-block: var(--padding-m);"></div>
            </g9-appnav>-->

            <!-- Page specific navigation controls -->
            <nav id="page-nav" data-g9-on="click:handle_view">
                <span>Simple G9 Demo</span>
            </nav>

        </header>

        <main>
            <section id="page-content" style="padding-inline: var(--rem-05);">
                <div id="view_routes">${data.routes}</div>
                <div id="events">
                    <ul id="sse-event-list"></ul>
                </div>
            </section>

            <!-- Application Footer -->
            <g9-footer data-g9-template></g9-footer>
        </main>

        <!-- Modal placeholder -->
        <g9-modal data-g9-modal></g9-modal>

    </div>
</body>
<script>

    //listen for sse
    const evtSource = new EventSource('./sse/subscribe');

    evtSource.addEventListener("ping", (event) => {
        const li = document.createElement("li");
        const ul = document.getElementById("sse-event-list");
        const time = JSON.parse(event.data).time;
        li.textContent = "ping at " + time;
        ul.appendChild(li);
    });
</script>

</html>`
}

const routes_init = async (g9) => {

    const r = g9.router

    // compress files in these directories
    await compress_files(config.static_folder_path + 'htm')
    await compress_files(config.static_folder_path + '/css', true)
    await compress_files(config.static_folder_path + '/js')

    // assign custom 404 handler...
    r.not_found = do_not_found

    // illustrate route decoration and avoid session creation and/or mapping...
    r.get('/favicon.ico', do_favicon).session_create = false

    // illustrate common send_xxxx functions
    r.get('/json', do_json)
    r.get('/html', do_html)
    r.get('/text', do_text)
    r.get('/buffer', do_buffer)
    r.get('/file', do_file)

    // illustrate utf-8 in response and url
    r.get('/japanese', do_japanese)
    r.get('/emoji/🤣', do_emoji)

    // illustrate error response by forcing an error
    r.get('/error', do_force_error)

    // illustrate prepared response
    r.get('/prepared', async (req, res) => { res.prepare(200, {attr: 'yo!'}, send_json) })

    // illustrate parameters
    r.get('/parameter/:routevar:int', do_parameter)

    // middleware example
    r.get('/middleware', create_route_middleware_stack(r))

    // static file handling - and turn off session handling for static files...
    r.get('/static/*', do_static).session_create = false

    // get route info thus far and generate links
    let _htm = '';
    for (const inf of r.get_routes()) {
        _htm += /* html */`<p>
            <a class="link" href="${inf.url}">${inf.methods} ${inf.url} -> ${inf.handler || '(anonymous)'}</a>
        </p>`
    }

    // demo page handler
    r.get('/demo', async (req, res) => {
        send_html(res, 200, demo_page({routes : _htm }))
    })

    // illustrate SSE handlers
    r.get('/sse/subscribe', events_subscribe);

    //watch static folder for changes
    filewatch_init()
}

export {
    routes_init
}

/*
//Algo
Walk directory...
F stat and compress files into a map.
sort the map by filename?

*/

//Opt 1
//compress all into map
//during request - fstat and mark if changed
//timer event - iterate map - recompress changed...

//Opt 2
//compress all to disk
//during request - check if accept encoding exists - return it or uncompressed
//filewatch for changes - update disk (can happen in another process)

//Opt 3
//filewatch for changes - update map

//Opt 4
//filewatch for changes - mark map as dirty set delay timer - update map

/* Opt 5
//map everything in directories(s)
    below a certain threshold (64k) store the data
        images (not compressed)
        html, css, js, svg (compressed)
    above threshold
        keep fstat, mime, size...
        store the compressed version with '.{encoding}'
    when request comes
        check map
            - not found = not found
        found
            if data - send it.
            else stream file...

*/