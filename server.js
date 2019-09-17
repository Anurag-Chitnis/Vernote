const express = require('express');
const app = express();
const mongoose = require('mongoose');
const ejs = require('ejs');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');

//Passport 
const passport = require('passport');
const session = require('express-session');
//config passport
require('./config/passport')(passport);

//Middleware
//Setting the view engine 
app.set('view engine', 'ejs');
//Rendering the static files
app.use('/static', express.static('static'))
//Using express layouts for partials in ejs
app.use(expressLayouts);
//using bodyparser for catching json data
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())
//Method Override
app.use(methodOverride('X-HTTP-Method-Override'))
app.use(methodOverride('_method'))

//Express session 
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
}))
app.use(passport.initialize());
app.use(passport.session());
const {authenticated} = require('./config/authenticated');

app.use((req,res,next) => {
    res.locals.user = req.user;
    next();
})

//Local Database Connection
mongoose.connect('mongodb://localhost/Notesvilla',{useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true })
    .then( () => console.log('Successfully Connected Mongodb'))
    .catch(err => console.log(err))

//@route - /
//@desc - This is a home route
//@type - PUBLIC
//@method - GET
app.get('/', (req,res) => {
    res.render('home');
});

//Importing Mongooose Schemas 
const User = require('./models/User');
const Note = require('./models/Note');

//@route - /register
//@desc - This is Register Route
//@type - PUBLIC
//@method - GET
app.get('/register', (req,res) => {
    res.render('register');
});

//@route - /register
//@desc - This Register Route
//@type - PUBLIC
//@method - POST
app.post('/register', (req,res) => {
    const {username, email, password, password2} = req.body;
    User.findOne({username})
        .then(user => {
            if(user) {
                return res.status(400).json({err: 'Username Already exists'});
            }
            if(password !== password2) {
                return res.status(400).json({err: 'Passwords Do not Match'});
            }
            const newUser = new User({
                username,
                email,
                password,
            });
            console.log(newUser.username + " " + newUser.email + " " + newUser.password);
            bcrypt.genSalt(10, (err, salt) => {
                bcrypt.hash(newUser.password, salt, (err,hash) => {
                    if(err) throw err;
                    newUser.password = hash;
                    newUser.save();
                })
            })
            res.redirect('/login');
        })
        .catch(err => console.log(err))
});

//@route - /login
//@desc - This Login Route
//@type - PUBLIC
//@method - POST
app.get('/login', (req,res) => {
    res.render('login');
});

//@route - /login
//@desc - This Login Route
//@type - PUBLIC
//@method - POST
app.post('/login', (req,res,next) => {
    passport.authenticate('local', {
        successRedirect: '/dashboard',
        failureRedirect: '/login'
    })(req,res,next);
});

//@route - /user/add
//@desc - This a route for add post
//@type - PUBLIC
//@method - POST
app.get('/dashboard',authenticated, (req,res) => {
    Note.find({user: req.user.id})
        .then(notes => {
            if(notes) {
                res.render('dashboard', {notes: notes, user: req.user});
            }
        })
        .catch(err => console.log(err))
});
//@route - /dashboard/:id
//@desc - This a route for delete Post
//@type - PRIVATE
//@method - DELETE

app.delete('/dashboard/:id',authenticated, (req,res) => {
    Note.deleteOne({_id: req.params.id})
        .then(success => {
            if(success) {
                res.redirect('/dashboard');
            }else {
                console.log('Error in else case of DeleteOne');
            }
        })
        .catch(err => console.log(err))
});

//@route - /post/add
//@desc - This a route for Rendering addPost Template
//@type - PRIVATE
//@method - GET

app.get('/post/add',authenticated, (req,res) => {
    res.render('addPost')
});

//@route - /post/add
//@desc - This a route for Adding Post
//@type - PRIVATE
//@method - POST

app.post('/post/add',authenticated, (req,res) => {
    console.log(req.body);
    const {title, description} = req.body;
    Note.findOne({title})
        .then(note => {
            if(note) {
                return res.status(400).json({err: 'note alredy exists'})
            }
            const newNote = new Note({
                user: req.user.id,
                title,
                description,
            }).save();
            res.redirect('/post/add');
        })
});

//@route - /post/edit/:id
//@desc - This a route for Rendering Edit post template
//@type - PRIVATE
//@method - GET

app.get('/post/edit/:id',authenticated, (req,res) => {
    console.log(req.params.id);
    Note.findById({_id: req.params.id})
        .then(note => {
            if(note) {
                res.render('editPost', {note: note})
            }
        })
        .catch(err => console.log(err))
});

//@route - /post/edit/:id
//@desc - This a route for Update Selected Post
//@type - PRIVATE
//@method - PUT

app.put('/post/edit/:id',authenticated, (req,res) => {
    console.log(req.body);
    Note.findOne({_id: req.params.id})
        .then(note => {
            if(note) {
                note.title = req.body.title;
                note.description = req.body.description;
                note.save();
                res.redirect('/dashboard');
            }
        })
});

//@route - /logout
//@desc - This a route for Logging Out user
//@type - PRIVATE
//@method - GET

app.get('/logout', (req,res) => {
    req.logOut();
    res.redirect('/');
});

//@route - *
//@desc - This is 404 Route
//@type - PUBLIC
//@method - GET
app.get('*', (req,res) => {
    res.render('404')
});


app.listen(3000, 'localhost', () => console.log('Server Started'))