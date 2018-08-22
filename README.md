# JsonRPC hub

This server allow to relay bidirectional JsonRPC messages between clients
connected to it. The protocol use a extension of the standard JsonRPC 2.0 with
the addition of a `to` field to indicate the identifier of the destination
client. This makes it transparent to the parameters given to the calls. It also
provides support to send messages in broadcast by setting `null` as its value.
