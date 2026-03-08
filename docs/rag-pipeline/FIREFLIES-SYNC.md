# FIREFLIES SYNC

## Schema

### Summary

AI generated summary of the meeting.

| Name                 | Type     | Description                                     |
| -------------------- | -------- | ------------------------------------------------|
| action_items         | string   | A list of action items |
| keywords             | string   | A list of keywords  |
| outline              | string   | An outline of the meeting with timestamps |
| overview             | string   | A summary of the meeting |
| shorthand_bullet     | string   | A list of shorthand bullets |
| notes                | string   |  |
| gist                 | string   |  |
| bullet_gist          | string   |  |
| short_summary        | string   |  |
| short_overview       | string   |  |
| notes                | string   | Detailed meeting notes   |
| gist                 | string   | A summary of the meeting in 1 sentence |
| bullet_gist          | string   | Summary of the meeting in a few bullet points with descriptive emojis |

| short_summary | string   | Summary of the meeting in a single paragraph
short_overview | string   | Brief overview of the meeting
meeting_type | string   | Meeting classification
topics_discussed | string   | List of topics discussed during the meeting.
transcript_chapters. Chapters of the short transcript. The short transcript is an LLM-condensed transcript that may be helpful for downstream applications
​
extended_sections
[SummarySection]
Optional sections of the summary included by customizing the summary from the dashboard

> ## Documentation Index
>
> Fetch the complete documentation index at: <https://docs.fireflies.ai/llms.txt>
> Use this file to discover all available pages before exploring further.

# Transcript

> Schema for Transcript

<ResponseField name="id" type="ID">
  Unique identifier of the Transcript.
</ResponseField>

<ResponseField name="title" type="String">
  Title of the Transcript.
</ResponseField>

<ResponseField name="host_email" type="String">
  [DEPRECATED](/additional-info/deprecated) <br />
  Email address of the meeting host.
</ResponseField>

<ResponseField name="organizer_email" type="String">
  Email address of the meeting organizer.
</ResponseField>

<ResponseField name="user" type="User">
  The [User](/schema/user) who Fred recorded the meeting on behalf of
</ResponseField>

<ResponseField name="speakers" type="[Speaker]">
  The speakers array contains the id and name of the speaker as it appears within the transcript
</ResponseField>

<ResponseField name="transcript_url" type="String">
  The url to view the transcript in the dashboard
</ResponseField>

<ResponseField name="participants" type="[String]">
  An array of email addresses of meeting participants guests, including participants that do not
  have Fireflies account.
</ResponseField>

<ResponseField name="meeting_attendees" type="[MeetingAttendee]">
  List of [MeetingAttendee](/schema/meeting-attendee)
</ResponseField>

<ResponseField name="meeting_attendance" type="[MeetingAttendance]">
  List of [MeetingAttendance](/schema/meeting-attendance) records showing when participants joined and left the meeting
</ResponseField>

<ResponseField name="fireflies_users" type="[String]">
  An array of email addresses of only Fireflies users participants that have fireflies account that
  participated in the meeting
</ResponseField>

<ResponseField name="workspace_users" type="[String]">
  An array of email addresses of Fireflies users who participated in the meeting and are also members of the requesting user's team/workspace. This is a subset of `fireflies_users` filtered to only include teammates.
</ResponseField>

<ResponseField name="duration" type="Number">
  Duration of the audio in minutes
</ResponseField>

<ResponseField name="dateString" type="DateTime">
  String representation of DateTime. Example: `2024-04-22T20:14:04.454Z`
</ResponseField>

<ResponseField name="date" type="Float">
  Date the transcript was created represented in milliseconds from
  [EPOCH](https://en.wikipedia.org/wiki/Epoch_\(computing\)).

  The timezone for this field is UTC +00:00
</ResponseField>

<ResponseField name="audio_url" type="String">
  Secure, newly generated hashed url that allows you download meeting audio. This url expires after
  every 24 hours. You'd have to make another request to generate a new audio\_url.

  You need to be subscribed to subscribed to a pro or higher plan to query audio\_url. View plans [here](https://fireflies.ai/pricing)
</ResponseField>

<ResponseField name="video_url" type="String">
  Secure, newly generated hashed url that allows you download meeting video. This url expires after
  every 24 hours. You'd have to make another request to generate a new video\_url. You will need to
  enable `RECORD MEETING VIDEO` setting on your Fireflies
  [dashboard](https://app.fireflies.ai/settings) for this to work.

  You need to be subscribed to a business or higher plan to query video\_url. View plans [here](https://fireflies.ai/pricing)
</ResponseField>

<ResponseField name="sentence" type="[Sentence]">
  An array of [Sentence](/schema/sentence)(s), containing transcript details like `raw_text`,
  `speaker_name`, etc.
</ResponseField>

<ResponseField name="calendar_id" type="String">
  Calendar provider event ID. This field represents calId for google calendar and iCalUID for
  outlook calendar.
</ResponseField>

<ResponseField name="summary" type="Summary">
  AI generated [Summary](/schema/summary) of the meeting.
</ResponseField>

<ResponseField name="meeting_info" type="MeetingInfo">
  [MeetingInfo](/schema/meeting-info) metadata fields.
</ResponseField>

<ResponseField name="cal_id" type="String">
  Calendar provider event ID with a timestamp that helps uniquely identify recurring events
</ResponseField>

<ResponseField name="calendar_type" type="String">
  Calendar provider name
</ResponseField>

<ResponseField name="apps" type="Apps">
  Preview of [Apps](/schema/apps) generated from the transcript. Max limit of 5 most recent AI App Outputs per meeting. Use the [Apps Query](/graphql-api/query/apps) to fetch the entire list of AI App Outputs
</ResponseField>

<ResponseField name="meeting_link" type="String">
  The web conferencing url of the meeting. This field is only populated if the meeting was hosted on a supported platform such as Google Meet, Zoom, etc.
</ResponseField>

<ResponseField name="analytics" type="MeetingAnalytics">
  [MeetingAnalytics](/schema/meeting-analytics) contains analytics data about the meeting, including:

* `sentiments`: Sentiment analysis showing percentages of positive, neutral, and negative sentiments
* `categories`: Counts of different types of content (questions, date/times, metrics, tasks)
* `speakers`: Detailed analytics for each speaker including duration, word count, filler words, etc.

  You need to be subscribed to subscribed to a pro or higher plan to query meeting analytics. View plans [here](https://fireflies.ai/pricing)
</ResponseField>

<ResponseField name="channels" type="[Channel]">
  An array of [Channel](/schema/channel) the meeting belongs to
</ResponseField>

<ResponseField name="shared_with" type="[SharedWith]">
  An array of [SharedWith](/schema/shared-with) representing users the meeting has been shared with externally. Use the [shareMeeting](/graphql-api/mutation/share-meeting) mutation to share and [revokeSharedMeetingAccess](/graphql-api/mutation/revoke-shared-meeting-access) to revoke access.
</ResponseField>

<ResponseField name="is_live" type="Boolean">
  Indicates whether the meeting is currently live. Returns `true` when the meeting is in an `active` or `paused` state, and `false` otherwise.

  When `is_live` is `true`, the `sentences` field returns real-time captions from the ongoing meeting. When `false`, `sentences` returns the processed transcript data.
</ResponseField>