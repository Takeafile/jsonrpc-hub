const each = require('async/each')


function relay(socket, callback)
{
  let sendId

  // Don't send `id` for incoming notifications
  if(this.id !== undefined)
  {
    sendId = socket._idCounter++

    socket._responses[sendId] = callback
  }

  this.id = sendId

  socket.send(this)
}


module.exports = function(getId, allowBroadcast)
{
  const sockets = {}

  return async function(socket, request)
  {
    const responses = {}

    function onClose()
    {
      delete sockets[id]

      // Response with an error to the connections waiting an answer from the
      // one that have just clossed
      Object.values(responses).forEach(function(callback)
      {
        const error = {code: -32300, message: 'Destination connection clossed'}

        callback(null, {error, id, jsonrpc: '2.0'})
      })
    }

    function onMessage({data})
    {
      let error

      try {
        data = JSON.parse(data)
      }
      catch(e) {
        error = {code: -32700, message: 'Invalid JSON'}
      }

      // `to` field on requests is a custom extension to JsonRPC specification
      const {id, jsonrpc, method, to} = data

      if(jsonrpc !== '2.0')
        error = {code: -32600, message: `Invalid JsonRPC version '${jsonrpc}`}

      // Request
      else if(method)
      {
        // Brodcast
        if(allowBroadcast && to === null)
          return each(Object.values(sockets).filter(item => item !== socket),
          relay.bind(data), function(error, results)
          {
            // This can't happen, but who knows...
            if(error) return socket.send(error)

            if(results.some(item => item instanceof Error))
            {
              error = new Error('There was errors delivering broadcast message')
              error.code = 0
              error.data = results
            }
            else
              var result = results

            socket.send({error, id, jsonrpc: '2.0', result})
          })

        // Destination is not defined, or brodcast is not allowed
        if(to == null)
          error = {code: -32602, message: 'Destination is required'}

        // Single destination
        else
        {
          const dest = sockets[to]
          if(dest) return relay.call(data, dest, function(error, result)
          {
            // This can't happen, but who knows...
            if(error) return socket.send(error)

            result.id = id

            socket.send(result)
          })

          error = {message: `Unknown destination '${to}'`}
        }
      }

      // Response
      else
      {
        const response = responses[id]
        if(response)
        {
          delete responses[id]

          return response(null, data)
        }
      }

      socket.send({error, id, jsonrpc: '2.0'})
    }


    const id = await getId(socket, request)

    sockets[id] = socket

    socket.addEventListener('close'  , onClose)
    socket.addEventListener('message', onMessage)

    socket._idCounter = 0
    socket._responses = responses
  }
}
