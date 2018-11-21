[![Build Status](https://travis-ci.org/Takeafile/jsonrpc-hub.svg?branch=master)](https://travis-ci.org/Takeafile/jsonrpc-hub)
[![Coverage Status](https://coveralls.io/repos/github/Takeafile/jsonrpc-hub/badge.svg?branch=master)](https://coveralls.io/github/Takeafile/jsonrpc-hub?branch=master) [![Greenkeeper badge](https://badges.greenkeeper.io/Takeafile/jsonrpc-hub.svg)](https://greenkeeper.io/)

# JsonRPC hub

This server allow to relay bidirectional JsonRPC messages between clients
connected to it. The protocol use a extension of the standard JsonRPC 2.0 with
the addition of a `to` field to indicate the identifier of the destination
client. This makes it transparent to the parameters given to the calls. It also
provides support to send messages in broadcast by setting `null` as its value.

## How it works

This module export a function that when called will generate a handler function
for the `connection` event of the WebSocket server objects created with the
[ws](https://www.npmjs.com/package/ws) module.

Internally, connections are registered so incoming data can be send to the
corresponding destination. Destination is identified with a `to` field, besides
that data are plain JsonRPC messages.

## Install

```sh
npm install jsonrpc-hub
```

## API

- *options*
  - *allowBroadcast*: enable to send messages to all the other connections
  - *getId*: function to get the connection identifier. By default, it's used
    the connection `url`.
  - *timeout*: milliseconds before a request is responsed as failed. Disabled by
    default

## CLI

`cli` makes use of [unify-config](https://github.com/piranna/unify-config), so
all the API options are available as command line arguments or environment
variables.

```sh
jsonrpc-hub --allowBroadcast --timeout 5000
```
