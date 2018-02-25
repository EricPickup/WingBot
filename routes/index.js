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

	var data;
	console.log("> spawning fetchTwitterData.py");
	console.log(req.body);
	req.body.handle = req.body.handle.replace("@", "");
	var tweetLimit = 80;
	var playCV = true;
	var twitter_data = spawn('python', ["fetchTwitterData.py",
		req.body.handle,
		tweetLimit
	]);
	console.log("> waiting for fetchTwitterData.py to complete");
	twitter_data.on('close', function (twitter_data_data) {
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

			console.log("> spawning classifyText.py");
			var classifyText = spawn('python', [
				"classifyText.py",
				path.join(__dirname, "../" + twitter_data.pid + ".json")
			]);
			
			console.log("> creating data object");
			data = JSON.parse(text);
			data.at = req.body.handle;
			data.pp = data.profile_picture_url;
			if (data.images.length <= 0) playCV = false;
			if (!playCV) console.log("no cv");
			console.log(data.images.length);

			if (playCV){
				console.log("> spawning Playground");
				console.log(data.images);
				var imageUrls = data.images.map(function(image){
					return image.URL;
				});
				console.log(imageUrls);
				var Playground = spawn('../image-analysis/Playground', imageUrls);
			}

			// console.log("> formatting chart data");

			// var labels = [];
			// var values = [];
			// var dayCount = -1;

			// data.direct_tweets.forEach(function(tweet){
			// 	let day = tweet.date.substring(0, 10);
			// 	let index = labels.indexOf(day);
			// 	if (index == -1){
			// 		labels.push(day);
			// 		values.push(1);
			// 	}
			// 	else{
			// 		values[index]++;
			// 	}
			// });

			// data.chart = {
			// 	type: 'line',
			// 		data: {
			// 		labels: labels,
			// 			datasets: [{
			// 				label: '# of Tweets / Day',
			// 				data: values,
			// 				backgroundColor: [
			// 					'rgba(255, 99, 132, 0.2)',
			// 					'rgba(54, 162, 235, 0.2)',
			// 					'rgba(255, 206, 86, 0.2)',
			// 					'rgba(75, 192, 192, 0.2)',
			// 					'rgba(153, 102, 255, 0.2)',
			// 					'rgba(255, 159, 64, 0.2)'
			// 				],
			// 				borderColor: [
			// 					'rgba(255,99,132,1)',
			// 					'rgba(54, 162, 235, 1)',
			// 					'rgba(255, 206, 86, 1)',
			// 					'rgba(75, 192, 192, 1)',
			// 					'rgba(153, 102, 255, 1)',
			// 					'rgba(255, 159, 64, 1)'
			// 				],
			// 				borderWidth: 1
			// 			}]
			// 	},
			// 	options: {
			// 		scales: {
			// 			yAxes: [{
			// 				ticks: {
			// 					beginAtZero: true
			// 				}
			// 			}]
			// 		}
			// 	}
			// }

			var one = false;
			var two = false;
			var three = false;
			var cv = false;
			if (!playCV) cv = true;

			var pathToComputeLikes;
			var pathToGoogleCloud;

			if (playCV){
				Playground.on("close", function (dt) {
					cv = true;


					data.cv = {}
					data.cv.playground_PID = Playground.getpid();
					data.cv.photos = []
					fs.readdir(path.join(__dirname, "../public/images/", Playground.getpid(), "/Faces"), function(err, pictures){
						pictures.forEach(function(pic){
							data.cv.photos.append({
								url: path.join("/images/", Playground.getpid(), "/Faces/", pic)
							});
						});
					});



					if (one && two && three && cv) {
						console.log("> rendering results");
						if (pathToClassifyText) {
							fs.unlink(pathToClassifyText, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToGoogleCloud) {
							fs.unlink(pathToGoogleCloud, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToComputeLikes) {
							fs.unlink(pathToComputeLikes, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToTwitterData) {
							fs.unlink(pathToTwitterData, function (err) {
								if (err) console.log(err);
							});
						}
						console.log(data);

						return res.render("results", data);
					}
				});
			}
		
			console.log("> async: waiting for google_cloud.py to finish");
			google_cloud.on("close", function(google_cloud_data){
				pathToGoogleCloud = path.join(__dirname, "../", google_cloud.pid + '.txt');

				console.log("> reading google_cloud.py output");
				fs.readFile(pathToGoogleCloud, 'utf-8', function(err, text){
					if (err) console.log(err);					
					data.emotion = text;
					console.log("> data.emotion set to "+data.emotion);
					one = true;
					if (one && two && three && cv) {
						console.log("> rendering results");
						if (pathToClassifyText) {
							fs.unlink(pathToClassifyText, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToGoogleCloud) {
							fs.unlink(pathToGoogleCloud, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToComputeLikes) {
							fs.unlink(pathToComputeLikes, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToTwitterData) {
							fs.unlink(pathToTwitterData, function (err) {
								if (err) console.log(err);
							});
						}
						console.log(data);

						return res.render("results", data);
					}
				});

				
			});

			console.log("> async: waiting for computeLikes.py to finish");			
			computeLikes.on("close", function(compute_likes_data){
				pathToComputeLikes = path.join(__dirname, "../", computeLikes.pid + '.json');
				
				console.log("> reading computeLikes.py output");				
				fs.readFile(pathToComputeLikes, 'utf-8', function (err, text) {
					if (err) console.log(err);
					text = JSON.parse(text);
					data.likes = text.likes;
					console.log("> data.likes is set to " + data.likes);
					data.dislikes = text.dislikes;
					console.log("> data.dislikes is set to " + data.dislikes);
					console.log(data);
					
					two = true;

					if (one && two && three && cv) {
						console.log("> rendering results");
						if (pathToClassifyText) {
							fs.unlink(pathToClassifyText, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToGoogleCloud) {
							fs.unlink(pathToGoogleCloud, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToComputeLikes) {
							fs.unlink(pathToComputeLikes, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToTwitterData) {
							fs.unlink(pathToTwitterData, function (err) {
								if (err) console.log(err);
							});
						}

						console.log(data);
						return res.render("results", data);
					}
				});
						

				
			});

			console.log("> async: waiting for classifyText.py to finish");
			classifyText.on("close", function (classify_text_data) {
				pathToClassifyText = path.join(__dirname, "../", classifyText.pid + '.json');

				console.log("> reading classifyText.py output");
				fs.readFile(pathToClassifyText, 'utf-8', function (err, text) {
					if (err) console.log(err);
					data.categories = JSON.parse(text).categories;
					console.log(data.categories);
					three = true;
					if (one && two && three && cv) {
						console.log("> rendering results");
						if (pathToClassifyText) {
							fs.unlink(pathToClassifyText, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToGoogleCloud) {
							fs.unlink(pathToGoogleCloud, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToComputeLikes) {
							fs.unlink(pathToComputeLikes, function (err) {
								if (err) console.log(err);
							});
						}
						if (pathToTwitterData) {
							fs.unlink(pathToTwitterData, function (err) {
								if (err) console.log(err);
							});
						}
						console.log(data);

						return res.render("results", data);
					}
				});

				
			});

			
			

		});

	});
	
});

module.exports = router;
