const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const socketIO = require('socket.io');
require('dotenv').config();
const db = require('./config/db_connection');
const userModel = require('./models/users');
const { generateToken, verifyTokenMiddleware } = require('./middlewares/jwt');
const PORT = process.env.PORT || 4000;


const app = express();
const server = http.createServer(app);
const io = socketIO(server);
let connectedUsers = 0;


app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



io.on('connection', (socket) => {
    connectedUsers++;
    console.log(`User connected, socket id: ${socket.id}`);
    
    if (connectedUsers === 2) {
        io.emit('secondUserJoined');  // Notify all clients when the second user joins
    }

    socket.on('signalingMessage', (message) => {
        socket.broadcast.emit('signalingMessage', message);
    });

    socket.on('disconnect', () => {
        connectedUsers--;  // Decrement count on user disconnect
        console.log(`User disconnected, socket id: ${socket.id}`);
        socket.broadcast.emit('userDisconnected');  // Notify all clients when a user disconnects
    });
    

    socket.on('new_message', function(rcvd_msg){
        socket.broadcast.emit('msg_from_server', rcvd_msg);
    });
});





// Routes
app.get('/', verifyTokenMiddleware, function(req, res) {
    res.render('videocall');
})

app.post('/login', async function (req, res) {
    try {
        const { username, password } = req.body;

        const user = await userModel.findOne({ username });
        if (!user) return res.send('Incorrect username/password.');

        const isPasswordMatch = await user.comparePassword(password);   // job-1: D
        if (isPasswordMatch) {
            const payload = { email: user.username, id: user.id };
            const token = generateToken(payload);                   // job-2
            res.cookie('token', token);
            res.redirect('/');
        } else {
            res.send('Incorrect username/password.');
        }
    } catch (err) {
        res.send('Error foundd : ' + err);
    }

});

app.post('/signup', async function (req, res) {
    const { name, username, password} = req.body;

    try {
        const user = await userModel.findOne({ username: username });
        if (user) return res.send('User already exists.');

        const createdUser = await userModel.create({
            name: name,
            username: username,
            password: password,
        });

        const payload = { email: createdUser.username, id: createdUser.id };
        const token = generateToken(payload);
        res.cookie('token', token);
        res.redirect('/');
    } catch (err) {
        res.send('Error found : ' + err);
    }
})

app.get('/callended', (req, res) => {
    res.render('thankyou');
})



server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
