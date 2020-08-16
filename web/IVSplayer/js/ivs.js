/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {config} from "./config.js"; // see comments in config.js for the purposes of the URLs
const playbackUrl = config.PlaybackURL;
const sendQoSEventUrl = config.SendQoSEventURL;
const sendQuizAnswerUrl = config.SendQuizAnswerURL;

const videoPlayer = document.getElementById("video-player");
const quizEl = document.getElementById("quiz");
const waitMessage = document.getElementById("waiting");
const questionEl = document.getElementById("question");
const answersEl = document.getElementById("answers");
const cardInnerEl = document.getElementById("card-inner");

(function (IVSPlayer) {
  const PlayerState = IVSPlayer.PlayerState;
  const PlayerEventType = IVSPlayer.PlayerEventType;

  // Initialize player
  const player = IVSPlayer.create();
  player.attachHTMLVideoElement(videoPlayer);

  // === Define and initialize QoS event work variables ===
  var hasPlayedAnyContent = false;
  var lastCallingLoadTime = -1; // milliseconds since Epoch, UTC
  var currentEventBeginTime = -1; // milliseconds since Epoch, UTC

  var hasReportedStartupMsOfThisChannel = false;
  var startupLatencyMsOfThisSession = 0;
  var lastRecordedPlayerState = "undefined";
  var lastRecordedPlayerStateTime = -1; // milliseconds since Epoch, UTC
  var playingTimeMsInLastMinute = 0;
  var bufferingTimeMsInLastMinute = 0;
  var errorCountInLastMinute = 0;
  // === Define and initialize QoS event work variables ===

  // Attach event (player state) listeners
  player.addEventListener(PlayerState.READY, function () {
    console.log("Player State - READY");

    // === Update QoS event work variables ===
    lastRecordedPlayerState = "READY";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to ", lastRecordedPlayerStateTime);
    // === Update QoS event work variables ===
  });
  player.addEventListener(PlayerState.BUFFERING, function () {
    console.log("Player State - BUFFERING");

    // === Update QoS event work variables ===
    if (lastRecordedPlayerState == "PLAYING") {
      playingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
      console.log("Update playingTimeMsInLastMinute to", playingTimeMsInLastMinute);
    }

    lastRecordedPlayerState = "BUFFERING";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to", lastRecordedPlayerStateTime);
    // === Update QoS event work variables ===
  });
  player.addEventListener(PlayerState.PLAYING, function () {
    console.log("Player State - PLAYING");

    // === Update QoS event work variables ===
    if (!hasReportedStartupMsOfThisChannel) {
      startupLatencyMsOfThisSession = Date.now() - lastCallingLoadTime;
      console.log("Set startupLatencyMsOfThisSession to", startupLatencyMsOfThisSession);
    } else if (lastRecordedPlayerState == "BUFFERING") {
      bufferingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
      console.log("Update bufferingTimeMsInLastMinute to", bufferingTimeMsInLastMinute);
    }

    lastRecordedPlayerState = "PLAYING";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to", lastRecordedPlayerStateTime);
    // === Update QoS event work variables ===
  });
  player.addEventListener(PlayerState.IDLE, function () {
    console.log("Player State - IDLE");

    // === Update QoS event work variables ===
    if (lastRecordedPlayerState == "PLAYING") {
      playingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
      console.log("Update playingTimeMsInLastMinute to", playingTimeMsInLastMinute);
    } else if (lastRecordedPlayerState == "BUFFERING") {
      bufferingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
      console.log("Update bufferingTimeMsInLastMinute to", bufferingTimeMsInLastMinute);
    }

    lastRecordedPlayerState = "IDLE";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to", lastRecordedPlayerStateTime);
    // === Update QoS event work variables ===
  });
  player.addEventListener(PlayerState.ENDED, function () {
    console.log("Player State - ENDED");

    // === Update QoS event work variables ===
    if (lastRecordedPlayerState == "PLAYING") {
      playingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
      console.log("Update playingTimeMsInLastMinute to", playingTimeMsInLastMinute);
    }

    lastRecordedPlayerState = "END";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to", lastRecordedPlayerStateTime);
    // === Update QoS event work variables ===
  });

  // Attach event (error) listeners
  player.addEventListener(PlayerEventType.ERROR, function (err) {
    console.warn("Player Event - ERROR:", err);

    // === Update QoS event work variables ===
    errorCountInLastMinute++;
    console.log("Update errorCountInLastMinute to", errorCountInLastMinute);
    // === Update QoS event work variables ===
  });

  // Attach event (timed metadata) listeners
  player.addEventListener(PlayerEventType.TEXT_METADATA_CUE, function (cue) {
    console.log("Timed metadata: ", cue.text);
    const metadataText = cue.text;
    const position = player.getPosition().toFixed(2);
    console.log(
      `PlayerEvent - METADATA: "${metadataText}". Observed ${position}s after playback started.`
    );
    triggerQuiz(metadataText);
  });

  // === QoS event workflow initialization ===
  // Before the player loads a new channel, send off a QoS event if the player is playing
  //   another channel
  // Note: This will never happens in this demo, because the demo doesn't offer an interface
  //   to load a new channel, but an IVS customer App does need this logic
  if (hasPlayedAnyContent) {
    if (lastRecordedPlayerState == "PLAYING") {
      playingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
    } else if (lastRecordedPlayerState == BUFFERING) {
      bufferingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
    }

    if ((playingTimeMsInLastMinute > 0) || (bufferingTimeMsInLastMinute > 0)) {
      sendQoSEvent(sendQoSEventUrl);
    }
  }

  // Reset QoS event work variables
  hasPlayedAnyContent = true;
  lastCallingLoadTime = currentEventBeginTime = Date.now();
  hasReportedStartupMsOfThisChannel = false;
  startupLatencyMsOfThisSession = 0;
  lastRecordedPlayerState = "undefined";
  lastRecordedPlayerStateTime = -1;
  playingTimeMsInLastMinute = 0;
  bufferingTimeMsInLastMinute = 0;
  errorCountInLastMinute = 0;
  // === QoS event workflow initialization ===

  // Maintain low latency during network glitches
  player.setRebufferToLive(true);

  // Setup stream and play
  player.setAutoplay(true);
  player.load(playbackUrl);

  // Setvolume
  player.setVolume(0.1);

  // === Send off a QoS event every minute ===
  setInterval(function () {
    if ((Date.now() - currentEventBeginTime) > 60000) { // one QoS event every minute
      // Send off a QoS event
      if (lastRecordedPlayerState == "PLAYING") {
        playingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
        console.log("Update playingTimeMsInLastMinute to", playingTimeMsInLastMinute);
      } else if (lastRecordedPlayerState == "BUFFERING") {
        bufferingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
        console.log("Update bufferingTimeMsInLastMinute to", bufferingTimeMsInLastMinute);
      }

      if ((playingTimeMsInLastMinute > 0) || (bufferingTimeMsInLastMinute > 0)) {
        sendQoSEvent(sendQoSEventUrl);
      }

      // Reset work variables
      currentEventBeginTime = lastRecordedPlayerStateTime = Date.now();
      hasReportedStartupMsOfThisChannel = true;
      playingTimeMsInLastMinute = 0;
      bufferingTimeMsInLastMinute = 0;
      errorCountInLastMinute = 0;
    }
  }, 1000);
  // === Send off a QoS event every minute ===

  // Remove card
  function removeCard() {
    quizEl.classList.toggle("drop");
  }

  // Trigger quiz
  function triggerQuiz(metadataText) {
    let obj = JSON.parse(metadataText);

    quizEl.style.display = "";
    quizEl.classList.remove("drop");
    waitMessage.style.display = "none";
    cardInnerEl.style.display = "none";
    cardInnerEl.style.pointerEvents = "auto";

    while (answersEl.firstChild) answersEl.removeChild(answersEl.firstChild);
    questionEl.textContent = obj.question;

    let createAnswers = function (obj, i) {
      let q = document.createElement("a");
      let qText = document.createTextNode(obj.answers[i]);
      answersEl.appendChild(q);
      q.classList.add("answer");
      q.appendChild(qText);

      q.addEventListener("click", (event) => {
        cardInnerEl.style.pointerEvents = "none";
        if (q.textContent === obj.answers[obj.correctIndex]) {
          q.classList.toggle("correct");
        } else {
          q.classList.toggle("wrong");
        }

        // === send off a timed metadata feedback event ===
        sendQuizAnswer(sendQuizAnswerUrl, obj.question, q.textContent);
        // === send off a timed metadata feedback event ===

        setTimeout(function () {
          removeCard();
          waitMessage.style.display = "";
        }, 1050);
        return false;
      });
    };

    for (var i = 0; i < obj.answers.length; i++) {
      createAnswers(obj, i);
    }
    cardInnerEl.style.display = "";
  }

  waitMessage.style.display = "";

  // === subroutines for sending QoS/timed-metadata events ===
  // Send QoS event
  function sendQoSEvent(url) {
    var myJson = {};
    myJson.metric_type = "PLAYBACK_SUMMARY";
    myJson.client_platform = "web";
    var isLive = (player.getDuration() == Infinity);
    if (isLive) {
      var myIndex1 = playbackUrl.indexOf("channel.") + 8;
      var myIndex2 = playbackUrl.indexOf(".m3u8");
      myJson.channel_watched = playbackUrl.substring(myIndex1, myIndex2);
    } else {
      myJson.channel_watched = playbackUrl;
    }
    myJson.is_live = isLive;
    myJson.error_count = errorCountInLastMinute;
    myJson.playing_time_ms = playingTimeMsInLastMinute;
    myJson.buffering_time_ms = bufferingTimeMsInLastMinute;
    var myQuality = player.getQuality();
    myJson.rendition_name = myQuality.name;
    myJson.rendition_height = myQuality.height;
    if (!hasReportedStartupMsOfThisChannel) {
      myJson.startup_latency_ms = startupLatencyMsOfThisSession;
    } else {
      myJson.startup_latency_ms = 0;
    }
    if (isLive) {
      myJson.live_latency_ms = Math.round(player.getLiveLatency());
    } else {
      myJson.live_latency_ms = -1;
    }

    if (url != "") {
      pushPayload(url,myJson);
    }

    console.log("sendQoSEvent ", JSON.stringify(myJson), "to", url);
  }

  // Send timed metadata feedback event
  function sendQuizAnswer(url, question, answer) {
    var myJson = {};
    myJson.metric_type = "QUIZ_ANSWER";
    myJson.question = question;
    myJson.answer = answer;

    if (url != "") {
      pushPayload(url,myJson);
    }

    console.log("sendQuizAnswer ", JSON.stringify(myJson), "to", url);
  }

  function pushPayload(endpoint, payload){
    let wrapPayload = {};
    wrapPayload.Records = [];
    let record = {
        Data: payload
    };
    wrapPayload.Records.push(record);
    console.log("Record :%j",wrapPayload);

    $.ajax({
      url: endpoint,
      type: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(wrapPayload)
    }).done(function(){
      console.log("Success ");
    }).fail(function(){
      console.log("Error");
    });
  }
  // === subroutines for sending events ===

})(window.IVSPlayer);
