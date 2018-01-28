nouns = open("./nouns.txt", "r+")
pronouns = open("./pronouns.txt", "r")
for noun in nouns.readlines():
	for pronoun in pronouns.readlines():
		if (noun == pronoun):
			print(noun)

