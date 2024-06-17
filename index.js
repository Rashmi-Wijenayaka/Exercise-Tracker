const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to DB successfully.");
  })
  .catch((error) => {
    console.error("Error connecting to the database", error);
  });

const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true,
  },
  
}, { versionKey: false });

const User = mongoose.model('User', userSchema);

const exerciseSchema = mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
  userId: String
}, { versionKey: false });
const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(cors())
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/api/users", async (req, res) => {
  const users = await User.find();
  res.send(users);
});

app.post("/api/users", async (req, res) => {
  const username = req.body.username;
  const foundUser = await User.findOne({ username });

  if (foundUser){
    res.json(foundUser);
  }

  const user = await User.create({
    username,
  });

  res.json(user);
});

app.get('/api/users/:_id/logs', async (req, res)=>{
  let { from, to, limit } = req.query;
  const userId = req.params._id;
  const foundUser = await User.findById(userId);

  if (!foundUser) {
    res.json({ message: 'No user exists for that id '});
  }

  let filter = { userId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date['$gt'] = new Date(from);
    if (to) filter.date['$lt'] = new Date(to);
  }

  if (!limit) {
    limit = 100;
  }

  let exercises = await Exercise.find(filter).limit(limit);
  exercises = exercises.map((exercise) => {
    return {
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
    }
  });

  res.json({
    username: foundUser.username,
    count: exercises.length,
    _id: userId,
    log: exercises,
  });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
   const id = req.params._id;
   const { description, duration, date } = req.body;

   try{
     const user = await User.findById(id);
     if(!user){
      res.send("Could not find user")
     } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })
      const exercise = await exerciseObj.save();
      res.json({
        _id: user._id,
        username: user.usrname,
        description: exercise.description,
        duration: exercise.duration,
        date: new Date(exercise.date).toDateString()
      })
     }
   }catch(err){
      console.log(err);
      res.send("There was an error saving the exercise");
   }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
