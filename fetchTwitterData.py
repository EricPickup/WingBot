#Eric Pickup

import tweepy
import sys
import json
import unicodedata
from collections import defaultdict

#COMMAND LINE ARGUMENT 1 = TWITTER USERNAME TO SEARCH
TWITTER_USER = sys.argv[1]
#COMMAND LINE ARGUMENT 2 = MAXIMUM NUMBER OF TWEETS TO SCRAPE
MAX_TWEETS = int(sys.argv[2])
MAX_MENTIONS = 10

#Building the JSON format
tweetData = {}
tweetData['direct_tweets'] = []
tweetData['retweets'] = []
tweetData['images'] = []
tweetData['top_mentions'] = []
tweetData['profile_picture_url'] = ""

mentionData = defaultdict()


def sliceMentions(text, tweetObj):

    while '@' in text:
    
        indexOfMention = text.find('@')
        indexOfSpace = text[indexOfMention:].find(' ')

        #Edge case: If the mention is the last word in the tweet, we will not find a space
        if indexOfSpace == -1:  
            indexOfSpace = len(text) - indexOfMention

        mentionName = text[indexOfMention : indexOfSpace + indexOfMention + 1]
        text = text.replace(mentionName,"")

        #Remove any spaces or colons in the mention name
        while ' ' in mentionName or ':' in mentionName:
            mentionName = mentionName.replace(" ","")
            mentionName = mentionName.replace(":","")

    for currentMention in tweetObj.entities['user_mentions']:
        if currentMention['id'] in mentionData:
            mentionData[currentMention['id']] += 1
        else:
            mentionData[currentMention['id']] = 1

    return text


def storeMentions():

    mentionCount = 0
    topMentions = []
    
    for w in sorted(mentionData, key=mentionData.get, reverse=True):

        if TWITTER_USER_ID != w:
            topMentions.append((w,mentionData[w]))
            mentionCount += 1

        if mentionCount > MAX_MENTIONS:
            break

    for user_id, mentioned_frq in topMentions:
        mentionuser = api.lookup_users(user_ids=[user_id])

        for user in mentionuser:

            tweetData['top_mentions'].append({
                'user':     "@" + user.screen_name,
                'num_mentions': mentioned_frq,
                'profile_picture_url':  user.profile_image_url_https
                })


config = json.load(open('config.json'))["Twitter"]
auth = tweepy.OAuthHandler(config["consumer_key"], config["consumer_secret"])
auth.set_access_token(config["access_token"], config["access_secret"])
api = tweepy.API(auth)

#Retrieve high-res version of user's profile picture
userProfile = api.user_timeline(screen_name = TWITTER_USER)

for tweet in userProfile:
    profilePictureURL = tweet.user.profile_image_url_https
    profilePictureURL = profilePictureURL.replace("_normal","")
    tweetData['profile_picture_url'] = profilePictureURL
    TWITTER_USER_ID = tweet.user.id
    break

tweetCount = 1

for tweet in tweepy.Cursor(api.user_timeline, tweet_mode='extended', screen_name = TWITTER_USER).items():
    
    currentTweet = str(tweet.full_text)
    currentTweet = currentTweet.replace("\u2019","'")
    currentTweet = sliceMentions(currentTweet, tweet)

    #Retweeted tweets (all begin with "RT ..")
    if "RT " in currentTweet:
        tweetData['retweets'].append({
            'text': currentTweet,
            'date': str(tweet.created_at)
            })

    #Other tweets (mentions or regular tweets)
    else:
        tweetData['direct_tweets'].append({
            'text': currentTweet,
            'date': str(tweet.created_at)
            })

    print("-------------TWEEET-------------")
    print(tweet.full_text)
    print(tweet.created_at)
    print("---------------------------------")

    #Scraping images
    if "media" in tweet.entities:
        for imageIndex in range(0,len(tweet.extended_entities["media"])):
            imageURL = tweet.extended_entities["media"][imageIndex]['media_url_https']
            #Ignoring video thumbnails and retweeded images/videos
            if "RT " not in currentTweet and "video" not in imageURL:
                tweetData['images'].append({
                    'URL': imageURL,
                    'date': str(tweet.created_at)
                    })
    tweetCount = tweetCount + 1
    if (tweetCount > MAX_TWEETS):
        break

storeMentions()

with open('data.json', 'w') as f:
    json.dump(tweetData, f, indent=2)