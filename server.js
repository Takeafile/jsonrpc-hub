#!/usr/bin/env node

const {Server} = require('ws')

const onConnection = require('.')


const config = require('unify-config')()


new Server(config).on('connection', onConnection(config.connection))
