const mongoose = require('mongoose');
const mysql = require('mysql');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const async = require('async');

let smtpTransport = nodemailer.createTransport({
	host : "smtp.gmail.com",
	port : 465,
	secure : true, 
    auth: {
        user: "jackieng168@gmail.com",
        pass: "Tkstks001"
	}, 
	tls:{
		rejectUnauthorized: false
	}
});



function sendEmailVerification(emailAddress, secretToken, callback)
{

	var link="http://localhost:3000/verify?id="+secretToken;
    var mailOptions={
		from : "jackieng168@gmail.com",
        to : emailAddress,
        subject : "Please confirm your Email account",
        html : "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>" 
	}

	console.log(mailOptions);
    smtpTransport.sendMail(mailOptions, function(error, response){
    	if(error){
            	console.log(error);
            	callback(error);
    	}else{
            console.log("Message sent: " + response.message);
			callback(error, response);
		}
	 });
	 
}

function executeSQL(sqlquery, callback)
{
	var con = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "Tks12345678", 
		database: "login_app"
	  });

	async.waterfall([
		function(callback_sql){

				con.connect(function(err) {
				if (err)
					{
					con.end();
					callback_sql(err);
					}
				else	
					callback_sql(null, con);
				});
		}, 
		function(con, callback_sql)
		{
			con.query(sqlquery, function(err, result) {
				if (!err)
				{
					con.end();
					callback_sql(null, result);
				}
				else
				{
					console.log('Error while performing Query. ' + err);
					con.end();
					callback_sql(err);
				  
				}
			});
		}],
		function(err, result)
		{
				callback(err, result);
		}
	);


}

module.exports.getUserByUsername = function(username, callback){
	
	var sqlQuery = "SELECT * FROM UserBasic WHERE UserId='" + username +"'";
	console.log(sqlQuery);
	
	executeSQL(sqlQuery, function(err, result){
		if(err)
		 { 
			 console.log("create newuser executeSQL error :" + err);
			 callback(err);
		 }
		 else 
		 {
			 console.log(result);
			 callback(err, result);
		 }
	});
}


module.exports.getUserByEmail = function(email, callback){
	
	var sqlQuery = "SELECT * FROM UserBasic WHERE Email='" + email +"'";
	console.log(sqlQuery);
	
	executeSQL(sqlQuery, function(err, result){
		if(err)
		 { 
			console.log("getUserByEmail error " + err);
			 callback(err);
		 }
		 else 
		 {
			 console.log(result);
			 callback(err, result);
		 }
	});

}


module.exports.getUserById = function(id, callback){

	//User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    	if(err) throw err;
    	callback(null, isMatch);
	});
}

module.exports.createUser = function(newUser, callback1)
{
	const secretToken = randomstring.generate(20);
			
	async.waterfall([
			function (callback) {

				bcrypt.genSalt(10, function(err, salt) {
					if(err)
						callback(err);

					bcrypt.hash(newUser.password, salt, function(err, hash) {
							if(err)
							   callback(err);
							else{
								newUser.password = hash;
								callback(null)
							}
					});
				});			
			},
			function (callback) {

				var sqlQuery = "INSERT INTO UserBasic (UserId, Name, Email, PassCodeHash, Language, AccountStatus, TypeID) VALUES ('" + newUser.username + "','" + newUser.name + "','"+ newUser.email + "','" + newUser.password +"','EN', 0 , 0)";
				executeSQL(sqlQuery, function(err, result){
					if(err)
						callback(err);
					else 
						callback(null);
					});

			},
			function (callback){

				var sqlQuery = "INSERT INTO EmailVerify (UserID, RandomString) VALUES ('" + newUser.username + "','" + secretToken + "')";
				console.log(sqlQuery);
				executeSQL(sqlQuery, function(err, result){
					if(err)
						callback(err);
					else 
						callback(null);
					});
			},
			function (callback){

				sendEmailVerification(newUser.email, secretToken, function(err, response)
				 {
					if(err) 
						callback(err);
					else
						callback(null, true);
				});
					 
			}],
			function (err, result){
				if (err)
				{
					console.log(err);
					callback(err);
				}
				else
				{
					console.log("Create User successfully");
					callback1(err, newUser);
				}

			});
}

module.exports.verifyEmailFunction = function(id, callback2){

	async.waterfall([
		function (callback){
			let sqlQuery = "SELECT * FROM EmailVerify WHERE RandomString='" + id +"'";
			console.log(sqlQuery);

			executeSQL(sqlQuery, function(err, sqlresult){
				if(err)
					callback(err);
				else 
				{
					if(sqlresult[0]!=null)
					{
						//console.log("sqlresult!=null");
						console.log(sqlresult);
						let User_ID=sqlresult[0].UserID;

						callback(null, User_ID, 0);
					}
					else 
						//callback(err);
						callback(null, null, null);

				}
			});
		},
		function(Verify_ID, userVerify, callback)
		{
			console.log("In Update AccountStatus, UserID : " + Verify_ID + ", userVerify = " + userVerify);
		
			if(Verify_ID !== null)
			{
			let verifyPromise = new Promise( (resolve, reject) =>{
				if(!userVerify)
				{
					let sqlQuery = "UPDATE UserBasic SET AccountStatus= 1 WHERE UserId='" + Verify_ID +"'";
					console.log(sqlQuery);
					executeSQL(sqlQuery, function(err, sqlresult){
						if(err)
							reject(err);
						else 
							resolve(true);
						
					});
				}
			});

			verifyPromise.then((UpdateResult) => {

				let sqlQuery = "DELETE FROM EmailVerify WHERE RandomString ='"+id+"'";
				executeSQL(sqlQuery, function(err, sqlresult){
					if(err)
						callback(err);
					else 
						callback(null, 1);
				});
			}).catch((VerifyErr)=> {
					callback(VerifyErr);

			}); 
			}
			else 
				callback(null,0);
		}], 
		function(err, result)
		{
			callback2(err, result);
		});

}