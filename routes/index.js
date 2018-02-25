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
	res.render('index');
});
router.get('/results', function(req, res, next){
	res.render('results');
});

router.get("/error", function(req, res, next){
	res.render('error');
});

// router.get('/watson', function(req, res, next){
// 	console.log(config.IBM.api_key);
// 	var visual_recognition = watson.visual_recognition({
// 		api_key: config.IBM.api_key,
// 		version: 'v3',
// 		version_date: '2016-05-20'
// 	});
// 	var params = {
// 		images_file: fs.createReadStream(path.join(__dirname, '../public/images/eric.jpg'))
// 	}
// 	visual_recognition.detectFaces(params,
// 		function(err, response) {
// 			if (err)
// 				console.log(err);
// 			else
// 				console.log(JSON.stringify(response, null, 2));
// 		}
// 	);
// 	res.send("ok!");
// });

router.post('/fetchTwitterData', function(req, res, next){


	console.log("> spawning fetchTwitterData.py");
	console.log(req.body);
	req.body.handle = req.body.handle.replace("@", "");
	var tweetLimit = 20;
	var twitter_data = spawn('python', ["fetchTwitterData.py",
		req.body.handle,
		tweetLimit
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
			data.at = req.body.handle;
			data.pp = data.profile_picture_url;

			console.log("> formatting chart data");
			data.chart = {
				type: 'line',
				data: {
					labels: [],
					datasets: [{
						label: '# of Votes',
						data: [12, 19, 3, 5, 2, 3],
						backgroundColor: [
							'rgba(255, 99, 132, 0.2)',
							'rgba(54, 162, 235, 0.2)',
							'rgba(255, 206, 86, 0.2)',
							'rgba(75, 192, 192, 0.2)',
							'rgba(153, 102, 255, 0.2)',
							'rgba(255, 159, 64, 0.2)'
						],
						borderColor: [
							'rgba(255,99,132,1)',
							'rgba(54, 162, 235, 1)',
							'rgba(255, 206, 86, 1)',
							'rgba(75, 192, 192, 1)',
							'rgba(153, 102, 255, 1)',
							'rgba(255, 159, 64, 1)'
						],
						borderWidth: 1
					}]
				},
				options: {
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero: true
							}
						}]
					}
				}

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
	
});

module.exports = router;
