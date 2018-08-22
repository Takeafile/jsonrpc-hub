const each = require('async/each')


function filterItself(item)
{
  return item !== this
}

function isError(error)
{
  return error instanceof Error
}


function relay(socket, callback)
{
  let sendId

  // Don't send `id` for incoming notifications
  if(this.id !== undefined)
  {
    sendId = socket._idCounter++

    socket._responses[sendId] = callback
  }

  // Overwrite message ID with the new one
  this.id = sendId

  socket.send(JSON.stringify(this))
}


module.exports = function(getId, allowBroadcast)
{
  const sockets = {}

  return async function(socket, request, next)
  {
    const responses = {}

    function onClose()
    {
      delete sockets[id]

      // Response with an error to the connections waiting an answer from the
      // one that have just clossed
      Object.values(responses).forEach(function(callback)
      {
        callback({code: -32300, message: 'Destination connection clossed'})
      })
    }

    function onMessage({data})
    {
      const reply = (error, result) =>
      {
        this.send(JSON.stringify({error, id, jsonrpc: '2.0', result}))
      }

      function resultBroadcast(error, data)
      {
        // This can't happen, but who knows...
        if(error) return reply(error)

        if(data.some(isError)
        {
          error =
          {
            code: -32400,
            data,
            message: 'There were errors delivering broadcast message'
          }

          data = null
        }

        reply(error, data)
      }

      function resultSingle(error, result)
      {
        // This can't happen, but who knows...
        if(error) return reply(error)

        result.id = id

        reply(null, result)
      }

      try {
        data = JSON.parse(data)
      }
      catch(e) {
        return reply({code: -32700, message: 'Invalid JSON'})
      }

      // `to` field on requests is a custom extension to JsonRPC specification
      const {id, jsonrpc, method, to} = data

      if(jsonrpc !== '2.0')
        return reply({code: -32600, message: `Invalid JsonRPC version '${jsonrpc}`})

      // Request
      if(method)
      {
        // Brodcast
        if(allowBroadcast && to === null)
          return each(Object.values(sockets).filter(filterItself, this),
          relay.bind(data), resultBroadcast)

        // Destination is not defined, or brodcast is not allowed
        if(to == null)
          return reply({code: -32602, message: 'Destination is required'})

        // Single destination
        const dest = sockets[to]
        if(dest) return relay.call(data, dest, resultSingle)

        return reply({code: -32300, message: `Unknown destination '${to}'`})
      }

      // Response
      const response = responses[id]
      if(!response) return

      delete responses[id]
      response(null, data)
    }


    try
    {
      const id = await getId(socket, request)

      sockets[id] = socket
    }
    catch(error)
    {
      if(next) return next(error)

      throw error
    }

    socket.addEventListener('close'  , onClose)
    socket.addEventListener('message', onMessage)

    socket._idCounter = 0
    socket._responses = responses
  }
}
