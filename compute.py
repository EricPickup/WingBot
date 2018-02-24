import json
import re
import subprocess

from watson_developer_cloud \
 import NaturalLanguageUnderstandingV1

from watson_developer_cloud.natural_language_understanding_v1 \
  import Features, EntitiesOptions, KeywordsOptions, EmotionOptions

'''
Function: stripPunctuation
Desc: Strips any punctuation from a word
Input: Word to be stripped
Output: Stripped word
'''
def stripPuncuation(word):

	regex = re.compile('[^a-z A-Z]')
	word = regex.sub('', word)
	return word


'''
Function: isNoun
Desc: Searches for current word in the noun wordbank
Input: Word to be searched
Output: True if the word is in the noun wordbank
'''
def isNoun(word):
	for noun in nouns:
		regexString = r"^" + re.escape(word) + r"\s"
		if re.search(regexString, noun, re.IGNORECASE):
			return True

'''
Function: findKeywords
Desc: Finds each noun in a tweet and keeps track of the frequency of the nouns
Input: Tweet
Output: List of most frequently mentioned nounds
'''
def findKeywords(data):

	keywordsDict = {}
	nouns = [str] * 20
	freq = [0] * 20

	for tweet in data["direct_tweets"]:
		tmp = stripPuncuation(tweet["text"]);
		for word in tmp.split():
			if(isNoun(word)):
				if word in keywordsDict:
					keywordsDict[word] += 1
				else:
					keywordsDict[word] = 1

	for key, value in keywordsDict.items():
		f = min(freq)
		if (key not in nouns and value > f):
			i = freq.index(f)
			nouns[i] = key
			freq[i] = value

	for i in range(len(nouns)):
			nouns[i] = nouns[i].encode('ascii')

	return nouns


'''
Function: searchEmotions
Desc: Uses the Watson API to determine the user's emotions from each one of their tweets
Input: data - dictionary containing all tweets
		words - list of top keywords
Output: Returns the rating of user's emotions
'''
def searchEmotions(data, words):

	emotionData = {}
	emotionData['anger'] = 0
	emotionData['joy'] = 0
	emotionData['sadness'] = 0
	emotionData['fear'] = 0
	emotionData['disgust'] = 0

	anger = 0 
	joy = 0 
	sadness = 0 
	fear = 0 
	disgust = 0
	tot = 0

	config = json.load(open('config.json'))["IBM"] 

	natural_language_understanding = NaturalLanguageUnderstandingV1(
	  username= config["username"],
	  password= config["password"],
	  version='2017-02-27')

	for tweet in data["direct_tweets"]:
		tmp = tweet["text"]
		try:
			response = natural_language_understanding.analyze(
			  html=tmp,
			  features=Features(
			    emotion=EmotionOptions(
			      targets=words)))

			#Overall Emotions from tweets
			emote = response['emotion']['document']['emotion']
			anger += emote['anger']
			joy += emote['joy']
			sadness += emote['sadness']
			fear += emote['fear']
			disgust += emote['disgust']
			tot += 1
			#-----------------------------
		except:

			continue	
	#Overall Emotions from tweets
	if tot > 0:
		emotionData['anger'] = anger/tot
		emotionData['joy'] = joy/tot
		emotionData['sadness'] = sadness/tot
		emotionData['fear'] = fear/tot
		emotionData['disgust'] = disgust/tot

	#-----------------------------

	return emotionData


'''
Function: searchByKeyword
Desc: Checks the most frequently used nouns and determines the emotions based off of those specific words
Input: data - dictionary containing all tweets/tweet data
Output: Returns list of each word with their associating emotions
'''
def searchByKeyword(data, words):

	keyWordData = {}
	keyWordData['words'] = {}

	for i in range(20):
		keyWordData['words'][i] = {}
		keyWordData['words'][i]['val'] = words[i]
		keyWordData['words'][i]['anger'] = 0
		keyWordData['words'][i]['joy'] = 0
		keyWordData['words'][i]['sadness'] = 0
		keyWordData['words'][i]['fear'] = 0
		keyWordData['words'][i]['disgust'] = 0
		keyWordData['words'][i]['tot'] = 0
		

	natural_language_understanding = NaturalLanguageUnderstandingV1(
	  username='b2600595-97a5-4a8a-a9c4-0df0daaff8e8',
	  password='AEJpTBE0MUDX',
	  version='2017-02-27')

	#Calculating emotions for each keyword
	for tweet in data["direct_tweets"]:
		tmp = tweet["text"]
		try:
			response = natural_language_understanding.analyze(
			  html=tmp,
			  features=Features(
			    emotion=EmotionOptions(
			      targets=words)))

			emote = response['emotion']['targets']

			#Adding emotion rating for each type of emotion for each keyword
			for e in emote:
				tmp = e['text']
				currentWordInList = keyWordData['words'][words.index(tmp)]
				currentWordInList['anger'] += e['emotion']['anger']
				currentWordInList['joy'] += e['emotion']['joy']
				currentWordInList['sadness'] += e['emotion']['sadness']
				currentWordInList['fear'] += e['emotion']['fear']
				currentWordInList['disgust'] += e['emotion']['disgust']
				currentWordInList['tot'] += 1

		except:
			continue

	for i in range(20):
		keyWordEmotions = keyWordData['words'][i]
		if(keyWordData['words'][i]['tot'] != 0):
			keyWordEmotions['anger'] /= keyWordEmotions['tot']
			keyWordEmotions['joy'] /= keyWordEmotions['tot']
			keyWordEmotions['sadness'] /= keyWordEmotions['tot']
			keyWordEmotions['fear'] /= keyWordEmotions['tot']
			keyWordEmotions['disgust'] /= keyWordEmotions['tot']
	
	return keyWordData


'''
Function: getLikes
Desc: Uses the emotion data of the top keywords to determine which ones were joyful/unpleasant to store the likes and dislikes of the user
Input: keywords - list of top 20 nouns with their associating emotions
Output: Fills the list of likes/dislikes
'''
def getLikes(keywords, likes, dislikes):

	for i in range(20):
		if(max(keywords['words'][i]['anger'], keywords['words'][i]['joy'], keywords['words'][i]['sadness'],
			keywords['words'][i]['fear'], keywords['words'][i]['disgust']) == keywords['words'][i]['joy']):
			likes.append(keywords['words'][i]['val'])
		else:
			dislikes.append(keywords['words'][i]['val'])



d = open("data.json", "r")

file = open("nouns.txt","r").readlines()
nouns = {}
for f in file:
	nouns[f] = 0

data = json.loads(d.read())
keys = findKeywords(data)
print(keys)
emotes = searchEmotions(data, keys)
keywords = searchByKeyword(data, keys)

person = {}
person['single'] = False
person['emotions'] = {}
person['emotions']['anger'] = emotes['anger']
person['emotions']['joy'] = emotes['joy']
person['emotions']['sadness'] = emotes['sadness']
person['emotions']['fear'] = emotes['fear']
person['emotions']['disgust'] = emotes['disgust']
person['likes'] = []
person['dislikes'] = []

getLikes(keywords, person['likes'], person['dislikes'])


d.close()

with open("dataDump.json","w") as f:
	json.dump(person, f, indent=2)