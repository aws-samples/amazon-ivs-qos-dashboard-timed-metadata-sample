/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

export const config = {
  // an IVS live channel (or VOD title)'s playback URL, for example, the permanent test channel with quiz timed metadata
  //   https://fcc3ddae59ed.us-west-2.playback.live-video.net/api/video/v1/us-west-2.893648527354.channel.xhP3ExfcX8ON.m3u8
  "PlaybackURL": "PLAYBACK_URL",
  // end point for sending playback QoS (i.e., playback summary) events
  "SendQoSEventURL": "PLAYER_SUMMARY_ENDPOINT",
  // end point for sending timed metadata feedback (e.g., quiz answer) events
  "SendQuizAnswerURL":"ANSWER_SUMMARY_ENDPOINT",
  "client_platform": "web",
  "PlaybackURLs": "PLAYBACK_URLS",
};

// export const config = {
//   // an IVS live channel (or VOD title)'s playback URL, for example, the permanent test channel with quiz timed metadata
//   //   https://fcc3ddae59ed.us-west-2.playback.live-video.net/api/video/v1/us-west-2.893648527354.channel.xhP3ExfcX8ON.m3u8
//   "PlaybackURL": "PLAYBACK_URL",
//   // end point for sending playback QoS (i.e., playback summary) events
//   "SendQoSEventURL": "https://eczvtm7m82.execute-api.eu-west-1.amazonaws.com/prod/streams",
//   // end point for sending timed metadata feedback (e.g., quiz answer) events
//   "SendQuizAnswerURL":"https://eczvtm7m82.execute-api.eu-west-1.amazonaws.com/prod/streams",
//   "client_platform": "web",
//   "PlaybackURLs": "https://b1a2a57a7ffd.eu-west-1.playback.live-video.net/api/video/v1/eu-west-1.444603092185.channel.tbHb69cdvlbk.m3u8,https://fcc3ddae59ed.us-west-2.playback.live-video.net/api/video/v1/us-west-2.893648527354.channel.xhP3ExfcX8ON.m3u8",
// };
