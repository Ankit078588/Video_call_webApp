const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URL)
.then(function(){
    console.log('Database connected!');
}).catch(function(err) {
    console.log('DB connection error :- ', err);
})


module.exports = mongoose.connection;