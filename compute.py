import json
import re
import subprocess

from watson_developer_cloud \
 import NaturalLanguageUnderstandingV1

from watson_developer_cloud.natural_language_understanding_v1 \
  import Features, EntitiesOptions, KeywordsOptions, EmotionOptions

def stripPuncuation(word):

	regex = re.compile('[^a-z A-Z]')
	word = regex.sub('', word)
	return word

def isNoun(word):

	word+='\n'
	if word in nouns:
		return True
	else:
		return False


def findKeywords(data):

	keywordsDict = {}
	nouns = ["","","","","","","","","","","","","","","","","","","",""]
	freq = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]

	for tweet in data["direct_tweets"]:
		tmp = stripPuncuation(tweet["text"]);
		for word in tmp.split():

			if(isNoun(word)):

				if word in keywordsDict:
					keywordsDict[word]+=1
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

	natural_language_understanding = NaturalLanguageUnderstandingV1(
	  username='b2600595-97a5-4a8a-a9c4-0df0daaff8e8',
	  password='AEJpTBE0MUDX',
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

	emotionData['anger'] = anger/tot
	emotionData['joy'] = joy/tot
	emotionData['sadness'] = sadness/tot
	emotionData['fear'] = fear/tot
	emotionData['disgust'] = disgust/tot

	#-----------------------------

	return emotionData


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

	for tweet in data["direct_tweets"]:
		tmp = tweet["text"]
		# raw_input()

		try:
			response = natural_language_understanding.analyze(
			  html=tmp,
			  features=Features(
			    emotion=EmotionOptions(
			      targets=words)))

			# print(json.dumps(response, indent=2))
			emote = response['emotion']['targets']

			for e in emote:
				tmp = e['text']

				keyWordData['words'][words.index(tmp)]['anger'] += e['emotion']['anger']
				keyWordData['words'][words.index(tmp)]['joy'] += e['emotion']['joy']
				keyWordData['words'][words.index(tmp)]['sadness'] += e['emotion']['sadness']
				keyWordData['words'][words.index(tmp)]['fear'] += e['emotion']['fear']
				keyWordData['words'][words.index(tmp)]['disgust'] += e['emotion']['disgust']
				keyWordData['words'][words.index(tmp)]['tot'] += 1

		except:

			continue

	for i in range(20):
		if(keyWordData['words'][i]['tot'] != 0):
			keyWordData['words'][i]['anger'] /= keyWordData['words'][i]['tot']
			keyWordData['words'][i]['joy'] /= keyWordData['words'][i]['tot']
			keyWordData['words'][i]['sadness'] /= keyWordData['words'][i]['tot']
			keyWordData['words'][i]['fear'] /= keyWordData['words'][i]['tot']
			keyWordData['words'][i]['disgust'] /= keyWordData['words'][i]['tot']
	
	return keyWordData

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
# print(findKeywords(data))

# for tweet in data["direct_tweets"]:
# print(json.dumps(tweet["text"], indent=2))

# freqEmote = max(emotes['anger'],emotes['joy'],emotes['sadness'],emotes['fear'],emotes['disgust'])
# print(emotes.keys()[list(emotes.values()).index(freqEmote)],freqEmote)

# inp = ["hello hello hi hi hi whats up whats up", "kid i am something else redbull redbull redbull i like big butts", "i can not lie wow i love it happy face"]


# natural_language_understanding = NaturalLanguageUnderstandingV1(
#   username='b2600595-97a5-4a8a-a9c4-0df0daaff8e8',
#   password='AEJpTBE0MUDX',
#   version='2017-02-27')

# response = natural_language_understanding.analyze(
#   text="What's good young buck. The greek freak is so good at basketball. I want to watch a Bucks game",
#   features=Features(
#     entities=EntitiesOptions(
#       emotion=True,
#       sentiment=True,
#       limit=2),
#     keywords=KeywordsOptions(
#       emotion=True,
#       sentiment=True,)))

# print(json.dumps(response, indent=2))