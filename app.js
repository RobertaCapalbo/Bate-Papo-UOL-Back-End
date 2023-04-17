import express from "express"
import cors from "cors"
import {MongoClient} from 'mongodb';
import dotenv from "dotenv"
import dayjs from "dayjs"
import joi from "joi"

const app = express()


app.use(express.json())
app.use(cors())
dotenv.config()

let db

const mongoClient = new MongoClient(process.env.DATABASE_URL)
mongoClient.connect()
    .then(() => db = mongoClient.db())
    .catch((err) => console.log(err.message))

app.post("/participants", async (req, res) => {
        const { name } = req.body;
        const statusDate = Date.now();
        const pSchema = joi.object({
            name: joi.string().min(1).required()
        });
        const validate = pSchema.validate(req.body);
        if (validate.error) {
            return res.status(422).send(error.details[0].message);
        }
        const double = await db.collection('participants').findOne({name});
        if((double)){
        return res.sendStatus(409);
    };
    try {
        const newMessage = {
            from: name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs(statusDate).format('HH:mm:ss')
        }
        await db.collection("messages").insertOne(newMessage)
        res.status(201).send("Tudo certo")
    }
    catch (err) { return res.status(500).send(err.message) }
})

app.get("/participants", async (req, res) => {
    try {
        const participants = await db.collection("participants").find().toArray()
        res.send(participants)
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})
app.get("/messages", async (req, res) => {
    const {user} = req.headers;
    let limit = parseInt(req.query.limit);
    if(limit === 0 || isNaN(limit) || limit && limit < 0){
    return res.sendStatus(422)
    }
    try {
        const messages = await db.collection("messages").find({
            $or: [
                { to: "Todos" },
                { to: user },
                { from: user }
            ]
        }).toArray()
        if (limit) res.status(200).send(messages.slice(-limit))
        else res.status(200).send(messages)
    }
    catch (err) {
        return res.send(err.message)
    }
})


app.post('/status', async (req, res) => {
    let {user} = req.headers;
    if (user === "" || !user) return res.sendStatus(404)
    const participant = await db.collection('participants').findOne({name: user});
    if(!participant){
        return res.sendStatus(404); 
    };
    const st = Date.now();
    try {
        const att = await db.collection('participants').updateOne({name: user}, {$set: st});
        if (!att) return res.sendStatus(404)
        res.sendStatus(200);
    } catch (error) {
        res.sendStatus(500);
    };
});


setInterval(async () => {
    const participants = await db.collection('participants').find().toArray();
  
    participants.forEach(async participant => {
      if (Date.now() - participant.lastStatus > 10000) {
        await db.collection('participants').deleteOne({ _id: participant._id });
        await db.collection('messages').insertOne({
          from: participant.name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format('HH:mm:ss')
        });
      }
    });
  }, 15000);


app.listen(5000, (req,res) => {
    console.log('Listening on port 5000');
});
