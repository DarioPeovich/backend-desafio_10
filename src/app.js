import express from 'express';
import { cartRouter } from './routes/carts.routes.js';
import { productRouter } from './routes/products.routes.js';
import { viewsRouter } from './routes/views.router.js';
import session from "express-session";
import sessionRouter from './routes/sessions.routes.js'
import passport from 'passport';
import { config } from './config/config.js';

import mongoose from 'mongoose';
import MongoStore from "connect-mongo";
import { engine } from "express-handlebars";
import { Server } from "socket.io";
import __dirname from "./utils.js";
//import viewsChatRouter from "./routes/views.chat.router.js"; //to do
import messagesModel from './dao/models/messages.model.js';
import inicializePassport from './config/passport.config.js';
import { checkRole } from './middleware/auth.js';


const PORT = config.server.port;     //8080;
let messages = [];

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended:true}));


const httpServer = app.listen(PORT, ()=>{console.log(`Servidor funcionando en el puerto: ${PORT}`);})

//Configurando handlebars
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", __dirname + "/views");


app.use(express.static(__dirname + "/public"));


//Configurando Mono Atlas
//const MONGO =  "mongodb+srv://dariofmpeovich:Cr2S8oiuOf1U9rzf@cluster0.zm3q7vj.mongodb.net/ecommerce";
//const connection = mongoose.connect(MONGO);  //pasado a dbConnections.js 09/02/24

const MONGO =  config.mongo.url;

app.use(session({
    store: new MongoStore({
        mongoUrl: MONGO,
        ttl:3600
    }),
    secret:config.session.secret,    //"CoderSecret",
    resave:false,
    saveUninitialized:false
}))

//Inicializacion de estrategias de autenticacion
inicializePassport()
app.use(passport.initialize());
app.use(passport.session());


//Rutas
app.use("/api/products", productRouter);
app.use("/api/carts", cartRouter);
app.use('/api/sessions', sessionRouter);

//Rutas views
app.use("/", viewsRouter);

//Configuracion websocket
const io = new Server(httpServer);

io.on("connection", (socket) => {
    
    socket.on("chat-message", async (data) => {

      messages.push(data);
      const message = {
        user: data.username,
        message: data.message,
      };

      const result = await messagesModel.create(message); //Se almacena el mensaje
      //let chats = await messagesModel.find();   //Si uso está funcion, trae todos los mensajes de chat antiguos
      io.emit("messages", messages);
    });

    socket.on("new-user", (username) => {
      socket.emit("messages", messages);
      socket.broadcast.emit("new-user", username);
    });
});