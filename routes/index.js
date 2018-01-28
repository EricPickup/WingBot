var express = require('express');
var router = express.Router();
var path = require('path');

var watson = require('watson-developer-cloud');
var fs = require('fs');
var config = require('../config.json');

//var spawn = require("child_process").spawn;
var spawn = require('child_process').spawn;

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});
router.get('/results', function(req, res, next){
	res.render('results');
});

router.get('/watson', function(req, res, next){
	console.log(config.IBM.api_key);
	var visual_recognition = watson.visual_recognition({
		api_key: config.IBM.api_key,
		version: 'v3',
		version_date: '2016-05-20'
	});
	var params = {
		images_file: fs.createReadStream(path.join(__dirname, '../public/images/eric.jpg'))
	}
	visual_recognition.detectFaces(params,
		function(err, response) {
			if (err)
				console.log(err);
			else
				console.log(JSON.stringify(response, null, 2));
		}
	);
	res.send("ok!");
});

router.post('/fetchTwitterData', function(req, res, next){
	console.log("fetching data...");
	var process = spawn('python', [path.join(__dirname, "../fetchTwitterData.py"), req.body.twitter_handle, 1000]);
	process.on('error', function (err) {
		console.log(err);
	});
	process.on('close', function(code, signal){
		console.log("Code: "+code);
		console.log("signal: "+signal);
		var process2 = spawn('python2.7', [path.join(__dirname, "../compute.py")]);
		process2.on('error', function(err){
			console.log(err);
		});
		process2.on('close', function(c, r){
			console.log("code: "+c);
			console.log("status: "+s);
			console.log("Data computed !");
			var data = require('../dataDump');
			var mentions = require('../data');
			data.mentions = mentions.top_mentions;
			data.pp = mentions.profile_picture_url;
			data.at = req.body.twitter_handle;
			console.log(data.pp);
			res.render("results", data);
		});
	});
	// exec("python "+path.join(__dirname, "../fetchTwitterData.py")+" "+req.body.twitter_handle+" 10", function(err, stdout, stderr){
	// 	if (err){
	// 		console.error('error while fetching tweets');
	// 		res.send("error")
	// 	}
	// 	console.log("done.");
	// 	res.redirect("/results");
	// });
});

router.get('/moose', function(req, res, next){
	req.setTimeout(0);
	var process2 = spawn('python', [path.join(__dirname, "../compute.py")]);
	process2.stdout.on('data', function (data) {
		console.log(data);
		res.redirect("/results");
	});
});

module.exports = router;
