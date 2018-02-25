#include <cstdlib>
#include <iostream>
#include <string>
#include <sys/types.h>
#include <unistd.h>
#include <vector>

#include "curl/curl.h"
#include "opencv2/opencv.hpp"
#include "opencv2/highgui.hpp"
#include "opencv2/objdetect.hpp"
#include "opencv2/imgproc.hpp"

#define FACE_CASCADE "image-analysis/Data/haarcascade_frontalface_alt.xml"
#define MATCH_THRESH 0.45
#define DISTORTION_SIZE 3

using namespace cv;
using namespace std;

size_t write_data(char *ptr, size_t size, size_t nmemb, void *userdata);
Mat curlImg(const char *img_url, int timeout=100);
void detectFaces(Mat frame, vector<Mat>& detected_faces);

CascadeClassifier face_cascade;

int main(int arg_c, char** arg_v) {
	cout << "Welcome to my Playground" << endl;
	system("ls");

	if (arg_c == 1) {
		cout << "Usage: ./Playground img1 img2 img3 ..." << endl;
		return -1;
	}

	vector<Mat> images;
	vector<Mat> detected_faces;
	vector<vector<Mat> > faces;
	vector<double> match_ratings;  // TODO: implement this

	if (!face_cascade.load(FACE_CASCADE)) {
		cout << "Cascade load failed" << endl;
		return -1;
	}

	for (int i = 1; i < arg_c; i++) {
		images.push_back(curlImg(arg_v[i]));
		detectFaces(images[i - 1], detected_faces);
	}

	cout << "Faces: " << detected_faces.size() << endl;

	bool next_face = false;
	for (Mat face : detected_faces) {
		next_face = false;

		Mat cmp1;
		MatND hist1;
		cvtColor(face, cmp1, CV_BGR2GRAY);

		Mat element = getStructuringElement(0, Size(DISTORTION_SIZE, DISTORTION_SIZE), Point(2, 2));

		erode(cmp1, cmp1, element);
		dilate(cmp1, cmp1, element);
		GaussianBlur(cmp1, cmp1, Size(DISTORTION_SIZE, DISTORTION_SIZE), 0, 0);

		int bins = 256;
		int hist_size[] = { bins };
		float lranges[] = { 0, 256 };
		const float* ranges[] = { lranges };
		int channels[] = { 0, 1 };

		calcHist(&cmp1, 1, channels, Mat(), hist1, 1, hist_size, ranges);

		for (int i = 0; i < faces.size(); i++) {
			double rating = 0.0;
			for (int j = 0; j < faces[i].size(); j++) {
				Mat cmp2;
				MatND hist2;
				cvtColor(faces[i][j], cmp2, CV_BGR2GRAY);
				erode(cmp2, cmp2, element);
				dilate(cmp2, cmp2, element);
				GaussianBlur(cmp1, cmp1, Size(DISTORTION_SIZE, DISTORTION_SIZE), 0, 0);

				calcHist(&cmp2, 1, channels, Mat(), hist2, 1, hist_size, ranges);
				rating += compareHist(hist1, hist2, 0);
			}

			rating /= faces[i].size();  // Average match [1.0, 0.0] -> [Good, Bad]

			if (rating >= MATCH_THRESH) {  // Match
				faces[i].push_back(face);
				next_face = true;
				break;
			}
		}

		if (next_face)
			continue;

		// If the program makes it here, this is new face
		faces.push_back(vector<Mat>());
		faces[faces.size() - 1].push_back(face);
		match_ratings.push_back(0.0);
	}

	system(("rm -rf public/images/" + to_string(getpid())).c_str());
	system(("mkdir public/images/" + to_string(getpid())).c_str());
	system(("mkdir public/images/" + to_string(getpid()) + "/Faces").c_str());
	system(("mkdir public/images/" + to_string(getpid()) + "/Profile").c_str());

	int highest_freq_index = 0;

	for (int i = 0; i < faces.size(); i++) {
		/*
		for (int j = 0; j < faces[i].size(); j++) {
			imshow(to_string(i) + " " + to_string(j), faces[i][j]);
		}
		*/
		if (faces[i].size() > faces[highest_freq_index].size())
			highest_freq_index = i;

		imwrite("public/images/" + to_string(getpid()) + "/Faces/" + to_string(i) + " " + to_string(faces[i].size()) + ".jpg", faces[i][0]);
	}

	for (int i = 0; i < faces[highest_freq_index].size(); i++) {
		imwrite("public/images/" + to_string(getpid()) + "/Profile/" + to_string(i) + ".jpg", faces[highest_freq_index][i]);
	}

	waitKey(10);
	/*
	while (true) {
		if (char(waitKey(10) == 27)) {
			break;
		}
	}
	*/

	return 0;
}

size_t write_data(char *ptr, size_t size, size_t nmemb, void *userdata) {
	vector<uchar> *stream = (vector<uchar>*)userdata;
	size_t count = size * nmemb;
	stream->insert(stream->end(), ptr, ptr + count);
	return count;
}

// function to retrieve the image as cv::Mat data type
Mat curlImg(const char *img_url, int timeout) {
	vector<uchar> stream;
	CURL *curl = curl_easy_init();
	curl_easy_setopt(curl, CURLOPT_URL, img_url);  //the img url
	curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_data);  // pass the writefunction
	curl_easy_setopt(curl, CURLOPT_WRITEDATA, &stream);  // pass the stream ptr to the writefunction
	curl_easy_setopt(curl, CURLOPT_TIMEOUT, timeout);  // timeout if curl_easy hangs, 
	CURLcode res = curl_easy_perform(curl);  // start curl
	curl_easy_cleanup(curl);  // cleanup
	return imdecode(stream, -1);  // 'keep-as-is'
}

void detectFaces(Mat frame, vector<Mat>& detected_faces) {
	Mat frame_gray, frame_gray_blur;
	vector<Rect> faces;

	cvtColor(frame, frame_gray, CV_BGR2GRAY);
	equalizeHist(frame_gray, frame_gray);

	GaussianBlur(frame_gray, frame_gray_blur, Size(3, 3), 0, 0);
	face_cascade.detectMultiScale(frame_gray, faces, 1.5, 2, 0 | CV_HAAR_SCALE_IMAGE);

	for (Rect r : faces)
		detected_faces.push_back(frame(r));
}
