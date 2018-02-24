var express = require('express');
var router = express.Router();
var path = require('path');

var watson = require('watson-developer-cloud');
var fs = require('fs');
var config = require('../config.json');

var exec = require('child-process-promise').exec;

//var spawn = require("child_process").spawn;
var spawn = require('child_process').spawn;

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});
router.get('/results', function(req, res, next){
	res.render('results');
});

router.get("/error", function(req, res, next){
	res.render('error');
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


	console.log("> spawning fetchTwitterData.py");
	var twitter_data = spawn('python', ["fetchTwitterData.py",
		req.body.twitter_handle,
		100
	]);
	console.log("> waiting for fetchTwitterData.py to complete");
	twitter_data.on('close', function (data) {
		console.log(">> fetchTwitterData.py completed!");

		var pathToTwitterData = path.join(__dirname, "../", twitter_data.pid + '.json');
		
		console.log("> reading fetchTwitterData.py output");
		fs.readFile(pathToTwitterData, 'utf-8', function (err, text) {
			if (err) console.log(err);
			console.log("> spawning google_cloud.py");
			var google_cloud = spawn('python', [
				"google_cloud.py",
				path.join(__dirname, "../"+twitter_data.pid+".json")
			]);

			console.log("> spawning computeLikes.py");
			var computeLikes = spawn('python', [
				"computeLikes.py",
				path.join(__dirname, "../" + twitter_data.pid + ".json")
			]);
			
			console.log("> creating data object");
			data = JSON.parse(text);	
			data.at = req.body.twitter_handle;
			data.pp = data.profile_picture_url;

			console.log("> computing tweet frequency");
			var first_date = {
				year: parseInt(data.direct_tweets[0].date.substring(0, 4)),
				month: parseInt(data.direct_tweets[0].date.substring(5, 7)),
				day: parseInt(data.direct_tweets[0].date.substring(8))
			}

			var last_date = {
				year: parseInt(data.direct_tweets[data.direct_tweets.length - 1].date.substring(0, 4)),
				month: parseInt(data.direct_tweets[data.direct_tweets.length - 1].date.substring(5, 7)),
				day: parseInt(data.direct_tweets[data.direct_tweets.length - 1].date.substring(8))
			}

			var frequencyScore = 0;
			frequencyScore += 365*Math.abs(first_date.year - last_date.year);
			frequencyScore += 30*Math.abs(first_date.month - last_date.month);
			frequencyScore += 1*Math.abs(first_date.day - last_date.day);

			frequencyScore = (frequencyScore != 0) ? 100/frequencyScore : 100;

			console.log(frequencyScore);

			var ready = false;
			var pathToComputeLikes;
			var pathToGoogleCloud;
		
			console.log("> async: waiting for google_cloud.py to finish");
			google_cloud.on("close", function(google_cloud_data){
				pathToGoogleCloud = path.join(__dirname, "../", google_cloud.pid + '.txt');

				console.log("> reading google_cloud.py output");
				fs.readFile(pathToGoogleCloud, 'utf-8', function(err, text){
					if (err) console.log(err);					
					data.emotion = text;
					console.log("> data.emotion set to "+data.emotion);
				});
				console.log("> finish ready state is "+ready);
				if (ready){
					console.log("> deleting extra files");
					fs.unlink(pathToComputeLikes, function (err) {
						if (err) console.log(err);
					});
					fs.unlink(pathToGoogleCloud, function (err) {
						if (err) console.log(err);
					});
					fs.unlink(pathToTwitterData, function (err) {
						if (err) console.log(err);
					});
					
					console.log("> rendering results");
					return res.render("results", data);
				}
				else{
					console.log("> setting 'finish ready to true");					
					ready = true;
				}

			});

			console.log("> async: waiting for computeLikes.py to finish");			
			computeLikes.on("close", function(compute_likes_data){
				pathToComputeLikes = path.join(__dirname, "../", computeLikes.pid + '.json');
				
				console.log("> reading computeLikes.py output");				
				fs.readFile(pathToComputeLikes, 'utf-8', function (err, text) {
					if (err) console.log(err);
					console.log("text: " + text);
					text = JSON.parse(text);
					data.likes = text.likes;
					console.log("> data.likes is set to " + data.likes);
					data.dislikes = text.dislikes;
					console.log("> data.dislikes is set to " + data.likes);
				});
						

				console.log("> finish ready state is " + ready);				
				if (ready) {
					console.log("> deleting extra files");
					fs.unlink(pathToComputeLikes, function (err) {
						if (err) console.log(err);
					});
					fs.unlink(pathToGoogleCloud, function (err) {
						if (err) console.log(err);
					});
					fs.unlink(pathToTwitterData, function (err) {
						if (err) console.log(err);
					});

					console.log("> rendering results");
					return res.render("results", data);
				}
				else {
					console.log("> setting finish ready to true");										
					ready = true;
				}

			});



		});

	});
	

	//console.log(data);
	// exec('python ' + "fetchTwitterData.py" + " " + req.body.twitter_handle + " " + 300, function (err, stdout, stderr) {
	// 	// process.stdout.on(‘data’, function (data) {
	// 	// 	res.send(data.toString());
	// 	// });


	// 	res.send(stdout);

	// 	// console.log('python compute.py');
	// 	// exec('python compute.py')
	// 	// 	.then(function (result) {
	// 	// 		console.log("Data computed !");
	// 	// 		var data = require('../dataDump');
	// 	// 		var mentions = require('../data');
	// 	// 		data.mentions = mentions.top_mentions;
	// 	// 		data.pp = mentions.profile_picture_url;
	// 	// 		data.at = req.body.twitter_handle;
	// 	// 		console.log(data.pp);
	// 	// 		res.render("results", data);
	// 	// 	})
	// 	// 	.catch(function (err) {
	// 	// 		console.error('ERROR: ', err);
	// 	// 	});
	// 	//res.redirect("error");
	// })
	// .catch(function (err) {
	// 	console.error('ERROR: ', err);
	// });
});

// router.post('/twitterdata', function(req, res, next) {

// 	console.log(req.body);
// 	res.render("error");

// });

module.exports = router;
