const http = require('http');
const wsServer = require('websocket').server;
const static = require('node-static')
const lobbyTemplate = require('./utility/lobbyTemplate')
const file = new static.Server('./assets')

//Variables declaration
const serverIP = ''
const serverAddress = `http://${serverIP}:4000`
const origins = ['http://localhost:4000', serverAddress]
let playerCount = 0
let firstList = []
let chatList = []

//Functions


//HTTP Server
const server = http.createServer((req, res) => {
  file.serve(req, res)
  if (req.url === '/'){
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.write(lobbyTemplate())
    res.end()
  }

  // if (req.url === '/chat'){
  //   res.writeHead(200, {'Content-Type': 'text/plain'})
  //   res.write('Welcome to Chat Page')
  //   res.end()
  // }
})
server.listen(4000, ()=>{
  console.log('Server listening...')
})

//WebSocket Logic
const webSockServer = new wsServer({
  httpServer: server,
  autoAcceptConnections: false
})

webSockServer.on('request', (request) => {
  if (!origins.some(o => o === request.origin)){
    request.reject()
    console.log('Connection from origin ' + request.origin + ' rejected.')
    return
  }
  const connection = request.accept()

  connection.on('message', (message) => {
    let msgObj = JSON.parse(message.utf8Data)

    if (msgObj.type === 'request-id'){
      playerCount += 1
      firstList.push({'id': playerCount, 'name': msgObj.value.name, pending: false})
      console.log(firstList)
      connection['playerCount'] = playerCount
      connection.send(JSON.stringify({type: 'assign-id', value: playerCount}))
      return
    }

    if (msgObj.type === 'available-id'){
      firstList.push({id: Number(msgObj.value.id), name: msgObj.value.name, pending: false})
      connection['playerCount'] = Number(msgObj.value.id)
      // console.log(firstList)
      return
    }

    if (msgObj.type === 'fetch-players'){
      connection.send(JSON.stringify({type: 'first-list', firstList, chatList}))
      let userObj = chatList.find(u => u.chatWith === connection['playerCount'])
      if (userObj){
        if (userObj.messages.length > 0){
          userObj.messages = []
        }
      }
    }

    if (msgObj.type === 'update-name'){
      firstList = firstList.map(({id, name, pending}) => {
        if (Number(msgObj.value.id) === id){
          return {id, name: msgObj.value.name, pending}
        }else{
          return {id, name, pending}
        }
      })
      return
    }

    if (msgObj.type === 'request-chat'){
      let wantedUser = firstList.find(({id}) => id === Number(msgObj.wantedId))
      if (wantedUser){
        if (wantedUser.pending){
          connection.send(JSON.stringify({type: 'busy-user'}))
        }else{
          firstList = firstList.map((user) => {
            switch (user.id){
              case Number(msgObj.wantedId):
                return {...user, pending: true, requestedById: Number(msgObj.requestedById)}
              case Number(msgObj.requestedById):
                return {...user, pending: true, reCode: Number(msgObj.wantedId)}
              default:
                return user
            }
          })
        }
      } 
      console.log(firstList)
      return
    }

    if (msgObj.type === 'request-timeout'){
      firstList = firstList.map(user => {
        if (user.id === Number(msgObj.wantedId) || user.id === Number(msgObj.requestedById)){
          return {id: user.id, name: user.name, pending: false}
        }else{
          return user
        }
      })
      console.log(firstList)
      return
    }

    if (msgObj.type === 'reject-request'){
      firstList = firstList.map(u => {
        switch (u.id){
          case Number(msgObj.wantedId):
            return {id: u.id, name: u.name, pending: false}
          case Number(msgObj.requestedById):
            return {id: u.id, name: u.name, pending: false, reCode: -1}
          default:
            return u
        }
      })
      return
    }

    if (msgObj.type === 'check-requestedById'){
      let requestingUser = firstList.find(u => u.id === Number(msgObj.requestedById))

      if (requestingUser){
        requestingUser = {...requestingUser, chatWith: requestingUser.reCode, messages: []}
        delete requestingUser.reCode
        chatList.push(requestingUser)

        let wantedUser = firstList.find(u => u.id === Number(msgObj.wantedId))
        wantedUser = {...wantedUser, chatWith: wantedUser.requestedById, messages:[]}
        delete wantedUser.requestedById
        chatList.push(wantedUser)

        firstList = firstList.map(user => {
          if (user.id === Number(msgObj.wantedId) || user.id === Number(msgObj.requestedById)){
            return {...user, chatting: true}
          }else{
          return user
          }
        })
        
        console.log('chat list', chatList)
        console.log('first list', firstList)
      }else{
        firstList = firstList.map(u => {
          if (u.id === Number(msgObj.wantedId)){
            return {id: u.id, name: u.name, pending: false}
          }else{
            return u
          }
        })
      }
      return
    }

    if (msgObj.type === 'chat-message'){
      let userObj = chatList.find(u => u.id === Number(msgObj.senderId))
      if (userObj){
        userObj.messages.push(msgObj.value)
      }
      // console.log(chatList)
      return
    }

    if (msgObj.type === 'chat-return'){
      chatList = chatList.filter(user => user.id !== Number(msgObj.returnId) && user.chatWith !== Number(msgObj.returnId))

      firstList = firstList.map(user => {
        switch(Number(msgObj.returnId)){
          case user.id:
            return {id: user.id, name: user.name, pending: false}
          case user.reCode:
            return {id: user.id, name: user.name, pending: false}
          case user.requestedById:
            return {id: user.id, name: user.name, pending: false}
          default:
            return user 
        }
      })
    }
    
  })
  connection.on('close', () =>{
    console.log('Closing...')
    let quitterId = connection['playerCount']

    if (chatList.find(u => u.id === quitterId)){
      chatList = chatList.filter(user => user.id !== quitterId && user.chatWith !== quitterId)

      firstList = firstList.map(user => {
        switch(quitterId){
          case user.id:
            return
          case user.reCode:
            return {id: user.id, name: user.name, pending: false}
          case user.requestedById:
            return {id: user.id, name: user.name, pending: false}
          default:
            return user
        }
      }).filter(u => u !== undefined)
    }else{
      let quitUser = firstList.find(u => u.id === quitterId)
      if (quitUser && quitUser.pending && quitUser.requestedById){
        firstList = firstList.map(u => {
          if (u == quitUser){
            return
          }else if (u.id === quitUser.requestedById){
            return {id: u.id, name: u.name, pending:false}
          }
          else{
            return u
          }
        }).filter(u => u !== undefined)
      }else{
        firstList = firstList.filter(u => u.id !== quitterId)
      }
    }
 
    console.log(firstList)
    connection.close()
  })
  
})