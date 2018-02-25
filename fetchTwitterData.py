import tweepy
import sys
import json
import unicodedata
import os
from collections import defaultdict

#url = 'http://localhost:3300/twitterdata' # Set destination URL here

#IMPORTANT VARIABLES
TWITTER_USER = sys.argv[1]			#@Username of the twitter user to be analyzed
MAX_TWEETS = int(sys.argv[2])		#Maximum number of tweets to be scraped from user's profile (inc. retweets)
MAX_MENTIONS = 10					#Maximum number of top mentions to store (i.e. store top 10 mentions)

#Building the JSON format
tweetData = {}
tweetData['direct_tweets'] = []
tweetData['images'] = []
tweetData['top_mentions'] = []
tweetData['profile_picture_url'] = ""
tweetData['num_followers'] = ""
tweetData['num_following'] = ""

mentionData = defaultdict()

'''
Function: sliceMentions
Desc: Removes and each mention (@someone) from tweet text so that it will not be analyzed for emotions.
	  Stores each mention in order to keep track of frequency so that we may calculate top mentions.
Input:	tweetText - string containing the entirety of the text of the tweet
		tweetObj - instance of the tweet
Output:	Returns text after removing mentions
'''
def sliceMentions(tweetText, tweetObj):

    while '@' in tweetText:
    
        indexOfMention = tweetText.find('@')
        if tweetText[indexOfMention-1] == '.':
        	indexOfMention -= 1
        indexOfSpace = tweetText[indexOfMention:].find(' ')

        #Edge case: If the mention is the last word in the tweet, we will not find a space
        if indexOfSpace == -1:  
            indexOfSpace = len(tweetText) - indexOfMention

        mentionName = tweetText[indexOfMention : indexOfSpace + indexOfMention + 1]
        tweetText = tweetText.replace(mentionName,"")

        #Remove any spaces or colons in the mention name
        while ' ' in mentionName or ':' in mentionName:
            mentionName = mentionName.replace(" ","")
            mentionName = mentionName.replace(":","")

    for currentMention in tweetObj.entities['user_mentions']:
        if currentMention['id'] in mentionData:
            mentionData[currentMention['id']] += 1
        else:
            mentionData[currentMention['id']] = 1

    return tweetText


'''
Function: storeTopMentions
Desc: Stores MAX_MENTIONS amount of the most frequently mentioned users from the main user, and the frequeny
Output: Stores the mentions/frequency in the dataDump.json file under "top_mentions"
'''
def storeTopMentions():
    mentionCount = 0
    topMentions = []
    
    for w in sorted(mentionData, key=mentionData.get, reverse=True):

        if TWITTER_USER_ID != w:
            topMentions.append((w,mentionData[w]))
            mentionCount += 1

        if mentionCount > MAX_MENTIONS:
            break

    for user_id, mentioned_frq in topMentions:

        currentUser = api.get_user(user_id=user_id)
        tweetData['top_mentions'].append({
            'user':     str("@" + currentUser.screen_name),
            'num_mentions': str(mentioned_frq),
            'profile_picture_url':  str(currentUser.profile_image_url_https)
            })


'''Function: scrapeImages
Desc: Finds all images contained in a tweet and stores the direct URL in the json file
Input: Instance of the tweet
Output: Stores direct URL to images under 'images' in dataDump.json file
'''
def scrapeImages(tweet):
    if "media" in tweet.entities:
        for imageIndex in range(0,len(tweet.extended_entities["media"])):
            imageURL = tweet.extended_entities["media"][imageIndex]['media_url_https']
            #Ignoring video thumbnails and retweeded images/videos
            if "RT " not in tweet.full_text and "video" not in imageURL:
                tweetData['images'].append({
                    'URL': str(imageURL),
                    'date': str(tweet.created_at)
                    })


'''Function: storeTweet
Desc: Stores date and text of the tweet in the output json file
Input: Instance of the current tweet
Output: Stores the text/date of tweet in json file'''
def storeTweet(tweet):
    #Retweeted tweets (all begin with "RT ..")
    tweetText = str(tweet.full_text)
    tweetText = tweetText.replace("RT ", "")
    tweetText = sliceMentions(tweetText, tweet)
    tweetData['direct_tweets'].append({
        'text': str(tweetText),
        'date': str(tweet.created_at)
        })


################ API SETUP #####################
config = json.load(open('config.json'))["Twitter"]
auth = tweepy.OAuthHandler(config["consumer_key"], config["consumer_secret"])
auth.set_access_token(config["access_token"], config["access_secret"])
api = tweepy.API(auth)
#################################################

#Retrieve high-res version of user's profile picture
userProfile = api.get_user(screen_name = TWITTER_USER)
tweetData['num_followers'] = userProfile.followers_count
tweetData['num_following'] = userProfile.friends_count
#print(numFollowers, numFollowing)
profilePictureURL = userProfile.profile_image_url_https
profilePictureURL = profilePictureURL.replace("_normal","")
tweetData['profile_picture_url'] = str(profilePictureURL)
TWITTER_USER_ID = userProfile.id

tweetCount = 1

for tweet in tweepy.Cursor(api.user_timeline, tweet_mode='extended', screen_name = TWITTER_USER).items():

    scrapeImages(tweet)
    storeTweet(tweet)

    tweetCount = tweetCount + 1

    if (tweetCount > MAX_TWEETS):
        break

storeTopMentions()

with open(str(os.getpid())+'.json', 'w') as f:
    json.dump(tweetData, f, indent=2)


# request = Request(url, urlencode(tweetData).encode())
# json = urlopen(request).read().decode()