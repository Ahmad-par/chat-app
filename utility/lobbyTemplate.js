
module.exports = () => `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8"/>
    <title>lobby</title>
    <link rel="stylesheet" href="lobby.css"/>
  </head>
  <body>
  <aside id="change-username" style="display: none;">
      <div>
        <p>Choose a username then press SELECT:</p>
        <p>Username should be at least 5 characters long and can contain letters, numbers, "_", "$" and "."</p>
        <form action="">
          <input/><br/>
          <button type="submit">SELECT</button>
        </form>
        <p class="response"></p>
      </div>
    </aside>
    <aside id="request-chat" style="display: none;">
      <div>
        <p>Do you want to chat with <b class="user-placeholder">guest#45</b> ?</p>
        <button class="yButton">YES</button>
        <button class="nButton">NO</button>
        <p class="response"></p>
      </div>
    </aside>
    <aside id="response-chat" style="display: none;">
      <div>
        <p>User <b class="user-placeholder">guest#56</b> has invited you to a chat. Do you accept it?</p>
      </div>
    </aside>
    <aside id="chat-box" style="display: none;">
      <div>
        <h3>Chat Here! Press ESC to return to lobby.</h3>
      </div>
    </aside>
    <main>
      <section id="lobby">
        
      </section>
      <section id="playing">
        
      </section>
    </main>
    <script src="lobby.js"></script>
  </body>
    
</html>`