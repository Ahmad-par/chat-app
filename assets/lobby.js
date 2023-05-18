const serverIP = ''
const socket = new WebSocket(`ws://${serverIP? serverIP: 'localhost'}:4000`)

let currList = []
let chatList = []
let currId = sessionStorage['id']? sessionStorage['id']: ''
let currName = sessionStorage['name']? sessionStorage['name']: ''
let offeredId;
let callShowRes = false
let chatMessages = null

socket.onopen = () => {
  console.log('connected to server')

  if (!sessionStorage['id']){
    socket.send(JSON.stringify({type: 'request-id', value: {name: currName}}))
  }else{
    socket.send(JSON.stringify({type: 'available-id', value: {id: currId, name: currName}}))
    document.getElementById('lobby').prepend(artiTemplate(currId, currName))
  }

  setTimeout(requestUsers, 1000)
}

socket.onclose = () => {
  sessionStorage['id'] = ''
  window.confirm("Connection to server closed. Please try again later")
}

socket.onmessage = (event) => {
  let msgObj = JSON.parse(event.data)

  if (msgObj.type === 'assign-id'){
    sessionStorage['id'] = msgObj.value
    currId = String(msgObj.value)
    document.getElementById('lobby').prepend(artiTemplate(currId, currName))
    return
  }
  
  if (msgObj.type === 'first-list'){
    currList = msgObj.firstList
    chatList = msgObj.chatList

    //find self user and transfer to end
    let selfUser = currList.find(u => u.id === Number(currId))
    currList = currList.filter(u => u.id !== Number(currId))
    currList.push(selfUser)

    renderChatList()
    renderPlayersList()
    // console.log(currList)
    return
  }

  if (msgObj.type === 'busy-user'){
    let modalObj = document.getElementById('request-chat')
    modalObj.querySelector('.response').innerHTML = 'Sorry, the user you want to talk to is busy!'
    modalObj.querySelector('.response').style.color = 'red'
    setTimeout(clearBusyReq, 2000, modalObj)
  }
}

window.addEventListener('load', () => {
  document.getElementById('lobby').addEventListener('click', lobbyClickHandler)
})

//Functions
function requestUsers(){
  socket.send(JSON.stringify({type: 'fetch-players'}))

  let requestModal = document.getElementById('request-chat')
  let responseModal = document.getElementById('response-chat')

  if (requestModal.style.display === '' || responseModal.style.display === ''){
    setTimeout(requestUsers, 1500)
  }else{
    setTimeout(requestUsers, 3000)
  }
}

