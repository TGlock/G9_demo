"use strict";

import { G9 } from '../G9/g9.js'
import { config } from './app/config.js'
import { routes_init } from './app/app.js'

// create G9
const g9 = new G9(config)

// init routes
await routes_init(g9)

// listen
g9.listen().then().catch((err) => {
    g9.logger.error('Unable to start server.')
})