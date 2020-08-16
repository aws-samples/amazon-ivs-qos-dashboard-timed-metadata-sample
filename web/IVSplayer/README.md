# Sample Web Player of Amazon IVS Quality-Of-Service and Timed-Metadata-Feedback Dashboard

## 1. What Does the Sample Player Do

This web sample player is written based on IVS player SDK 1.0.0, and can

- Play an IVS live stream (or an IVS VOD asset);

- Based on the player SDK's events, assemble playback QoS events and send them to an IVS QoS dashboard backend;

- Render multiple-choice questions based on the timed metadata embedded in an IVS live (or VOD) video, assemble question/answer events and send them to an IVS timed-metadata-feedback dashboard backend.

## 2. Play With the Sample Player Yourself

### 2.1 Host Nginx on Your Local Computer

**Step 1:** On Mac, you can install Nginx with Homebrew by running:

- ```$ brew update```

- ```$ brew install nginx```

**Step 2:** Point the root directory to the folder of this sample player, e.g., */Users/yuesshen/aws-samples/amazon-ivs-qos-dashboard-timed-metadata-sample/web/IVSplayer*

- Modify */usr/local/etc/nginx/nginx.conf* as

```
http {
    ...
    server {
        listen       8080;
        server_name  localhost;

        location / {
            root /Users/yuesshen/aws-samples/amazon-ivs-qos-dashboard-timed-metadata-sample/web/IVSplayer;
            index  index.html index.htm;
        }
    ...
```

**Step 3:** Run Nginx in background

- To start Nginx, run ```sudo brew services start nginx```

- After you are done with your experiment, run ```sudo brew services stop nginx``` to stop Nginx

### 2.2 Run the Player and See the Assembled Timed-Metadata-Feedback & Playback-QoS Events

In Chrome, type *http://localhost:8080/* in the web address bar, the sample player will play a test channel with multiple-choice questions (see below). If your selected answer is correct, the answer window will turn green, otherwise it will be red.

![Screenshot of playing the test channel](./README_images/section2dot2_1.png)

When a viewer answers a multiple-choice question, a timed-metadata-feedback event will be assembled and sent to the backend. To see the console output for these events,

- Open the Chrome Developer Tool (in Chrome, select "View", "Developer", "Developer Tool");

- Select "Console";

- Type "sendQuizAnswer" in "Filter";

- See the timed-metadata-feedback events including the question and the selected answer (see below).

![Screenshot of playing the test channel](./README_images/section2dot2_2.png)

Every minute, the sample player also assembles a playback QoS event and send to the the backend. To see the console output for these events, similar as above and

- Type "sendQoSEvent" in "Filter";

- See the playback QoS events which is a summary of the past minute's playback state (see below).

![Screenshot of playing the test channel](./README_images/section2dot2_3.png)

### 2.3 Customize Your IVS Video and Dashboard Backend

In *.js/config.js*, replace the default values with the playback URL of your IVS live (or VOD) video and the Gateway API end points of your backend:

- ```"PlaybackURL":```

- ```"SendQoSEventURL":```

- ```"SendQuizAnswerURL":```

## 3. Deep Dive Into the Design and the Source Code

### 3.1 Playback QoS Events

#### 3.1.1 Submission Frequency and Metrics Covered

...

#### 3.1.2 JSON Schema

...

#### 3.1.3 Implementation

...

#### 3.1.4 Test Plan

...

### 3.2 Time-Metadata-Feedback Events

#### 3.2.1 Submission Triggering and Content Included

...

#### 3.2.2 JSON Schema

...

#### 3.2.3 Implementation

...

#### 3.2.4 Test Plan

...
