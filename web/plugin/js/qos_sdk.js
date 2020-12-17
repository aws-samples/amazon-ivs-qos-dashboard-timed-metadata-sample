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

 // const config_qos = {
 //   // end point for sending playback QoS (i.e., playback summary) events
 //   SendQoSEventURL: "https://d12g3ld0ws1p0z.cloudfront.net/prod/streams",
 //   // end point for sending timed metadata feedback (e.g., quiz answer) events
 //   SendQuizAnswerURL: "https://d12g3ld0ws1p0z.cloudfront.net/prod/streams",
 //
 //   // client platform type (i.e., web, Android, iOS), hardcoded to "web" here
 //   ClientPlatform: "web"
 // };
const sendQoSEventUrl = config.SendQoSEventURL;
const sendQuizAnswerUrl = config.SendQuizAnswerURL;

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
// store whether this is a live channel
var isLive = false;
// store the channel name
var channelWatched = "";

function initializeQoS(player,playbackUrl) {
  log("Initializing...:%s",playbackUrl);
  const PlayerState = window.IVSPlayer.PlayerState;
  const PlayerEventType = window.IVSPlayer.PlayerEventType;

  isLive = isLiveChannel(player);
  channelWatched = getChannelWatched(playbackUrl,isLive);
  log("Player...:%j",PlayerState);

  // Initialize player
  // const player = IVSPlayer.create();
  // player.attachHTMLVideoElement(videoPlayer);

  // Attach event (player state) listeners
  player.addEventListener(PlayerState.READY, function () {
    log("Player State - READY1");

    // === Send off playback end event and reset QoS event work variables ===
    // Before the player loads a new channel, send off the last QoS event of the previous
    //   channel played.
    // Note: This will never happens in this demo, because the demo doesn't offer an interface
    //   to load a new channel, but an IVS customer App should have this logic.
    // (Yueshi to do) We also need to call this function if an IVS cusomter App or webpage is closed,
    //   how to detect this situation and call this function?
    if (hasBeenPlayingVideo) {
      sendOffLastPlaybackSummaryEventAndPlaybackEndEvent(player);
    }

    hasBeenPlayingVideo = true;
    lastPlayerStateREADYTime = Date.now();
    setPlayerStateVariables("READY");

    setUserIDSessionID(player);
    startupLatencyMsOfThisSession = 0;
    playingTimeMsInLastMinute = 0;
    bufferingTimeMsInLastMinute = 0;
    bufferingCountInLastMinute = 0;
    errorCountInLastMinute = 0;
    lastQuality = undefined;
    // === Send off playback end event and reset QoS event work variables ===
  });

  player.addEventListener(PlayerState.BUFFERING, function () {
    log("Player State - BUFFERING");

    // === Update QoS event work variables ===
    if (lastPlayerState == "PLAYING") { // PLAYING -> BUFFERING (can only happen in the middle of a playback session)
      playingTimeMsInLastMinute += (Date.now() - lastPlayerStateUpdateOrPlaybackSummaryEventSentTime);
      bufferingCountInLastMinute += 1;
    }

    setPlayerStateVariables("BUFFERING");
    // === Update QoS event work variables ===
  });

  player.addEventListener(PlayerState.PLAYING, function () {
    log("Player State - PLAYING");

    // === Send off playback start event and update QoS event work variables ===
    if (startupLatencyMsOfThisSession == 0) { // the very beginning of a playback session
      lastPlaybackStartOrPlaybackSummaryEventSentTime = Date.now();
      startupLatencyMsOfThisSession = Date.now() - lastPlayerStateREADYTime;
      sendPlaybackStartEvent(player,sendQoSEventUrl);

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
          log(
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
    log("Player State - IDLE");

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
    log("Player State - ENDED");

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
    log("PlayerEventType - QUALITY_CHANGED");

    // === Send off quality change event and update QoS event work variables ===
    let newQuality = player.getQuality();
    if (lastQuality === undefined) {
      lastQuality = newQuality;
      log(
        `Quality initialized to "${lastQuality.name}".`
      );
    } else if (lastQuality.bitrate != newQuality.bitrate) {
      log(
        `Quality changed from "${lastQuality.name}" to "${newQuality.name}".`
      );
      sendQualityChangedEvent(sendQoSEventUrl, lastQuality, newQuality);
      lastQuality = newQuality;
    }
    // === Send off quality change event and update QoS event work variables ===
  });

  // === Send off a QoS event every minute ===
  setInterval(function () {
    if ((lastPlaybackStartOrPlaybackSummaryEventSentTime != -1) && ((Date.now() - lastPlaybackStartOrPlaybackSummaryEventSentTime) > 60000)) {
      sendPlaybackSummaryEventIfNecessary(player,sendQoSEventUrl);

      // Reset work variables
      lastPlayerStateUpdateOrPlaybackSummaryEventSentTime = lastPlaybackStartOrPlaybackSummaryEventSentTime = Date.now();
      playingTimeMsInLastMinute = 0;
      bufferingTimeMsInLastMinute = 0;
      bufferingCountInLastMinute = 0;
      errorCountInLastMinute = 0;
    }
  }, 1000);

}
  // === Send off a QoS event every minute ===

  // === subroutines for sending QoS events and timed metadata feedback events ===
  // Set the User and Session ID when the player loads a new video. The unique User ID is a random UUID, set as the very first
  //   Session ID of this user, and remains the same even different sessions are played.
  function setUserIDSessionID(player){
    sessionId = player.getSessionId();

    if (typeof(Storage) !== "undefined") {
      if (!localStorage.getItem("ivs_qos_user_id")) {
        localStorage.setItem("ivs_qos_user_id",sessionId);
      }
      userId = localStorage.getItem("ivs_qos_user_id");
    } else {
      log("Sorry! No web storage support. Use Session ID as User Id");
      userId = sessionId;
    }
  }

  function setPlayerStateVariables(myPlayerState) {
    lastPlayerState = myPlayerState;
    lastPlayerStateUpdateOrPlaybackSummaryEventSentTime = Date.now();
  }

  // Send off the last PLAYBACK_SUMMARY event and the STOP event
  function sendOffLastPlaybackSummaryEventAndPlaybackEndEvent(player) {
    sendPlaybackSummaryEventIfNecessary(player,sendQoSEventUrl);
    sendPlaybackEndEvent(player,sendQoSEventUrl);
  }

  // Send playback start (PLAY) event
  function sendPlaybackStartEvent(player,eventUrl) {
      // (Yueshi to do) send out PLAY event, including startupLatencyMsOfThisSession, myJson.startup_latency_ms
      log("In sendPlaybackStartEvent :%j",player);
      var myJson = {};
      myJson.metric_type = "PLAY";

      myJson.user_id = userId;
      myJson.session_id = sessionId;

      myJson.client_platform = config.client_platform;
      myJson.is_live = isLive;
      myJson.channel_watched = channelWatched;

      myJson.start_playback_position_sec = Math.round(player.getPosition());
      myJson.startup_latency_ms = startupLatencyMsOfThisSession;

      if (eventUrl != "") {
        pushPayload(eventUrl,myJson);
      }

      log("send QoS event - Play ", JSON.stringify(myJson), " to ", eventUrl);
  }

  // Send playback end (STOP) event
  function sendPlaybackEndEvent(player,eventUrl) {
    var myJson = {};
    myJson.metric_type = "STOP";

    myJson.user_id = userId;
    myJson.session_id = sessionId;

    myJson.client_platform = config.client_platform;
    myJson.is_live = isLive;
    myJson.channel_watched = channelWatched;

    myJson.end_playback_position_sec = Math.round(player.getPosition());

    if (eventUrl != "") {
      pushPayload(eventUrl,myJson);
    }

    log("send QoS event - Stop ", JSON.stringify(myJson), " to ", eventUrl);
  }

  // Send playback QoS summary (PLAYBACK_SUMMARY) event
  function sendPlaybackSummaryEventIfNecessary(player,eventUrl) {
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
      myJson.is_live = isLive;
      myJson.channel_watched = channelWatched;

      myJson.error_count = errorCountInLastMinute;
      myJson.playing_time_ms = playingTimeMsInLastMinute;
      myJson.buffering_time_ms = bufferingTimeMsInLastMinute;
      myJson.buffering_count = bufferingCountInLastMinute;
      myJson.rendition_name = lastQuality.name;
      myJson.rendition_height = lastQuality.height;
      if (myJson.is_live) {
        myJson.live_latency_ms = Math.round(player.getLiveLatency()*1000);
      } else {
        myJson.live_latency_sec = -1;
      }

      if (eventUrl != "") {
        pushPayload(eventUrl,myJson);
      }

      log("send QoS event - PlaybackSummary ", JSON.stringify(myJson), " to ", eventUrl);
    }
  }

  // Send quality (i.e., rendition) change (QUALITY_CHANGE) event
  function sendQualityChangedEvent(eventUrl, lastQuality, newQuality) {
    var myJson = {};
    myJson.metric_type = "QUALITY_CHANGED";

    myJson.user_id = userId;
    myJson.session_id = sessionId;

    myJson.client_platform = config.client_platform;
    myJson.is_live = isLive;
    myJson.channel_watched = channelWatched;

    myJson.from_rendition_name = lastQuality.name;
    myJson.to_rendition_name = newQuality.name;
    myJson.from_bitrate = lastQuality.bitrate;
    myJson.to_bitrate = newQuality.bitrate;
    myJson.step_direction = (newQuality.bitrate > lastQuality.bitrate)? "UP":"DOWN";

    if (eventUrl != "") {
      pushPayload(eventUrl,myJson);
    }

    log("send QoS event - QualityChanged ", JSON.stringify(myJson), " to ", eventUrl);
  }

  // Check whether the video being played is live or VOD
  // For now it is hardcorded to return 'true' always
  // VOD to be supported in future
  function isLiveChannel(player){

    // return (player.getDuration() == Infinity);
    return true;
  }

  // Parse and get the Channel watched from the Playback URL
  function getChannelWatched(playbackUrl,live){
    if (live) {
      var myIndex1 = playbackUrl.indexOf("channel.") + 8;
      var myIndex2 = playbackUrl.indexOf(".m3u8");
      var channelName = playbackUrl.substring(myIndex1, myIndex2);
      log("playbackUrl ",playbackUrl);
      log("Channel name :",channelName);
      return channelName;
    } else {
      return playbackUrl;
    }
  }

  function pushPayload(endpoint, payload){
    let wrapPayload = {};
    wrapPayload.Records = [];
    let record = {
        Data: payload
    };
    wrapPayload.Records.push(record);
    log("Record :%j",wrapPayload);

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4 && this.status == 200) {
        log("Response status :"+this.status);
      }
    };
    xhttp.open("POST", endpoint, true);
    xhttp.setRequestHeader("Content-type", "application/json");
    xhttp.send(JSON.stringify(wrapPayload));
    //
    // $.ajax({
    //   url: endpoint,
    //   type: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   data: JSON.stringify(wrapPayload)
    // }).done(function(){
      //   console.log("Success ");
    // }).fail(function(){
    //   console.log("Error");
    // });
  }

  function log(msg){
    console.log("[QoS SDK]:%s",msg);
  }
  // === subroutines for sending QoS events and timed metadata events ===
