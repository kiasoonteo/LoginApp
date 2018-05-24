var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');
var User = require('../models/user');
const async = require('async');

// Register
router.get('/register', function (req, res) {
	res.render('register');
});

// Login
router.get('/login', function (req, res) {
	res.render('login');
});



// Register User
router.post('/register', function (req, res) {
	var name = req.body.name;
	var email = req.body.email;
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;

	// Validation
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if (errors) {
		res.render('register', {
			errors: errors
		});
	}
	else
	{

		let reflashObj={
			status: 'success_msg',
			msg: ''
		};
		let redirect_link=null;


		async.waterfall([
			function(regCallback) {
				let duplicateUser=0;
				let duplicateEmail=0;
				let duplicateCheck= new Promise((resolve, reject) => {
					User.getUserByUsername(name, (err, result)=>{
						if(err)
						{
							reject(err);
						}
						else
						{
							console.log("Duplicate User : " + result.length);
							duplicateUser=result.length;
							resolve(result.length);
	
						}
					});
				});
			
				duplicateCheck.then((checkResult)=>{
					if(checkResult!==0)
						{
							var userExistErr = new Error("User exists, please check");
							regCallback(null, checkResult, 0);
						//	resolve(true);
							//resolve(userExistErr);
							//reject(null);
						}
					else{
						User.getUserByEmail(email, (err, result)=>{
							if(err)
							{
								reject(err);
							}
							else
							{
								console.log("Duplicate email : " + result.length);
								duplicateEmail=result.length;
								regCallback(null, duplicateUser, duplicateEmail);
							//	regCallback(null, checkResult, duplicateEmail);
							//resolve(true);
							}
						});
					}
				}).catch((checkDupErr) => {
					if(checkDupErr)
						{
							reflashObj.status='error_msg';
							reflashObj.msg='System temp down, please try again later';
							redirect_link='/users/register';
							regCallback(checkDupErr);
						}
				});

			//regCallback(null, duplicateUser, duplicateEmail);
		}, 
		function(duplicateUser, duplicateEmail,regCallback) {
			console.log("duplicateUser = " + duplicateUser + " duplicateEmail = " + duplicateEmail);
			if(duplicateUser)
				{
					reflashObj.status='error_msg';
					reflashObj.msg='UserId exists, please check';
					redirect_link='/users/register';
					let duplicateUserErr = new Error('Duplicate UserId');
					regCallback(duplicateUserErr);

				}
			else if(duplicateEmail)
				{
					reflashObj.status='error_msg';
					reflashObj.msg='Email Address exists, please check';
					redirect_link='/users/register';
					let duplicateEmailErr = new Error('Duplicate Email');
					regCallback(duplicateEmailErr);


				}	
			else
			{
				let registerPromise = new Promise((resolve, reject) => {
			
				if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] ==='' || req.body['g-recaptcha-response'] === null)
				{
					const captchaErr = new Error("reCaptcha Error");
					reject(captchaErr);
				}
				else
				{

					const secretKey = '6Lf-AFoUAAAAAG8Ghnz4KIw7ZEic69b-qSggU3WV';
					const verifyUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'];
					console.log(verifyUrl);

					request(verifyUrl, (err, response, body) =>{
						if(err)
						{
							reject(err);
						}
						else
						{
							body = JSON.parse(body);
							if(body.success !== undefined && !body.success)
							{
								const captchaErr = new Error("reCaptcha Error");
								reject(captchaErr);
							}
							else
							{
								resolve(true);
							}
						}

					});
				}
			});	

			registerPromise.then((result) =>{
				var newUser = {
					name: name,
					email: email,
					username: username,
					password: password
				};

				User.createUser(newUser, function (err, user) {
					if (err) throw err;
					console.log(user);

					req.flash('success_msg', 'Please proceed to email verification');
					res.redirect('/users/login');
					regCallback(null);
				});
			}).catch(function(captchaErr) 
			{
				reflashObj.status='error_msg';
				reflashObj.msg='reCaptcha failed, please try again';
				redirect_link='/users/register';
				let reCaptchaErr = new Error('reCaptcha failed');
				regCallback(reCaptchaErr);
					/*
				req.flash('error_msg', 'reCaptcha failed, please try again');
				res.redirect('/users/register');*/
			});
			}
		 }], 
		 function (err)
		 {
			if(err)
			{
				req.flash(reflashObj.status, reflashObj.msg);
				res.redirect(redirect_link);
			}
		 });
		
  }
  console.log("end of Register POST");
});

passport.use(new LocalStrategy(
	{passReqToCallback: true},

	function (req, username, password, done) {
		
		let loginPromise = new Promise((resolve, reject) => {
			if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] ==='' || req.body['g-recaptcha-response'] === null)
			{
				const captchaErr = new Error("reCaptcha Error");
				reject(captchaErr);
			}
			else
			{
				const secretKey = '6Lf-AFoUAAAAAG8Ghnz4KIw7ZEic69b-qSggU3WV';
				const verifyUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + secretKey + "&response=" + req.body['g-recaptcha-response'];
			
				request(verifyUrl, (err, response, body) =>{
					if(err)
					{
						reject(err);
					}
					else
					{
						body = JSON.parse(body);
						console.log("Captcha backend request body " + body);
						if(body.success !== undefined && !body.success)
						{
							const captchaErr = new Error("reCaptcha Error");
							reject(captchaErr);
						}
						else
							resolve(username);
					
					}
				});
			}
		});	//loginPromise ended
		
		loginPromise.then((loginResult) => {
			if(loginResult === false)
				return done(null, false, { message: 'reCaptura error'});

			User.getUserByUsername(username, function (err, result) {
				if (err) 
				{
					return done(null, false, {message : 'System temp down, please try again later'});
					//throw err;
				}
				if(result[0]!=null)
				{
					var ServerPassCodeHash = result[0].PassCodeHash;
					var AccountStatus = result[0].AccountStatus;
				}
				
				if(AccountStatus === 0 || AccountStatus == null)
				{
					return done(null, false, {message : 'Please complete email verification'});
				}

				if(ServerPassCodeHash !=null)
					{
						User.comparePassword(password, ServerPassCodeHash, function (err, isMatch) {
							if (err) 
								return done(null, false, {message : 'System temp down, please try again later'});
								//throw err;
							if (isMatch)
							{
								var user =
								{ 
							  		id: result[0].UserId,
							  		name: result[0].Name
								};

								return done(null, user);
							} else 
								return done(null, false, { message: 'Invalid password' });
						});
					}
				else
					return done(null, false, { message: 'Unknown User'});
			});  //end of getUserByUsername
		 }).catch((captchaErr) => {
			    console.log("inside loginPromise.catch");
				return done(null, false, {message: 'reCaptcha failed'});
			}
		); //end of login then-catch function
		
	})); //end of passport.authentication callback function

passport.serializeUser(function (user, done) {
	console.log("serializeUser " + user.id );
	done(null, user.id);
});

passport.deserializeUser(function (id, done) {
	console.log("deserializeUser");
	done(null, id);
//	User.getUserById(id, function (err, user) {
//		done(err, user);
//	});
});

router.post('/login',
	passport.authenticate('local', { successRedirect: '/', failureRedirect: '/users/login', failureFlash: true }),
	function (req, res) {
		console.log("redirect..");
		res.redirect('/');
	});

router.get('/logout', function (req, res) {
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

module.exports = router;