# chat-app

This text-based chat application allows you to communicate with other users on the same network. The application contains an upper list(lobby) where each connected user has an entry. If you click on your own entry you can choose a username and if you click on other entries you can invite them to a conversation. The lower list of the app contains a row for every pair of users chatting with each other.

After downloading the source code you should go to application folder and run 'npm install' to intall dependencies.(nodejs and npm are required)

You can test this program locally with no need to make changes. Run 'npm start' to get server up and running, then you can open multiple browser tabs and connect to 'localhost' on port '4000'. Every browser tab represents an individual network user.

If you want to test this application on a real network you need to set the 'serverIP' constant in 'index.js' and 'assets/lobby.js' to IP address of the server. Run 'npm start' to enable users on the same network communicate with each other.