function renderChatList(){
  let lobbyObj = document.getElementById('lobby')
  let chatObj = document.getElementById('playing')
  let chatModalObj = document.getElementById('chat-box')

  if (chatModalObj.style.display === '' && !chatList.find(u => String(u.id) === currId)){
    chatModalReturnStatus('on')
    setTimeout(() => {
      destroyChatModal()
      chatModalObj.style.display = 'none'
      document.body.style.overflow = ''
      document.getElementById('lobby').append(artiTemplate(currId, currName))
      chatModalReturnStatus('off')
    }, 2000)
  }

  chatList.forEach(({id}) => {
    if (String(id) === currId){
      if (offeredId){
        offeredId = null
        clearBusyReq(document.getElementById('request-chat'))
      }else if (document.getElementById('response-chat').style.display === ''){
        clearResModal()
      }
      if(chatModalObj.style.display === 'none'){
        chatModalObj.style.display = ''
        document.body.style.overflow = 'hidden'
        createChatModal()
        
        //add ESC event listener
        document.addEventListener('keydown', chatEscHandler)

        //add form submit listener
        chatModalObj.querySelector('form').addEventListener('submit', (e) => {
          e.preventDefault()
          let inputObj = e.target.querySelector('input')
          let inputVal = inputObj.value

          if (inputVal.trim()){
            let parObj = document.createElement('p')
            parObj.className = 'chat-self'
            parObj.innerHTML = '> ' + inputVal.trim()
            chatModalObj.querySelector('#chat-area').appendChild(parObj)
            socket.send(JSON.stringify({type: 'chat-message', senderId: currId, value: inputVal}))
            inputObj.value = ''

          }else{
            inputObj.style.borderColor = 'red'
          }
        })

        //add oninput listener
        chatModalObj.querySelector('input').addEventListener('focus', (e) => {
          e.preventDefault()
          e.target.style.outline = 'none'
        })

        chatModalObj.querySelector('input').addEventListener('input', (e) => {
          let labelObj = chatModalObj.querySelector('label')
          let inputVal = e.target.value
          labelObj.innerHTML = `${inputVal.length}/40`
          e.target.style.borderColor = ''
        })
        
      }else{
        //fetch latest messages
        chatMessages = chatList.find(u => u.chatWith === Number(currId)).messages
        // console.log(chatMessages)
        for (let i=0; i<chatMessages.length; i++){
          let parObj = document.createElement('p')
          parObj.className = 'chat-other'
          parObj.innerHTML = '> ' + chatMessages[i]
          chatModalObj.querySelector('#chat-area').appendChild(parObj)
        }
      }
    }
    if (lobbyObj.querySelector(`article[uniq-id="${id}"]`)){
      lobbyObj.removeChild(lobbyObj.querySelector(`article[uniq-id="${id}"]`))
    }
  })
  
  chatObj.innerHTML = ''
  for (let i=0; i < chatList.length; i++){
    if (i % 2 === 0){
      let arObj = document.createElement('article')
      let spObj_1 = document.createElement('span')
      spObj_1.setAttribute('uniq-id', chatList[i].id)
      spObj_1.innerHTML = `${chatList[i].name? chatList[i].name: `guest#${chatList[i].id}`}`
      let spObj_2 = document.createElement('span')
      spObj_2.setAttribute('uniq-id', chatList[i+1].id)
      spObj_2.innerHTML = `${chatList[i+1].name? chatList[i+1].name: `guest#${chatList[i+1].id}`}`
      arObj.appendChild(spObj_1)
      arObj.appendChild(spObj_2)
      chatObj.appendChild(arObj)
    }
  }
}

function renderPlayersList(){
  lobbyObj = document.getElementById('lobby')
  
  for (let el of lobbyObj.querySelectorAll('article')){
    if (el.getAttribute('uniq-id') !== currId){
      el.className = 'inactive'
    }
  }

  currList.forEach(({id, name, pending, requestedById, reCode, chatting}) => {
    // console.log(typeof id, typeof currId)
    if (chatting) return

    if (String(id) === currId){
      if (pending){
        lobbyObj.querySelector(`article[uniq-id="${currId}"]`).className += ' pending'
        if (requestedById && document.getElementById('response-chat').style.display === 'none'){
          let reName = lobbyObj.querySelector(`article[uniq-id="${requestedById}"]`).querySelector('span').innerHTML
          showResModal(reName, currId, String(requestedById))
        }
      }else{
        if (document.getElementById('response-chat').style.display === ''){
          // clearBusyReq(document.getElementById('response-chat'))
          clearResModal()
          lobbyObj.querySelector(`article[uniq-id="${currId}"]`).className = 'self-user'
        }
        if (offeredId){
          if (!lobbyObj.querySelector(`article[uniq-id="${offeredId}"]`).className.includes('pending')){
            if (reCode === -1){
              let resObj = document.getElementById('request-chat').querySelector('.response')
              resObj.innerHTML = 'Your request has been rejected!'
              resObj.style.color = 'red'
              setTimeout(()=>{
                resObj.innerHTML = ''
                resObj.style.color = ''
                clearBusyReq(document.getElementById('request-chat'))
                lobbyObj.querySelector(`article[uniq-id="${currId}"]`).className = 'self-user'
                offeredId = null
              }, 1000)
            }else{
              clearBusyReq(document.getElementById('request-chat'))
              lobbyObj.querySelector(`article[uniq-id="${currId}"]`).className = 'self-user'
              offeredId = null
            }
          }
        }
      }
      return
    }

    if (lobbyObj.querySelector(`article[uniq-id="${id}"]`)){
      if (pending){
        lobbyObj.querySelector(`article[uniq-id="${id}"]`).className = 'pending'
      }else{
        lobbyObj.querySelector(`article[uniq-id="${id}"]`).className = ''
      }

      if (name){
        lobbyObj.querySelector(`article[uniq-id="${id}"]`).querySelector('span').innerHTML = name
       }
    }else{
      lobbyObj.prepend(artiTemplate(id, name, pending))
    }
  })
}

