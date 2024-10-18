require("dotenv").config();
const express=require("express");
const mongoose=require("mongoose");
const bodyParser  = require("body-parser");
const session=require("express-session");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const passportlocalmongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");

const app=express();
const port=4400;
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");

app.set('trust proxy', 1) ;
app.use(session({
  secret: 'Oursecret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB",{useNewUrlParser:true});
//mongoose.set("useCreateIndex", true);
const UserSchema= new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});

UserSchema.plugin(passportlocalmongoose);
UserSchema.plugin(findOrCreate);
const user= new mongoose.model("user",UserSchema);

passport.use(new LocalStrategy(user.authenticate()));
passport.serializeUser(function(user, done) {
    done(null, user.id);
});
 
passport.deserializeUser(async function(id, done) {
    try {
        const founduser = await user.findById(id);
        done(null,founduser);
    } catch (error) {
        done(error, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:4400/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    user.findOrCreate({ googleId: profile.id }, function (err, userr) {
      return cb(err, userr);
    });
  }
));

app.get("/",(req,res)=>{
    res.render("home.ejs");
});

app.get("/auth/google",passport.authenticate("google",{scope:['profile']})
);
app.get("/auth/google/secrets", passport.authenticate("google", { failureRedirect: "/login",successRedirect:"/secrets" }));
app.get("/login",(req,res)=>{
    res.render("login.ejs");
});
app.get("/register",(req,res)=>{
    res.render("register.ejs");
});
app.get("/secrets",(req,res)=>{
    if(req.isAuthenticated()){
    res.render("secrets.ejs");
    }else{
        res.redirect("/login");
    }
});
app.get("/logout",(req,res)=>{
    req.logout(function(){
        res.redirect("/");
    }); 
});

app.post("/register",async (req,res)=>{
    user.register({username:req.body.username},req.body.password,function(err,users){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
            res.redirect("/secrets");
           }) ;
        }
    });
});
app.post("/login",async (req,res)=>{
    const User=new user({
        username:req.body.username,
        password:req.body.password
    });
    req.login(User,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            }) ; 
        }
    })
});
app.listen(port,()=>{
    console.log("Running at port "+port);
});