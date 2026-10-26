# Daily Bots

`daily-bots` is a Python application that runs a set of content bots and posts their messages to a Slack channel. A single scheduler in `main.py` owns the timetable and invokes bot methods; bot classes inherit from `BaseBot` and implement the content-specific work.

## Requirements

- Python 3.9 or newer
- A Slack bot token with permission to post messages to the configured channel
- Internet access to the external APIs used by the bots
- Optional: a Groq API key for AI-generated learning summaries

Dependencies are listed in `requirements.txt`.

## Setup

From this directory, create and activate a virtual environment, then install dependencies:

```sh
python -m venv .venv
```

On Windows:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

On macOS or Linux:

```sh
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Set credentials through environment variables. Do not put secrets in `config.json` or commit them to source control.

PowerShell:

```powershell
$env:SLACK_BOT_TOKEN = "your-slack-bot-token"
$env:SLACK_CHANNEL = "#daily-bots"
$env:GROQ_API_KEY = "your-groq-api-key" # Optional
python main.py
```

macOS or Linux:

```sh
export SLACK_BOT_TOKEN="your-slack-bot-token"
export SLACK_CHANNEL="#daily-bots"
export GROQ_API_KEY="your-groq-api-key" # Optional
python main.py
```

`SLACK_BOT_TOKEN` is required. `SLACK_CHANNEL` defaults to `#general`. If `GROQ_API_KEY` is not set, the learning bot uses a shortened Wikipedia extract instead of requesting a Groq summary.

## Configuration

The optional local `config.json` stores non-secret settings:

- `slack.channel`: Slack destination; overridden by `SLACK_CHANNEL`.
- `weather.lat`, `weather.lon`, and `weather.name`: location used in weather messages.
- `weather.interval`: retained as a setting; the current scheduler runs weather once per hour.

Credentials are read only from `SLACK_BOT_TOKEN` and `GROQ_API_KEY`; values in the JSON file cannot override those environment variables. The config file should never contain real API credentials.

The scheduler completion file defaults to `.daily-bot-state.json` next to `main.py`. Set `DAILY_BOT_STATE_FILE` to use another path. This file is generated at runtime and should not be committed.

## Schedule

Times use the machine's local timezone. The scheduler polls once per second and submits work to a bounded thread pool so that a slow network request does not block all schedule checks.

| Time | Bot action |
| --- | --- |
| At startup, then once per hour | Weather report (the startup run counts for the current hour) |
| 08:00 | Joke of the day and news |
| 10:00 | Learning topic |
| 11:00 | Historical event |
| 12:00 | Astronomy fact |
| 14:00 | Developer idea |
| 16:00 | Learning topic |
| 18:00 | NASA Astronomy Picture of the Day |
| 20:00 | News |

If the process starts late or was temporarily stopped, uncompleted scheduled actions earlier on the current day are submitted as catch-up work. A completion state file prevents successfully completed actions from being repeated after a restart. The state is written atomically.

## Bots and data sources

| Bot | Content | External source |
| --- | --- | --- |
| Weather | Forecast for the configured location | Open-Meteo |
| News | German national and business news | Tagesschau API |
| Joke | Daily joke, filtered by JokeAPI categories | JokeAPI |
| Developer | NPM package and GitHub repository suggestions | npm registry and GitHub API |
| Learning | Random topic, Wikipedia extract, optional AI summary | German Wikipedia and optionally Groq |
| Astronomy | Astronomy fact, with a fallback source | Bootprint and Facts API |
| History | Event that happened on today's date | Byabbe.se |
| NASA | Astronomy Picture of the Day | NASA APOD API using its public demo key |

Each bot is implemented in `bots/`; request functions and API-specific behavior live in `apis/`. `BaseBot` provides Slack message delivery.

## Reliability and operations

- HTTP API calls have request timeouts. Slack and Groq clients also have explicit timeouts.
- Jobs are submitted concurrently, with at most four worker threads.
- A job is recorded as completed after its bot method returns without raising an exception. API helpers may handle some API errors internally and return a fallback or no data; inspect the logs and bot output when diagnosing an API outage.
- Unhandled job errors are logged. The scheduler does not automatically retry a job during the same process after it has been submitted; an uncompleted job can be picked up after a restart.
- The completion state is local to one process host and does not coordinate concurrent instances; do not run multiple instances unless they are coordinated externally.
- Stop the process with Ctrl+C. On platforms that use the included `Procfile`, the worker command is `python main.py`.

## Logging and troubleshooting

The application logs scheduler activity and API or Slack errors to standard output/error. Common checks:

1. Confirm `SLACK_BOT_TOKEN` is set and valid.
2. Confirm the bot is a member of the configured Slack channel and can post there.
3. Check internet connectivity and the logs for the relevant API.
4. Check the system timezone if messages are running at unexpected times.
5. Inspect the configured state file if a previously completed job is not being sent again.

Never share logs that contain access tokens or other credentials.