function artiTemplate(id, name, pending=false){
  let arObj = document.createElement('article')
  let nameSpanObj = document.createElement('span')
  let cirSpanObj = document.createElement('span')
  let cirObj = document.createElement('div')

  arObj.className = String(id) === currId? 'self-user': `${pending? 'pending': ''}`
  arObj.setAttribute('uniq-id', id)
  nameSpanObj.innerHTML = `${name? name : `guest#${id}`}`
  cirObj.className = 'cir'
  cirSpanObj.append(cirObj)
  arObj.append(nameSpanObj)
  arObj.append(cirSpanObj)

  return arObj
  // return `<article uniq-id="${id}" class="${id === currId? self-user: ''}">
  //           <span>${name? name : `guest#${id}`}</span>
  //           <span><div class="cir"></div></span>
  //         </article>`
}

function lobbyClickHandler(event){
  if (event.target.tagName.toLowerCase() === 'section') return
  
  let arObj = event.target.parentElement

  if (arObj.className === 'self-user'){
    let userModalObj = document.getElementById('change-username')
    userModalObj.style.display = ''
    document.body.style.overflow = 'hidden'
    userModalObj.querySelector('input').value = arObj.querySelector('span').innerHTML
    document.addEventListener('keydown', escPressHandler)
    userModalObj.querySelector('form').addEventListener('submit', userFormHandler)
    return
  }

  if (arObj.className === ''){
    document.removeEventListener('keydown', escPressHandler)
    let requestedUser = arObj.querySelector('span').innerHTML
    let stWantedId = arObj.getAttribute('uniq-id')
    let userModalObj = document.getElementById('request-chat')
    userModalObj.querySelector('.user-placeholder').innerHTML = requestedUser
    userModalObj.querySelector('.user-placeholder').style.color = 'rgb(10,200,130)'
    userModalObj.style.display = ''
    document.body.style.overflow = 'hidden'
    userModalObj.querySelector('.yButton').setAttribute('wantedId', stWantedId)
    userModalObj.querySelector('.yButton').addEventListener('click', yesReqHandler)
    userModalObj.querySelector('.nButton').addEventListener('click', noReqHandler)
  }
}

function userFormHandler(event){
  event.preventDefault()
  let asObj = event.target.parentElement.parentElement
  let resObj = asObj.querySelector('.response')
  let inputVal = event.target.querySelector('input').value
  event.target.addEventListener('input', (e)=>{
    resObj.innerHTML = ''
  })
  if (/^[0-9a-zA-Z.$_]{5,}$/.test(inputVal)){
    resObj.innerHTML = ''
    document.removeEventListener('keydown', escPressHandler)
    asObj.style.display = 'none'
    document.body.style.overflow = 'visible'
    currName = inputVal
    sessionStorage['name'] = currName
    socket.send(JSON.stringify({type: 'update-name', value: {id: currId, name: currName}}))
    document.body.querySelector(`article[uniq-id="${currId}"`).querySelector('span').innerHTML = currName
  }else{
    resObj.innerHTML = 'INCORRECT USERNAME'
    resObj.style.color = 'red'
  }
}

function escPressHandler(e){
  if (e.key === 'Escape'){
    clearUsernameModal()
  }
}

function clearUsernameModal(){
  document.body.style.overflow = 'visible'
  document.getElementById('change-username').style.display = 'none'
  document.getElementById('change-username').querySelector('.response').innerHTML = ''
  document.removeEventListener('keydown', escPressHandler)
}

function noReqHandler(e){
  let asObj = e.target.parentElement.parentElement
  asObj.style.display = 'none'
  document.body.style.overflow = 'visible'
}

