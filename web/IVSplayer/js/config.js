export const config = {
  // an IVS live channel (or VOD title)'s playback URL, for example, the permanent test channel with quiz timed metadata
  //   https://fcc3ddae59ed.us-west-2.playback.live-video.net/api/video/v1/us-west-2.893648527354.channel.xhP3ExfcX8ON.m3u8
  "PlaybackURL": "PLAYBACK_URL",
  // end point for sending playback QoS (i.e., playback summary) events
  "SendQoSEventURL": "PLAYER_SUMMARY_ENDPOINT",
  // end point for sending timed metadata feedback (e.g., quiz answer) events
  "SendQuizAnswerURL":"ANSWER_SUMMARY_ENDPOINT",
};
