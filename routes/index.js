var express = require('express');
var router = express.Router();
var User = require('../models/user');
var querystring = require('querystring');

// Get Homepage
router.get('/', ensureAuthenticated, function(req, res){
	res.render('index');
});

router.get('/verify', verifyEmail, function(req,res){
	res.redirect("/users/login");
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.redirect('/users/login');
	}
}

function verifyEmail(req, res, next){
    User.verifyEmailFunction(req.query.id, (err, result) => {
		console.log("total update result = " + result);
		if(result)
		{
			req.flash('success_msg', 'Your email address is verified and can now login');
			next();
		}
		else
		{
			req.flash('error_msg', 'Cannot find your email address with the verification code');
			next();
		}
		
	});

}

module.exports = router;