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
  // timing control and auxiliary variables
  var hasBeenPlayingVideo = false;
  var lastPlayerStateREADYTime = -1; // milliseconds since Epoch, UTC, for computing startupLatencyMsOfThisSession
  var lastPlayerState = "";
  var lastPlayerStateUpdateOrPlaybackSummaryEventSentTime = -1; // milliseconds since Epoch, UTC, for computing playing/bufferingTimeMsInLastMinute
  var lastPlaybackStartOrPlaybackSummaryEventSentTime = -1; // milliseconds since Epoch, UTC, for the timing of sending playback summary events

  // payload of events
  var userId = ""; // unique UUID of each device if localStorage is supported, otherwise set to sessionId of each playback session
  var sessionId = ""; // unique UUID of each playback session
  var startupLatencyMsOfThisSession = 0;
  var playingTimeMsInLastMinute = 0;
  var bufferingTimeMsInLastMinute = 0;
  var bufferingCountInLastMinute = 0;
  var errorCountInLastMinute = 0;
  var lastQuality = undefined; // the latest rendition being played
  // === Define and initialize QoS event work variables ===

  // Attach event (player state) listeners
  player.addEventListener(PlayerState.READY, function () {
    console.log("Player State - READY");

    // === Send off playback end event and reset QoS event work variables ===
    // Before the player loads a new channel, send off the last QoS event of the previous
    //   channel played.
    // Note: This will never happens in this demo, because the demo doesn't offer an interface
    //   to load a new channel, but an IVS customer App should have this logic.
    // (Yueshi to do) We also need to call this function if an IVS cusomter App or webpage is closed,
    //   how to detect this situation and call this function?
    if (hasBeenPlayingVideo) {
      sendOffLastPlaybackSummaryEventAndPlaybackEndEvent();
    }

    hasBeenPlayingVideo = true;
    lastPlayerStateREADYTime = Date.now();
    setPlayerStateVariables("READY");

    setUserIDSessionID();
    startupLatencyMsOfThisSession = 0;
    playingTimeMsInLastMinute = 0;
    bufferingTimeMsInLastMinute = 0;
    bufferingCountInLastMinute = 0;
    errorCountInLastMinute = 0;
    lastQuality = undefined;
    // === Send off playback end event and reset QoS event work variables ===
  });

  player.addEventListener(PlayerState.BUFFERING, function () {
    console.log("Player State - BUFFERING");

    // === Update QoS event work variables ===
    if (lastPlayerState == "PLAYING") { // PLAYING -> BUFFERING (can only happen in the middle of a playback session)
      playingTimeMsInLastMinute += (Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime);
      bufferingCountInLastMinute += 1;
    }

    setPlayerStateVariables("BUFFERING");
    // === Update QoS event work variables ===
  });

  player.addEventListener(PlayerState.PLAYING, function () {
    console.log("Player State - PLAYING");

    // === Send off playback start event and update QoS event work variables ===
    if (startupLatencyMsOfThisSession == 0) { // the very beginning of a playback session
      lastPlaybackStartOrPlaybackSummaryEventSentTime = Date.now();
      startupLatencyMsOfThisSession = Date.now() - lastPlayerStateREADYTime;
      sendPlaybackStartEvent(sendQoSEventUrl);

      if (lastQuality === undefined) {
        lastQuality = player.getQuality();
      }
    } else {
      if (lastPlayerState == "BUFFERING") { // BUFFERING -> PLAYING (in the middle of a playback session)
        bufferingTimeMsInLastMinute += Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime;

        // (Yueshi to do) to confirm with the player team: will QUALITY_CHANGE event be triggered when player rebuffers
        //   and selects a different rendiion after the rebuffering
        let newQuality = player.getQuality();
        if (lastQuality.bitrate != newQuality.bitrate) {
          console.log(
            `Quality changed from "${lastQuality.name}" to "${newQuality.name}".`
          );
          sendQualityChangedEvent(sendQoSEventUrl, lastQuality, newQuality);
          lastQuality = newQuality;
        }
      }
    }

    setPlayerStateVariables("PLAYING");
    // === Send off playback start event and update QoS event work variables ===
  });

  player.addEventListener(PlayerState.IDLE, function () {
    console.log("Player State - IDLE");

    // === Update QoS event work variables ===
    if (lastPlayerState == "PLAYING") { // PLAYING -> IDLE
      playingTimeMsInLastMinute += (Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime);
    } else if (lastPlayerState == "BUFFERING") { // BUFFERING -> IDLE
      bufferingTimeMsInLastMinute += (Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime);
    }

    setPlayerStateVariables("IDLE");
    // === Update QoS event work variables ===
  });

  player.addEventListener(PlayerState.ENDED, function () {
    console.log("Player State - ENDED");

    // === Update QoS event work variables ===
    if (lastPlayerState == "PLAYING") { // PLAYING -> ENDED
      playingTimeMsInLastMinute += (Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime);
    }

    setPlayerStateVariables("ENDED");
    // === Update QoS event work variables ===
  });

  // Attach event (error) listeners
  player.addEventListener(PlayerEventType.ERROR, function (err) {
    console.warn("Player Event - ERROR:", err);

    // === Update QoS event work variables ===
    errorCountInLastMinute++;
    // === Update QoS event work variables ===
  });

  // Attach event (quality changed) listeners
  player.addEventListener(PlayerEventType.QUALITY_CHANGED, function () {
    console.log("PlayerEventType - QUALITY_CHANGED");

    // === Send off quality change event and update QoS event work variables ===
    let newQuality = player.getQuality();
    if (lastQuality === undefined) {
      lastQuality = newQuality;
      console.log(
        `Quality initialized to "${lastQuality.name}".`
      );
    } else if (lastQuality.bitrate != newQuality.bitrate) {
      console.log(
        `Quality changed from "${lastQuality.name}" to "${newQuality.name}".`
      );
      sendQualityChangedEvent(sendQoSEventUrl, lastQuality, newQuality);
      lastQuality = newQuality;
    }
    // === Send off quality change event and update QoS event work variables ===
  });

  // Attach event (timed metadata) listeners
  player.addEventListener(PlayerEventType.TEXT_METADATA_CUE, function (cue) {
    const metadataText = cue.text;
    const position = player.getPosition().toFixed(2);
    console.log(
      `PlayerEventType - METADATA: "${metadataText}". Observed ${position}s after playback started.`
    );

    triggerQuiz(metadataText);
  });

  // Setup stream and play
  player.setAutoplay(true);
  player.load(playbackUrl);

  // Set volume
  player.setVolume(0.1);

  // === Send off a QoS event every minute ===
  setInterval(function () {
    if ((lastPlaybackStartOrPlaybackSummaryEventSentTime != -1) && ((Date.now() - lastPlaybackStartOrPlaybackSummaryEventSentTime) > 60000)) {
      sendPlaybackSummaryEventIfNecessary(sendQoSEventUrl);

      // Reset work variables
      lastPlayerStateUpdateOrPlaybackSummaryEventSentTime = lastPlaybackStartOrPlaybackSummaryEventSentTime = Date.now();
      playingTimeMsInLastMinute = 0;
      bufferingTimeMsInLastMinute = 0;
      bufferingCountInLastMinute = 0;
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
    waitMessage.style.display = "";
  }

  // === subroutines for sending QoS events and timed metadata feedback events ===
  // Set the User and Session ID when the player loads a new video. The unique User ID is a random UUID, set as the very first
  //   Session ID of this user, and remains the same even different sessions are played.
  function setUserIDSessionID(){
    sessionId = player.getSessionId();

    if (typeof(Storage) !== "undefined") {
      if (!localStorage.getItem("ivs_qos_user_id")) {
        localStorage.setItem("ivs_qos_user_id",sessionId);
      }
      userId = localStorage.getItem("ivs_qos_user_id");
    } else {
      console.log("Sorry! No web storage support. Use Session ID as User Id");
      userId = sessionId;
    }
  }

  function setPlayerStateVariables(myPlayerState) {
    lastPlayerState = myPlayerState;
    lastPlayerStateUpdateOrPlaybackSummaryEventSentTime = Date.now();
  }

  // Send off the last PLAYBACK_SUMMARY event and the STOP event
  function sendOffLastPlaybackSummaryEventAndPlaybackEndEvent() {
    sendPlaybackSummaryEventIfNecessary(sendQoSEventUrl);
    sendPlaybackEndEvent(sendQoSEventUrl); 
  }

  // Send playback start (PLAY) event
  function sendPlaybackStartEvent(url) {
      // (Yueshi to do) send out PLAY event, including startupLatencyMsOfThisSession, myJson.startup_latency_ms
      var myJson = {};
      myJson.metric_type = "STOP";
  
      myJson.user_id = userId;
      myJson.session_id = sessionId;
      
      myJson.client_platform = config.client_platform;
      myJson.is_live = isLiveChannel();
      myJson.channel_watched = getChannelWatched(myJson.is_live);

      myJson.startup_latency_ms = startupLatencyMsOfThisSession;
  
      if (url != "") {
        pushPayload(url,myJson);
      }
  
      console.log("send QoS event - Play ", JSON.stringify(myJson), " to ", url);
  }

  // Send playback end (STOP) event
  function sendPlaybackEndEvent(url) {
    var myJson = {};
    myJson.metric_type = "STOP";

    myJson.user_id = userId;
    myJson.session_id = sessionId;

    myJson.client_platform = config.client_platform;
    myJson.is_live = isLiveChannel();
    myJson.channel_watched = getChannelWatched(myJson.is_live);

    if (url != "") {
      pushPayload(url,myJson);
    }

    console.log("send QoS event - Stop ", JSON.stringify(myJson), " to ", url);
  }

  // Send playback QoS summary (PLAYBACK_SUMMARY) event
  function sendPlaybackSummaryEventIfNecessary(url) {
    if (lastPlayerState == "PLAYING") { // collect the uncounted time in the PLAYING state
      playingTimeMsInLastMinute += (Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime);
    } else if (lastPlayerState == "BUFFERING") { // Bcollect the uncounted time in the BUFFERING state
      bufferingTimeMsInLastMinute += (Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime);
    }

    if ((playingTimeMsInLastMinute > 0) || (bufferingTimeMsInLastMinute > 0)) {
      var myJson = {};
      myJson.metric_type = "PLAYBACK_SUMMARY";

      myJson.user_id = userId;
      myJson.session_id = sessionId;

      myJson.client_platform = config.client_platform;
      myJson.is_live = isLiveChannel();
      myJson.channel_watched = getChannelWatched(myJson.is_live);

      myJson.error_count = errorCountInLastMinute;
      myJson.playing_time_ms = playingTimeMsInLastMinute;
      myJson.buffering_time_ms = bufferingTimeMsInLastMinute;
      myJson.buffering_count = bufferingCountInLastMinute;
      myJson.rendition_name = lastQuality.name;
      myJson.rendition_height = lastQuality.height;
      if (myJson.is_live) {
        myJson.live_latency_sec = Math.round(player.getLiveLatency());
      } else {
        myJson.live_latency_sec = -1;
      }
  
      if (url != "") {
        pushPayload(url,myJson);
      }
  
      console.log("send QoS event - PlaybackSummary ", JSON.stringify(myJson), " to ", url);
    }
  }

  // Send quality (i.e., rendition) change (QUALITY_CHANGE) event
  function sendQualityChangedEvent(url, lastQuality, newQuality) {
    var myJson = {};
    myJson.metric_type = "QUALITY_CHANGED";

    myJson.user_id = userId;
    myJson.session_id = sessionId;

    myJson.client_platform = config.client_platform;
    myJson.is_live = isLiveChannel();
    myJson.channel_watched = getChannelWatched(myJson.is_live);

    myJson.from_rendition_group = lastQuality.group;
    myJson.to_rendition_group = newQuality.group;
    myJson.from_bitrate = lastQuality.bitrate;
    myJson.to_bitrate = newQuality.bitrate;
    myJson.step_direction = (newQuality.bitrate > lastQuality.bitrate)? "UP":"DOWN";

    if (url != "") {
      pushPayload(url,myJson);
    }

    console.log("send QoS event - QualityChanged ", JSON.stringify(myJson), " to ", url);
  }

  // Check whether the video being played is live or VOD
  function isLiveChannel(){
    return (player.getDuration() == Infinity);
  }

  // Parse and get the Channel watched from the Playback URL
  function getChannelWatched(live){
    if (live) {
      var myIndex1 = playbackUrl.indexOf("channel.") + 8;
      var myIndex2 = playbackUrl.indexOf(".m3u8");
      return playbackUrl.substring(myIndex1, myIndex2);
    } else {
      return playbackUrl;
    }
  }

  // Send timed metadata feedback event
  function sendQuizAnswer(url, question, answer) {
    var myJson = {};
    myJson.metric_type = "QUIZ_ANSWER";

    myJson.user_id = userId;
    myJson.session_id = sessionId;

    myJson.question = question;
    myJson.answer = answer;

    if (url != "") {
      pushPayload(url,myJson);
    }

    console.log("send timed metadata feedback event - QuizAnswer ", JSON.stringify(myJson), " to ", url);
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
  // === subroutines for sending QoS events and timed metadata events ===

})(window.IVSPlayer);
