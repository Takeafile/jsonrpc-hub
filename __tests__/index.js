const jsonrpcHub = require('..')


class HalfSocket
{
  constructor(upgradeReq, other)
  {
    this.upgradeReq = upgradeReq

    if(other)
    {
      this._other = other
      other._other = this
    }
  }

  addEventListener(name, func)
  {
    this[name] = func.bind(this)
  }

  close(code, reason)
  {
    // setImmediate(this['close'])
  }

  send(data)
  {
    setImmediate(this._other['message'], {data})
  }
}


test('basic', function(done)
{
  const half11 = new HalfSocket(1)
  const half12 = new HalfSocket(1, half11)

  const half21 = new HalfSocket(2)
  const half22 = new HalfSocket(2, half21)

  half22.addEventListener('message', function({data})
  {
    data = JSON.parse(data)

    expect(data).toEqual({id: 0, jsonrpc: '2.0', method: 'foo'})

    this.send(JSON.stringify({id: data.id, jsonrpc: '2.0', result: 'bar'}))
  })

  half11.addEventListener('message', function({data})
  {
    data = JSON.parse(data)

    expect(data).toEqual({id: 123, jsonrpc: '2.0', result: 'bar'})

    done()
  })

  const hub = jsonrpcHub()

  Promise.all([
    hub(half12, {url: '1'}),
    hub(half21, {url: '2'})
  ])
  .then(function()
  {
    half11.send(JSON.stringify({id: 123, jsonrpc: '2.0', method: 'foo', to: '2'}))
  })
})
