const each = require('async/each')


/**
 * Default function to get connection ID, using the Request URL
 */
function defaultGetId(socket, {url})
{
  return url
}

function filterItself(item)
{
  return item !== this
}

function isError(error)
{
  return error instanceof Error
}


/**
 * Send `data` to the provided `socket` and call `callback` on responses
 */
function relay(socket, callback)
{
  const {data, sender, timeout} = this

  let sendId

  // Don't send `id` for incoming notifications
  if(data.id !== undefined)
  {
    sendId = socket._idCounter++

    if(timeout)
      response.timeout = setTimeout(
        doResponse.bind(socket),
        timeout,
        sendId,
        {code: -32300, message: 'Timeout waiting response from destination'}
      )

    // Store the callback, sender and timeout to call on the matching response
    socket._responses[sendId] = {callback, sender, timeout}
  }

  // Overwrite message ID with the new one and reset destination
  data.id = sendId
  delete data.to

  // Send the data to its destination
  socket.send(JSON.stringify(data))
}

function removePendingResponses({_responses})
{
  Object.entries(_responses).forEach(function([id, {sender}])
  {
    if(sender === this) delete _responses[id]
  }, this)
}

function doResponse(id, error, data)
{
  const {_responses} = this

  const response = _responses[id]
  if(!response) return console.warn(`Received unexpected response '${id}'`)

  delete _responses[id]

  clearTimeout(response.timeout)
  response.callback(error, data)
}

function responseDestinationClossed(id)
{
  const error = {code: -32300, message: 'Destination connection clossed'}

  doResponse.call(this, id, error)
}


/**
 * Conections factory
 */
module.exports = function({allowBroadcast, getId = defaultGetId, timeout} = {})
{
  const sockets = {}

  return function(socket, request, next)
  {
    const responses = {}

    return Promise.resolve(getId(socket, request))
    .then(function(id)
    {
      sockets[id] = socket

      function onClose()
      {
        delete sockets[id]

        // Response with an error to the connections waiting an answer from the
        // one that have just clossed
        Object.keys(responses).forEach(responseDestinationClossed, this)

        // Remove pending responses from other connections to this one, since
        // they will not be delivered
        Object.values(sockets).forEach(removePendingResponses, this)
      }

      function onMessage({data})
      {
        const reply = (error, result) =>
        {
          this.send(JSON.stringify({error, id, jsonrpc: '2.0', result}))
        }

        function resultBroadcast(error, data)
        {
          if(error || !data.some(isError)) return reply(error, data)

          reply({
            code: -32400,
            data,
            message: 'There were errors delivering broadcast message'
          })
        }

        try {
          data = JSON.parse(data)
        }
        catch(e) {
          return reply({code: -32700, message: 'Invalid JSON'})
        }

        // `to` field on requests is a custom extension to JsonRPC specification
        const {error, id, jsonrpc, method, result, to} = data

        if(jsonrpc !== '2.0')
          return reply({code: -32600, message: `Invalid JsonRPC version '${jsonrpc}`})

        // Request
        if(method)
        {
          // Brodcast
          if(allowBroadcast && to === null)
            return each(Object.values(sockets).filter(filterItself, this),
                        relay.bind({data, sender: this, timeout}),
                        resultBroadcast)

          // Destination is not defined, or brodcast is not allowed
          if(to == null)
            return reply({code: -32602, message: 'Destination is required'})

          // Single destination
          const dest = sockets[to.slice(to.indexOf('/'))]
          if(dest) return relay.call({data, sender: this, timeout}, dest, reply)

          // Unknown destination
          return reply({code: -32300, message: `Unknown destination '${to}'`})
        }

        // Response
        doResponse.call(this, id, error, result)
      }


      socket.addEventListener('close'  , onClose)
      socket.addEventListener('message', onMessage)

      socket._idCounter = 0
      socket._responses = responses
    },
    function(error)
    {
      if(next) return next(error)

      throw error
    })
  }
}
