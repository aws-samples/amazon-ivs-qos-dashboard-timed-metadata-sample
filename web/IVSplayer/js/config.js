export const config = {
  // an IVS live channel (or VOD title)'s playback URL, 893648527354.channel.xhP3ExfcX8ON.m3u8 is a permanent test channel with quiz timed metadata
  "PlaybackURL": "PLAYBACK_URL",
  // (ask Jai) end point for sending playback QoS (i.e., playback summary) events
  "SendQoSEventURL": "PLAYER_SUMMARY_ENDPOINT",
  // (ask Jai) end point for sending timed metadata feedback (e.g., quiz answer) events
  "SendQuizAnswerURL":"ANSWER_SUMMARY_ENDPOINT",
};
