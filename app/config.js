'use strict';

const config = {

    session: {
        cookie: 'g9-sid', //session cookie name
        ttl: 1000 * 2, // two seconds (development testing)
        schedule: 1000 * 60, //in ms (5 minutes)
    },
    date_format: {
        weekday: 'narrow',
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: 'numeric',
        fractionalSecondDigits: 3,
        hour12: true,
        timeZone: 'EST'
    },
    csrf: true,
    date_formatter : { locale : 'en-US' },
    hostname: '127.0.0.1',
    port: 8080,
    api_prefix: '/api/',
    watch_update_delay: 500,
    static_parent: './public',
    static_prefix: '/static/',
    static_folder_path: './public/static/',
    upload_dir: './public/static/uploads/',
}

export { config }