function yesReqHandler(e){
  let asObj = e.target.parentElement.parentElement
  let stWantedId = e.target.getAttribute('wantedId')
  offeredId = stWantedId;
  asObj.querySelector('.nButton').disabled = true
  asObj.querySelector('.yButton').disabled = true
  asObj.querySelector('.response').innerHTML = 'Your request has been sent. Please wait...'
  asObj.querySelector('.response').style.color = 'rgb(10,200,130)'
  socket.send(JSON.stringify({type: 'request-chat', wantedId: stWantedId, requestedById: currId}))
}

function clearBusyReq(modalObj){
  modalObj.querySelector('.nButton').disabled = false
  modalObj.querySelector('.yButton').disabled = false
  if (modalObj.querySelector('.response')){
    modalObj.querySelector('.response').innerHTML = ''
    modalObj.querySelector('.response').style.color = ''
  }
  modalObj.style.display = 'none'
  document.body.style.overflow = 'visible'
}

function clearResModal(){
  let userModalObj = document.getElementById('response-chat').querySelector('div')
  userModalObj.querySelector('.yButton').remove()
  userModalObj.querySelector('.nButton').remove()
  userModalObj.parentElement.style.display = 'none'
  document.body.style.overflow = 'visible'
}

function showResModal(name, wantedId, requestedById){
  if (document.getElementById('request-chat').style.display === ''){
    clearBusyReq(document.getElementById('request-chat'))
  }
  if (document.getElementById('change-username').style.display === ''){
    clearUsernameModal()
  }
  let userModalObj = document.getElementById('response-chat')
  let yButObj = document.createElement('button')
  yButObj.className = 'yButton'
  yButObj.innerHTML = 'YES'
  userModalObj.querySelector('div').appendChild(yButObj)

  let nButObj = document.createElement('button')
  nButObj.className = 'nButton'
  nButObj.innerHTML = 'NO'
  userModalObj.querySelector('div').appendChild(nButObj)
  // userModalObj.querySelector('.yButton').disabled = false
  // userModalObj.querySelector('.nButton').disabled = false
  userModalObj.querySelector('.user-placeholder').innerHTML = name
  userModalObj.querySelector('.user-placeholder').style.color = 'rgb(10,200,130)'
  userModalObj.style.display = ''
  document.body.style.overflow = 'hidden'

  let reqTimeout = setTimeout(() => {
    socket.send(JSON.stringify({type: 'request-timeout', wantedId, requestedById}))
  }, 10000)

  userModalObj.querySelector('.nButton').addEventListener('click', (e) => {
    clearTimeout(reqTimeout)
    socket.send(JSON.stringify({type: 'reject-request', wantedId, requestedById}))
    userModalObj.querySelector('.yButton').disabled = true
    userModalObj.querySelector('.nButton').disabled = true
  })

  userModalObj.querySelector('.yButton').addEventListener('click', (e) => {
    clearTimeout(reqTimeout)
    socket.send(JSON.stringify({type: 'check-requestedById', wantedId, requestedById}))
    userModalObj.querySelector('.yButton').disabled = true
    userModalObj.querySelector('.nButton').disabled = true

  })
}

function chatModalReturnStatus(st){
  let chatModalObj = document.getElementById('chat-box')
  let titleObj = chatModalObj.querySelector('h3')

  if (st === 'on'){
    titleObj.style.color = 'red'
    titleObj.innerHTML = 'Going back to lobby...'
    chatModalObj.querySelector('input').disabled = true
  }else if(st === 'off'){
    titleObj.style.color = ''
    titleObj.innerHTML = 'Chat Here! Press ESC to return to lobby.'
  }
}

function createChatModal(){
  let divObj = document.getElementById('chat-box').querySelector('div')
  chatMessages = []
  divObj.innerHTML += `<section id="chat-area">
                        </section>
                        <form>
                          <label>0/40</label><br/>
                          <input maxlength="40"/>
                        </form>`
}

function destroyChatModal(){
  let divObj = document.getElementById('chat-box').querySelector('div')
  divObj.querySelector('section').remove()
  divObj.querySelector('form').remove()
  document.removeEventListener('keydown', chatEscHandler)
  chatMessages = null
}

function chatEscHandler(e){
  if (e.key === 'Escape'){
    chatModalReturnStatus('on')
    socket.send(JSON.stringify({type: 'chat-return', returnId: currId}))
    document.removeEventListener('keydown', chatEscHandler)
  }
}