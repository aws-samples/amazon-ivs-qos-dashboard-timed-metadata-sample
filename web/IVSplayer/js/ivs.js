// Note: Search the key word "QoS event" for the implementation of constructing
//   and sending QoS playback events. Also, search the key word "timed metadata
//   feedback event" for that of quiz answer events. Sample backend implementation
//   is documented at https://code.amazon.com/packages/StarfruitQoS

// URL for the player App to send QoS event or timed metadata feedback event
import {config} from "./config.js";
const sendQoSEventUrl = ""; // (to implement, will ask Jai)
const sendQuizAnswerUrl = "";
const playbackUrl = config.LiveURL;
const quizEl = $("#quiz");
const waitMessage = $("#waiting");
const questionEl = $("#question");
const answersEl = $("#answers");
const cardInnerEl = $(".card-inner");

(function (MediaPlayerPackage) {
  const PlayerState = MediaPlayerPackage.PlayerState;
  const PlayerEventType = MediaPlayerPackage.PlayerEventType;

  // Initialize player
  const player = MediaPlayerPackage.create();
  player.attachHTMLVideoElement(document.getElementById("video-player"));

  // Define and initialize QoS event work variables
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

  // Attach event (player state) listeners
  player.addEventListener(PlayerState.READY, function () {
    console.log("Player State - READY");

    // Update QoS event work variables
    lastRecordedPlayerState = "READY";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to ", lastRecordedPlayerStateTime);
  });
  player.addEventListener(PlayerState.BUFFERING, function () {
    console.log("Player State - BUFFERING");

    // Update QoS event work variables
    if (lastRecordedPlayerState == "PLAYING") {
      playingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
      console.log("Update playingTimeMsInLastMinute to", playingTimeMsInLastMinute);
    }

    lastRecordedPlayerState = "BUFFERING";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to", lastRecordedPlayerStateTime);
  });
  player.addEventListener(PlayerState.PLAYING, function () {
    console.log("Player State - PLAYING");

    // Update QoS event work variables
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
  });
  player.addEventListener(PlayerState.IDLE, function () {
    console.log("Player State - IDLE");

    // Update QoS event work variables
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
  });
  player.addEventListener(PlayerState.ENDED, function () {
    console.log("Player State - ENDED");

    // Update QoS event work variables
    if (lastRecordedPlayerState == "PLAYING") {
      playingTimeMsInLastMinute += (Date.now() - lastRecordedPlayerStateTime);
      console.log("Update playingTimeMsInLastMinute to", playingTimeMsInLastMinute);
    }

    lastRecordedPlayerState = "END";
    lastRecordedPlayerStateTime = Date.now();
    console.log("Set lastRecordedPlayerStateTime to", lastRecordedPlayerStateTime);
  });

  // Attach event (error) listeners
  player.addEventListener(PlayerEventType.ERROR, function (err) {
    console.warn("Player Event - ERROR:", err);

    // Update QoS event work variables
    errorCountInLastMinute++;
    console.log("Update errorCountInLastMinute to", errorCountInLastMinute);
  });

  // Attach event (timed metadata) listeners
  player.addEventListener(PlayerEventType.METADATA, (metadata) => {
    if (metadata.type === "text/plain") {
      const metadataText = metadata.data;
      const position = player.getPosition().toFixed(2);
      console.log(
        `PlayerEvent - METADATA: "${metadataText}". Observed ${position}s after playback started.`
      );
      quizEl.removeClass("drop").show();
      waitMessage.hide();
      triggerQuiz(metadataText);
    }
  });

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

  // Maintain low latency during network glitches
  player.setRebufferToLive(true);

  // Setup stream and play
  player.setAutoplay(true);
  player.load(playbackUrl);

  // Set volume
  player.setVolume(0.08);

  // Display the wait message window
  quizEl.hide();
  waitMessage.show();

  // Send off a QoS event every minute
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
        sendQoSEvent(config.sendQoSEventUrl);
      }

      // Reset work variables
      currentEventBeginTime = lastRecordedPlayerStateTime = Date.now();
      hasReportedStartupMsOfThisChannel = true;
      playingTimeMsInLastMinute = 0;
      bufferingTimeMsInLastMinute = 0;
      errorCountInLastMinute = 0;
    }
  }, 1000);

  // Remove card
  function removeCard() {
    quizEl.addClass("drop");
  }

  // Trigger quiz
  function triggerQuiz(metadataText) {
    let obj = JSON.parse(metadataText);
    cardInnerEl.fadeOut("fast");
    answersEl.empty();
    questionEl.text(obj.question);
    for (var i = 0; i < obj.answers.length; i++) {
      answersEl.append($('<a href="#" class="answer">' + obj.answers[i] + '</a>'));
    }
    cardInnerEl.fadeIn("fast");
    $(".answer").click(function () {
      if (this.text === obj.answers[obj.correctIndex]) {
        $(this).addClass("correct");
      } else {
        $(this).addClass("wrong");
      }

      // send off a timed metadata feedback event
      sendQuizAnswer(config.sendQuizAnswerUrl, obj.question, this.text);

      setTimeout(function () {
        removeCard();
        waitMessage.show();
      }, 1050);
      return false;
    });
  }

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
      // (to implement, will ask Jai)
    }

    console.log("sendQoSEvent ", JSON.stringify(myJson), "to", url);
  }

  function pushPayload(endpoint, payload){
      let wrapPayload = {};
      wrapPayload.DeliveryStreamName = config.DeliveryStreamName;
      wrapPayload.Records = [];
      let record = {
          Data: JSON.stringify(payload) + "\n"
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
  // Send timed metadata feedback event
  function sendQuizAnswer(url, question, answer) {
    var myJson = {};
    myJson.metric_type = "QUIZ_ANSWER";
    myJson.question = question;
    myJson.answer = answer;

    if (url != "") {
      // (to implement, will ask Jai)
      pushPayload(url,myJson);
    }

    console.log("sendQuizAnswer ", JSON.stringify(myJson), "to", url);
  }
})(window.MediaPlayer);
